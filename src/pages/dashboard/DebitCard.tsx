import { useEffect, useState } from 'react';
import { CreditCard, Plus, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccounts, getUserCardRequests, requestDebitCard } from '@/services/api';
import type { BankAccount, CardRequest } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const NETWORKS = ['Visa', 'Mastercard'];

export default function DebitCardPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [requests, setRequests] = useState<CardRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accountId, setAccountId] = useState('');
  const [network, setNetwork] = useState('Visa');
  const [address, setAddress] = useState('');

  const load = async (uid: string) => {
    const [accs, reqs] = await Promise.all([getUserAccounts(uid), getUserCardRequests(uid)]);
    setAccounts(accs);
    setRequests(reqs);
    if (accs[0]) setAccountId(accs[0].id);
  };

  useEffect(() => {
    if (!user) return;
    load(user.id).catch(() => toast.error('Failed to load card data')).finally(() => setLoading(false));
  }, [user]);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !accountId) { toast.error('Select an account'); return; }
    setSubmitting(true);
    try {
      await requestDebitCard({ user_id: user.id, account_id: accountId, card_network: network, delivery_address: address.trim() || undefined });
      await load(user.id);
      toast.success('Debit card request submitted! Our team will process it shortly.');
      setAddress('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to request card');
    } finally {
      setSubmitting(false);
    }
  };

  const STATUS_META: Record<string, { icon: typeof CheckCircle2; color: string; bg: string }> = {
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    completed: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-500/10' },
    failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    cancelled: { icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted' },
  };

  if (loading) return <div className="space-y-4 max-w-2xl"><Skeleton className="h-12" /><Skeleton className="h-64 rounded-2xl" /></div>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Debit Card</h1>
        <p className="text-muted-foreground text-sm mt-1">Request a debit card linked to your account</p>
      </div>

      {accounts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-dashed border-border">
          <h3 className="font-semibold text-foreground mb-2">No Accounts Available</h3>
          <p className="text-muted-foreground text-sm">You need at least one account to order a debit card.</p>
        </div>
      ) : (
        <>
          {/* Order form */}
          <form onSubmit={handleRequest} className="glass-card rounded-2xl p-8 border border-border space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-semibold text-foreground">Order a new debit card</div>
                <div className="text-xs text-muted-foreground">Free virtual + physical card on request</div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Linked Account</label>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-muted border border-border text-foreground text-sm">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_number} — {a.currency} {a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({a.account_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Card Network</label>
              <div className="flex gap-2">
                {NETWORKS.map((n) => (
                  <button type="button" key={n} onClick={() => setNetwork(n)} className={cn('flex-1 h-11 rounded-xl border text-sm font-semibold transition-colors', network === n ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Delivery Address (Optional)</label>
              <Input placeholder="e.g. 12 High Street, London, SW1A 1AA" value={address} onChange={(e) => setAddress(e.target.value)} className="bg-white border-border shadow-sm h-12" />
            </div>

            <Button type="submit" disabled={submitting} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              {submitting ? 'Submitting...' : 'Request Debit Card'}
            </Button>
          </form>

          {/* Existing requests */}
          {requests.length > 0 && (
            <div className="glass-card rounded-2xl border border-border">
              <div className="p-6 border-b border-border">
                <h3 className="font-bold text-foreground">Your Card Requests</h3>
              </div>
              <div className="divide-y divide-border">
                {requests.map((r) => {
                  const meta = STATUS_META[r.status] || STATUS_META.pending;
                  const Icon = meta.icon;
                  return (
                    <div key={r.id} className="flex items-center gap-4 p-4">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', meta.bg)}>
                        <Icon className={cn('w-5 h-5', meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm">{r.card_network} {r.card_type} card</div>
                        <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                        {r.notes && <div className="text-xs text-muted-foreground mt-1 truncate">Note: {r.notes}</div>}
                      </div>
                      <Badge className={cn('text-xs border-0 capitalize', meta.bg, meta.color)}>{r.status}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
