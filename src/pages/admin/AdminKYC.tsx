import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { notify } from '@/services/api';
import { CheckCircle, XCircle, Eye, Filter, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { KycDocument } from '@/types';

interface KycWithProfile extends KycDocument {
  profile: { first_name: string | null; last_name: string | null; username: string | null; email: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-400/10 text-yellow-400',
  approved: 'bg-green-400/10 text-green-600',
  rejected: 'bg-red-400/10 text-red-500',
};

export default function AdminKYC() {
  const [docs, setDocs] = useState<KycWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selected, setSelected] = useState<KycWithProfile | null>(null);
  const [notes, setNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<{ front: string | null; back: string | null }>({ front: null, back: null });

  // The kyc_documents bucket is private — stored values are storage paths,
  // so they must be exchanged for signed URLs before rendering.
  const openDoc = async (doc: KycWithProfile) => {
    setSelected(doc);
    setNotes(doc.notes || '');
    setSignedUrls({ front: null, back: null });
    const sign = async (path: string | null) => {
      if (!path) return null;
      if (/^https?:\/\//.test(path)) return path;
      const { data } = await supabase.storage.from('kyc_documents').createSignedUrl(path, 3600);
      return data?.signedUrl || null;
    };
    const [front, back] = await Promise.all([sign(doc.front_url), sign(doc.back_url)]);
    setSignedUrls({ front, back });
  };

  const loadDocs = useCallback(async () => {
    let query = supabase
      .from('kyc_documents')
      .select('*')
      .order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);

    const { data: kycDocs, error } = await query;
    if (error) {
      toast.error(`Failed to load KYC submissions: ${error.message}`);
      setLoading(false);
      return;
    }
    if (!kycDocs) { setLoading(false); return; }

    const enriched = await Promise.all(
      kycDocs.map(async (doc) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, username, email')
          .eq('id', doc.user_id)
          .maybeSingle();
        return { ...doc, profile: profile || null };
      })
    );
    setDocs(enriched);
    setLoading(false);
  }, [filter]);

  useEffect(() => { setLoading(true); loadDocs(); }, [loadDocs]);

  const updateKyc = async (doc: KycWithProfile, status: 'approved' | 'rejected') => {
    setActionLoading(true);
    const { error } = await supabase
      .from('kyc_documents')
      .update({ status, notes, updated_at: new Date().toISOString() })
      .eq('id', doc.id);

    if (error) { toast.error(`Failed to update KYC: ${error.message}`); setActionLoading(false); return; }

    notify(doc.user_id, {
      title: status === 'approved' ? 'KYC approved' : 'KYC rejected',
      body: status === 'approved'
        ? 'Your identity verification has been approved. Your account is now fully verified.'
        : `Your identity verification was rejected.${notes ? ` Reason: ${notes}` : ''} Please resubmit your documents.`,
      type: status === 'approved' ? 'success' : 'warning',
    });

    // Send KYC email if user has email
    const email = doc.profile?.email;
    if (email) {
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'kyc_update',
            to: email,
            user_id: doc.user_id,
            data: {
              first_name: doc.profile?.first_name || doc.profile?.username,
              status,
              notes,
            },
          },
        });
      } catch {
        // Email failure is non-blocking
        console.warn('KYC email notification failed');
      }
    }

    toast.success(`KYC ${status} and user notified`);
    setSelected(null);
    setNotes('');
    await loadDocs();
    setActionLoading(false);
  };

  const counts = docs.length;
  const pending = docs.filter((d) => d.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">KYC Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {pending} pending review{pending !== 1 ? 's' : ''} · {counts} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'ghost'}
              className={filter === f ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground text-xs'}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3">Applicant</th>
                <th className="text-left px-6 py-3">ID Type</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Submitted</th>
                <th className="text-left px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 5 }).map((__, j) => <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>)}
                  </tr>
                ))
                : docs.length === 0
                  ? <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No KYC documents found</td></tr>
                  : docs.map((doc) => (
                    <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm text-foreground">
                          {doc.profile?.first_name} {doc.profile?.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">@{doc.profile?.username || '—'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{doc.id_card_type || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[doc.status] || ''}`}>
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="border border-border text-xs h-8 px-3"
                          onClick={() => openDoc(doc)}
                        >
                          <Eye className="w-3 h-3 mr-1" /> Review
                        </Button>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setNotes(''); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>KYC Review — {selected?.profile?.first_name} {selected?.profile?.last_name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-5 mt-2">
              {/* User info */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Username</div>
                  <div className="font-medium text-foreground">@{selected.profile?.username}</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Email</div>
                  <div className="font-medium text-foreground truncate">{selected.profile?.email || '—'}</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">ID Type</div>
                  <div className="font-medium text-foreground">{selected.id_card_type}</div>
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <div className="text-xs text-muted-foreground mb-1">Current Status</div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[selected.status] || ''}`}>{selected.status}</span>
                </div>
              </div>

              {/* Document images */}
              <div className="grid grid-cols-2 gap-3">
                {([['Front', 'front'], ['Back', 'back']] as const).map(([side, key]) => {
                  const url = signedUrls[key];
                  const hasDoc = key === 'front' ? !!selected.front_url : !!selected.back_url;
                  return (
                    <div key={side}>
                      <div className="text-xs font-semibold text-muted-foreground mb-2">ID {side}</div>
                      {url ? (
                        <div className="relative aspect-[3/2] rounded-xl overflow-hidden bg-muted border border-border group">
                          <img src={url} alt={`ID ${side}`} className="w-full h-full object-cover" />
                          <a href={url} target="_blank" rel="noopener noreferrer"
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink className="w-6 h-6 text-white" />
                          </a>
                        </div>
                      ) : (
                        <div className="aspect-[3/2] rounded-xl bg-muted border border-dashed border-border flex items-center justify-center text-muted-foreground text-xs">
                          {hasDoc ? 'Loading…' : 'No document'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Admin notes */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">Admin Notes (optional)</label>
                <Textarea
                  placeholder="e.g. Documents are clear. / Please resubmit — ID is blurry."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-secondary border-border resize-none"
                  rows={3}
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={actionLoading}
                  onClick={() => updateKyc(selected, 'approved')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {actionLoading ? 'Processing…' : 'Approve'}
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 border border-destructive text-destructive hover:bg-destructive/10"
                  disabled={actionLoading}
                  onClick={() => updateKyc(selected, 'rejected')}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
