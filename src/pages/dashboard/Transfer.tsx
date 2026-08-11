import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccounts, transferFunds } from '@/services/api';
import { supabase } from '@/db/supabase';
import type { BankAccount } from '@/types';
import { toast } from 'sonner';

export default function TransferPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const [fromId, setFromId] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserAccounts(user.id).then((data) => {
      setAccounts(data);
      if (data[0]) setFromId(data[0].id);
    }).finally(() => setLoading(false));
  }, [user]);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const amountNum = parseFloat(amount) || 0;
  const isValid = fromId && toAccount.trim() && amountNum > 0 && fromAccount && amountNum <= fromAccount.balance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    if (!confirmed) { setConfirmed(true); return; }
    setSubmitting(true);
    try {
      await transferFunds({ fromAccountId: fromId, toAccountNumber: toAccount.trim(), amount: amountNum, description: description || 'Fund Transfer' });
      toast.success(`$${amountNum.toFixed(2)} transferred successfully!`);

      // Send transfer confirmation email (non-blocking)
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('email, first_name, username').eq('id', user.id).maybeSingle();
        const updatedAccount = (await getUserAccounts(user.id)).find((a) => a.id === fromId);
        if (profile?.email) {
          supabase.functions.invoke('send-email', {
            body: {
              type: 'transfer',
              to: profile.email,
              user_id: user.id,
              data: {
                first_name: profile.first_name || profile.username || 'User',
                amount: amountNum,
                currency: fromAccount?.currency || 'USD',
                recipient_account: toAccount.trim(),
                description: description || 'Fund Transfer',
                new_balance: updatedAccount?.balance,
              },
            },
          }).catch(() => null);
        }
      }

      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Transfer failed');
    } finally {
      setSubmitting(false); setConfirmed(false);
    }
  };

  if (loading) return <div className="space-y-4 max-w-xl"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Fund Transfer</h1>
        <p className="text-muted-foreground text-sm mt-1">Transfer funds securely to any account worldwide</p>
      </div>

      {accounts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-dashed border-border">
          <h3 className="font-semibold text-foreground mb-2">No Accounts Available</h3>
          <p className="text-muted-foreground text-sm">You need at least one account to make transfers.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 border border-border space-y-6">
          {/* From */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">From Account</label>
            <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-muted border border-border text-foreground text-sm">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_number} — {a.currency} {a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({a.account_type})
                </option>
              ))}
            </select>
            {fromAccount && (
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Info className="w-3 h-3" />
                Available: {fromAccount.currency} {fromAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>

          {/* To */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recipient Account Number</label>
            <Input placeholder="e.g. BZC0012345678" value={toAccount} onChange={(e) => setToAccount(e.target.value)} className="bg-white border-border shadow-sm h-12" required />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
              <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-white border-border shadow-sm h-12 pl-8 text-lg font-semibold" required />
            </div>
            {amountNum > 0 && fromAccount && amountNum > fromAccount.balance && (
              <p className="text-xs text-destructive mt-1">Insufficient funds</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description (Optional)</label>
            <Input placeholder="e.g. Monthly rent, Invoice #123" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white border-border shadow-sm h-12" />
          </div>

          {/* Confirm summary */}
          {confirmed && (
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-sm space-y-2">
              <div className="font-semibold text-primary">Confirm Transfer</div>
              <div className="text-muted-foreground">Sending <span className="text-foreground font-semibold">${amountNum.toFixed(2)}</span> to <span className="text-foreground font-semibold">{toAccount}</span></div>
              <div className="text-muted-foreground text-xs">This action cannot be undone.</div>
            </div>
          )}

          <Button type="submit" disabled={!isValid || submitting} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base">
            <ArrowUpRight className="w-4 h-4 mr-2" />
            {submitting ? 'Processing...' : confirmed ? 'Confirm & Send' : 'Review Transfer'}
          </Button>
          {confirmed && (
            <Button type="button" variant="ghost" onClick={() => setConfirmed(false)} className="w-full border border-border text-muted-foreground">
              Cancel
            </Button>
          )}
        </form>
      )}
    </div>
  );
}
