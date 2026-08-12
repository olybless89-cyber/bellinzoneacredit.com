import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccounts, depositFunds, withdrawFunds } from '@/services/api';
import { supabase } from '@/db/supabase';
import type { BankAccount } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Tab = 'deposit' | 'withdraw';
type Stage = 'form' | 'confirm' | 'pin';

export default function MoneyPage() {
  const { user, profile } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('deposit');
  const [stage, setStage] = useState<Stage>('form');
  const [fromId, setFromId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // PIN state
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

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
  const isValid = tab === 'deposit' ? validDeposit : validWithdraw;

  const resetForm = () => {
    setAmount(''); setDescription(''); setRecipient('');
    setPin(['', '', '', '']); setPinError(''); setStage('form');
  };

  const handlePinChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...pin]; next[i] = val; setPin(next);
    if (val && i < 3) pinRefs.current[i + 1]?.focus();
  };

  const handlePinKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[i] && i > 0) pinRefs.current[i - 1]?.focus();
  };

  // Step 1: form → confirm
  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      if (tab === 'withdraw' && amountNum > 0 && fromAccount && amountNum > fromAccount.balance)
        toast.error('Insufficient funds');
      else toast.error('Enter a valid amount');
      return;
    }
    setStage('confirm');
  };

  // Step 2: confirm → pin
  const handleConfirm = () => {
    setStage('pin');
    setTimeout(() => pinRefs.current[0]?.focus(), 100);
  };

  // Step 3: verify PIN → execute
  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredPin = pin.join('');
    if (enteredPin.length < 4) { setPinError('Enter your 4-digit PIN'); return; }

    // Verify PIN against profile
    if (profile?.login_pin !== enteredPin) {
      setPinError('Incorrect PIN. Please try again.');
      setPin(['', '', '', '']);
      pinRefs.current[0]?.focus();
      return;
    }

    setPinError('');
    setSubmitting(true);
    try {
      if (tab === 'deposit') {
        await depositFunds({ accountId: fromId, amount: amountNum, description: description || 'Deposit' });
        toast.success(`${fromAccount?.currency || '$'}${amountNum.toFixed(2)} deposited successfully!`);
      } else {
        await withdrawFunds({
          accountId: fromId,
          amount: amountNum,
          description: description || 'Withdrawal',
          recipient_account: recipient.trim() || undefined,
        });
        toast.success(`${fromAccount?.currency || '$'}${amountNum.toFixed(2)} withdrawn successfully!`);
      }
      setAccounts(await getUserAccounts(user!.id));
      resetForm();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Operation failed');
      setStage('confirm');
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
          {/* Tabs — only visible on form stage */}
          {stage === 'form' && (
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
          )}

          {/* ── STAGE 1: Form ── */}
          {stage === 'form' && (
            <form onSubmit={handleReview} className="glass-card rounded-2xl p-8 border border-border space-y-6">
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
                  <div className="mt-2 text-xs text-muted-foreground">
                    Available: {fromAccount.currency} {fromAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                    {fromAccount?.currency || '$'}
                  </span>
                  <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-white border-border shadow-sm h-12 pl-12 text-lg font-semibold" required />
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
                disabled={!isValid}
                className={cn('w-full h-12 text-base', tab === 'deposit' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90')}
              >
                {tab === 'deposit' ? <ArrowDownLeft className="w-4 h-4 mr-2" /> : <ArrowUpRight className="w-4 h-4 mr-2" />}
                Review {tab === 'deposit' ? 'Deposit' : 'Withdrawal'}
              </Button>
            </form>
          )}

          {/* ── STAGE 2: Confirm ── */}
          {stage === 'confirm' && (
            <div className="glass-card rounded-2xl p-8 border border-border space-y-6">
              <div className="text-center">
                <div className={cn('w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4', tab === 'deposit' ? 'bg-green-100' : 'bg-primary/10')}>
                  {tab === 'deposit'
                    ? <ArrowDownLeft className="w-7 h-7 text-green-600" />
                    : <ArrowUpRight className="w-7 h-7 text-primary" />}
                </div>
                <h2 className="text-xl font-extrabold text-foreground">
                  Confirm {tab === 'deposit' ? 'Deposit' : 'Withdrawal'}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">Please review the details below before proceeding</p>
              </div>

              <div className="rounded-xl bg-muted border border-border divide-y divide-border text-sm">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Account</span>
                  <span className="font-semibold text-foreground">{fromAccount?.account_number}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Amount</span>
                  <span className={cn('font-bold text-base', tab === 'deposit' ? 'text-green-600' : 'text-primary')}>
                    {fromAccount?.currency} {amountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {tab === 'withdraw' && recipient && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-muted-foreground">Destination</span>
                    <span className="font-semibold text-foreground">{recipient}</span>
                  </div>
                )}
                {description && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-muted-foreground">Description</span>
                    <span className="font-semibold text-foreground">{description}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={handleConfirm} className={cn('w-full h-12 text-base', tab === 'deposit' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Proceed — Enter PIN
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStage('form')} className="w-full border border-border text-muted-foreground">
                  ← Edit Details
                </Button>
              </div>
            </div>
          )}

          {/* ── STAGE 3: PIN verification ── */}
          {stage === 'pin' && (
            <form onSubmit={handlePinSubmit} className="glass-card rounded-2xl p-8 border border-border space-y-6 text-center">
              <div>
                <div className="w-14 h-14 rounded-full bg-primary/10 border-4 border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-extrabold text-foreground">Verify Your PIN</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Enter your 4-digit PIN to {tab === 'deposit' ? 'deposit' : 'withdraw'}{' '}
                  <span className="font-semibold text-foreground">
                    {fromAccount?.currency} {amountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </p>
              </div>

              <div>
                <div className="flex gap-4 justify-center mb-2">
                  {pin.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { pinRefs.current[i] = el; }}
                      type={showPin ? 'text' : 'password'}
                      maxLength={1}
                      value={d}
                      onChange={(e) => handlePinChange(i, e.target.value)}
                      onKeyDown={(e) => handlePinKeyDown(i, e)}
                      className={cn(
                        'w-14 h-16 rounded-xl border-2 text-center text-2xl font-bold bg-white text-foreground outline-none transition-all shadow-sm',
                        d ? 'border-primary' : 'border-border',
                        'focus:border-primary focus:ring-2 focus:ring-primary/20',
                        pinError && 'border-destructive'
                      )}
                      inputMode="numeric"
                    />
                  ))}
                </div>
                <button type="button" onClick={() => setShowPin(!showPin)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mx-auto transition-colors mt-2">
                  {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPin ? 'Hide' : 'Show'} PIN
                </button>
                {pinError && <p className="text-xs text-destructive mt-2">{pinError}</p>}
              </div>

              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={submitting || pin.join('').length < 4} className={cn('w-full h-12 text-base', tab === 'deposit' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-primary text-primary-foreground hover:bg-primary/90')}>
                  {submitting ? 'Processing...' : `Confirm ${tab === 'deposit' ? 'Deposit' : 'Withdrawal'}`}
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setStage('confirm'); setPin(['', '', '', '']); setPinError(''); }} className="w-full border border-border text-muted-foreground">
                  ← Back
                </Button>
              </div>
            </form>
          )}

          {stage === 'form' && (
            <button onClick={() => navigate('/dashboard')} className="text-sm text-muted-foreground hover:text-primary transition-colors">
              ← Back to dashboard
            </button>
          )}
        </>
      )}
    </div>
  );
}
