import { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox, Send, MailOpen, Mail, PenSquare, ArrowLeft, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getInbox, getSentMessages, markMessageRead, sendMailMessage } from '@/services/api';
import type { MailMessage } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface MailTarget {
  id: string;
  label: string;
  sublabel?: string;
}

interface MailboxProps {
  selfId: string;
  /** Resolve profile IDs to display names for message list rows */
  resolveNames: (ids: string[]) => Promise<Record<string, string>>;
  /** Load the list of possible recipients for the composer */
  loadTargets: () => Promise<MailTarget[]>;
  /** If set, the composer sends to ALL loaded targets and shows this fixed label instead of a picker */
  fixedTargetLabel?: string;
  /** Admin only: offer a "broadcast to every user" option */
  allowBroadcast?: boolean;
  /** Preselect a recipient (e.g. from /admin/messages?to=<userId>) */
  initialRecipientId?: string;
}

type Tab = 'inbox' | 'sent' | 'compose';

export default function Mailbox({ selfId, resolveNames, loadTargets, fixedTargetLabel, allowBroadcast, initialRecipientId }: MailboxProps) {
  const [tab, setTab] = useState<Tab>('inbox');
  const [inbox, setInbox] = useState<MailMessage[]>([]);
  const [sent, setSent] = useState<MailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const [openMsg, setOpenMsg] = useState<MailMessage | null>(null);

  // Composer state
  const [targets, setTargets] = useState<MailTarget[]>([]);
  const [recipientId, setRecipientId] = useState(initialRecipientId || '');
  const [broadcast, setBroadcast] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [inb, snt] = await Promise.all([getInbox(selfId), getSentMessages(selfId)]);
    setInbox(inb);
    setSent(snt);
    const ids = [...new Set([...inb, ...snt].flatMap((m) => [m.sender_id, m.recipient_id]))].filter((id) => id !== selfId);
    if (ids.length > 0) setNames(await resolveNames(ids));
    setLoading(false);
  }, [selfId, resolveNames]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    loadTargets().then(setTargets).catch(() => setTargets([]));
  }, [loadTargets]);

  const nameOf = useCallback(
    (id: string) => (id === selfId ? 'You' : names[id] || 'Unknown user'),
    [selfId, names]
  );

  const unreadCount = useMemo(() => inbox.filter((m) => !m.is_read).length, [inbox]);

  const openMessage = async (m: MailMessage, isInbox: boolean) => {
    setOpenMsg(m);
    if (isInbox && !m.is_read) {
      await markMessageRead(m.id);
      setInbox((prev) => prev.map((x) => (x.id === m.id ? { ...x, is_read: true } : x)));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) { toast.error('Subject and message are required'); return; }

    let recipients: MailTarget[] = [];
    if (fixedTargetLabel || broadcast) {
      recipients = targets;
    } else {
      const t = targets.find((x) => x.id === recipientId);
      if (!t) { toast.error('Choose a recipient'); return; }
      recipients = [t];
    }
    if (recipients.length === 0) { toast.error('No recipients available'); return; }

    setSending(true);
    try {
      const results = await Promise.allSettled(
        recipients.map((r) => sendMailMessage({ senderId: selfId, recipientId: r.id, subject: subject.trim(), body: body.trim() }))
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0 && failed.length === results.length) {
        const reason = (results[0] as PromiseRejectedResult).reason;
        throw reason instanceof Error ? reason : new Error('Failed to send message');
      }
      toast.success(failed.length > 0
        ? `Message sent to ${results.length - failed.length} of ${results.length} recipients`
        : `Message sent to ${recipients.length === 1 ? recipients[0].label : `${recipients.length} recipients`}`);
      setSubject(''); setBody(''); setRecipientId(''); setBroadcast(false);
      await load();
      setTab('sent');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const msgRow = (m: MailMessage, isInbox: boolean) => (
    <button
      key={m.id}
      onClick={() => openMessage(m, isInbox)}
      className={cn(
        'w-full text-left px-5 py-4 flex items-start gap-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors',
        isInbox && !m.is_read && 'bg-primary/5'
      )}
    >
      <div className="mt-0.5 shrink-0">
        {isInbox
          ? (m.is_read ? <MailOpen className="w-4 h-4 text-muted-foreground" /> : <Mail className="w-4 h-4 text-primary" />)
          : <Send className="w-4 h-4 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className={cn('text-sm truncate', isInbox && !m.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground')}>
            {isInbox ? nameOf(m.sender_id) : `To: ${nameOf(m.recipient_id)}`}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">
            {new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className={cn('text-sm truncate', isInbox && !m.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{m.subject}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{m.body}</div>
      </div>
    </button>
  );

  // Reading pane
  if (openMsg) {
    const isInbox = openMsg.recipient_id === selfId;
    return (
      <div className="glass-card rounded-2xl border border-border p-6 space-y-4">
        <button onClick={() => setOpenMsg(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to {isInbox ? 'inbox' : 'sent'}
        </button>
        <div className="border-b border-border pb-4">
          <h2 className="text-lg font-bold text-foreground">{openMsg.subject}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isInbox ? `From: ${nameOf(openMsg.sender_id)}` : `To: ${nameOf(openMsg.recipient_id)}`} · {new Date(openMsg.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{openMsg.body}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-muted border border-border w-full">
        {([
          { key: 'inbox', label: `Inbox${unreadCount > 0 ? ` (${unreadCount})` : ''}`, icon: Inbox },
          { key: 'sent', label: 'Sent', icon: Send },
          { key: 'compose', label: 'Compose', icon: PenSquare },
        ] as { key: Tab; label: string; icon: typeof Inbox }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn('flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold transition-colors', tab === key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab !== 'compose' && (
        <div className="glass-card rounded-2xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
          ) : (tab === 'inbox' ? inbox : sent).length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{tab === 'inbox' ? 'No messages yet. Messages from the bank will appear here.' : 'You have not sent any messages yet.'}</p>
            </div>
          ) : (
            <div>{(tab === 'inbox' ? inbox : sent).map((m) => msgRow(m, tab === 'inbox'))}</div>
          )}
        </div>
      )}

      {tab === 'compose' && (
        <form onSubmit={handleSend} className="glass-card rounded-2xl border border-border p-6 space-y-5">
          {fixedTargetLabel ? (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">To</label>
              <div className="h-12 px-4 rounded-xl bg-muted border border-border flex items-center text-sm text-foreground font-medium">{fixedTargetLabel}</div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recipient</label>
              {allowBroadcast && (
                <label className="flex items-center gap-2 mb-3 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} className="w-4 h-4 accent-primary" />
                  <Users className="w-4 h-4 text-primary" />
                  Broadcast to all users ({targets.length})
                </label>
              )}
              {!broadcast && (
                <select value={recipientId} onChange={(e) => setRecipientId(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-muted border border-border text-foreground text-sm" required>
                  <option value="">Select a recipient…</option>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}{t.sublabel ? ` — ${t.sublabel}` : ''}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Subject</label>
            <Input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="bg-white border-border shadow-sm h-12" required maxLength={140} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Message</label>
            <textarea
              placeholder="Write your message…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={6}
              className="w-full rounded-xl bg-white border border-border shadow-sm px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-y"
            />
          </div>
          <Button type="submit" disabled={sending} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90">
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            {sending ? 'Sending…' : 'Send Message'}
          </Button>
        </form>
      )}
    </div>
  );
}
