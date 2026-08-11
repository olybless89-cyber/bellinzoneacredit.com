import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccounts, depositFunds, withdrawFunds } from '@/services/api';
import type { BankAccount } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'deposit' | 'withdraw';

export default function MoneyPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('deposit');
  const [fromId, setFromId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    getUserAccounts(user.id).then((data) => {
      setAccounts(data);
      if (data[0]) setFromId(data[0].id);
    }).finally(() => setLoading(false));
  }, [user]);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const amountNum = parseFloat(amount) || 0;
  const validDeposit = fromId && amountNum > 0;
  const validWithdraw = fromId && amountNum > 0 && fromAccount && amountNum <= fromAccount.balance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      if (tab === 'deposit') {
        if (!validDeposit) { toast.error('Enter a valid amount'); setSubmitting(false); return; }
        await depositFunds({ accountId: fromId, amount: amountNum, description: description || 'Deposit' });
        toast.success(`$${amountNum.toFixed(2)} deposited successfully!`);
      } else {
        if (!validWithdraw) {
          if (amountNum > 0 && fromAccount && amountNum > fromAccount.balance) toast.error('Insufficient funds');
          else toast.error('Enter a valid amount');
          setSubmitting(false);
          return;
        }
        await withdrawFunds({
          accountId: fromId,
          amount: amountNum,
          description: description || 'Withdrawal',
          recipient_account: recipient.trim() || undefined,
        });
        toast.success(`$${amountNum.toFixed(2)} withdrawn successfully!`);
      }
      setAccounts(await getUserAccounts(user.id));
      setAmount(''); setDescription(''); setRecipient('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="space-y-4 max-w-xl"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Deposit & Withdraw</h1>
        <p className="text-muted-foreground text-sm mt-1">Add funds to or withdraw funds from your account</p>
      </div>

      {accounts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-dashed border-border">
          <h3 className="font-semibold text-foreground mb-2">No Accounts Available</h3>
          <p className="text-muted-foreground text-sm">You need at least one account to deposit or withdraw.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex gap-2 p-1 rounded-xl bg-muted border border-border w-full">
            {(['deposit', 'withdraw'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn('flex-1 flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold capitalize transition-colors', tab === t ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
              >
                {t === 'deposit' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                {t}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-8 border border-border space-y-6">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</label>
              <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-muted border border-border text-foreground text-sm">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.account_number} — {a.currency} {a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({a.account_type})
                  </option>
                ))}
              </select>
              {fromAccount && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  Available: {fromAccount.currency} {fromAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-white border-border shadow-sm h-12 pl-8 text-lg font-semibold" required />
              </div>
              {tab === 'withdraw' && amountNum > 0 && fromAccount && amountNum > fromAccount.balance && (
                <p className="text-xs text-destructive mt-1">Insufficient funds</p>
              )}
            </div>

            {tab === 'withdraw' && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Destination (Optional)</label>
                <Input placeholder="e.g. External bank / ATM / BZC0012345678" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="bg-white border-border shadow-sm h-12" />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description (Optional)</label>
              <Input placeholder={tab === 'deposit' ? 'e.g. Salary, Cash deposit' : 'e.g. ATM withdrawal, Bill payment'} value={description} onChange={(e) => setDescription(e.target.value)} className="bg-white border-border shadow-sm h-12" />
            </div>

            <Button
              type="submit"
              disabled={submitting || (tab === 'deposit' ? !validDeposit : !validWithdraw)}
              className={cn('w-full h-12 text-base', tab === 'deposit' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90')}
            >
              {tab === 'deposit' ? <ArrowDownLeft className="w-4 h-4 mr-2" /> : <ArrowUpRight className="w-4 h-4 mr-2" />}
              {submitting ? 'Processing...' : tab === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
            </Button>
          </form>

          <button onClick={() => navigate('/dashboard')} className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to dashboard
          </button>
        </>
      )}
    </div>
  );
}
