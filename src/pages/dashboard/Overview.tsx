import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, CreditCard, Plus, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getUserAccounts, getUserTransactions } from '@/services/api';
import type { BankAccount, Transaction } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/db/supabase';

const TXN_ICON: Record<string, React.ElementType> = {
  deposit: ArrowDownLeft,
  withdrawal: ArrowUpRight,
  transfer: ArrowUpRight,
  interest: TrendingUp,
};

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([getUserAccounts(user.id), getUserTransactions(user.id, 5)])
      .then(([accs, txns]) => { setAccounts(accs); setTransactions(txns); })
      .catch(() => toast.error('Failed to load account data'))
      .finally(() => setLoading(false));
  }, [user]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const primaryAccount = accounts[0];

  const createFirstAccount = async () => {
    if (!user) return;
    const { error } = await supabase.from('bank_accounts').insert({
      user_id: user.id, account_type: 'savings', currency: 'USD', balance: 0, apy: 4.85,
    });
    if (error) { toast.error('Failed to create account'); return; }
    const accs = await getUserAccounts(user.id);
    setAccounts(accs);
    toast.success('Savings account created!');
  };

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-40 rounded-2xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">
          Welcome back, {profile?.first_name || profile?.username || 'User'} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Here's your financial overview</p>
      </div>

      {/* Balance Card */}
      {accounts.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center border border-dashed border-border">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-bold text-foreground mb-2">No Accounts Yet</h3>
          <p className="text-muted-foreground text-sm mb-6">Open your first account to get started.</p>
          <Button onClick={createFirstAccount} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" /> Create Savings Account
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-[#1e40af] to-[#0a1c50] p-8 text-white teal-glow">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="text-white/60 text-sm mb-1">Total Available Balance</div>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-extrabold">
                  {balanceVisible ? `$${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '••••••••'}
                </span>
                <button onClick={() => setBalanceVisible(!balanceVisible)} className="text-white/60 hover:text-white transition-colors">
                  {balanceVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {primaryAccount?.apy && primaryAccount.apy > 0 && (
                <div className="text-white/60 text-xs mt-1">+{primaryAccount.apy}% APY growth this month</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-white/60 text-xs mb-1">Account Number</div>
              <div className="font-mono text-sm">{primaryAccount?.account_number || '—'}</div>
              <div className="text-white/60 text-xs mt-1 capitalize">{primaryAccount?.account_type} Account</div>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/dashboard/money">
              <Button size="sm" className="bg-white/20 text-white border border-white/30 hover:bg-white/30">
                <ArrowDownLeft className="w-4 h-4 mr-1" /> Deposit / Withdraw
              </Button>
            </Link>
            <Link to="/dashboard/transfer">
              <Button size="sm" className="bg-white/20 text-white border border-white/30 hover:bg-white/30">
                <ArrowUpRight className="w-4 h-4 mr-1" /> Transfer
              </Button>
            </Link>
            <Link to="/dashboard/debit-card">
              <Button size="sm" className="bg-white/20 text-white border border-white/30 hover:bg-white/30">
                <CreditCard className="w-4 h-4 mr-1" /> Debit Card
              </Button>
            </Link>
            <Link to="/dashboard/transactions">
              <Button size="sm" className="bg-white/20 text-white border border-white/30 hover:bg-white/30">
                <ArrowRight className="w-4 h-4 mr-1" /> History
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Invested', value: '$0.00', icon: TrendingUp, color: 'text-primary' },
            { label: 'Total Earnings', value: `$${(totalBalance * 0.042).toFixed(2)}`, icon: ArrowDownLeft, color: 'text-green-600' },
            { label: 'Active Accounts', value: accounts.length.toString(), icon: CreditCard, color: 'text-primary' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-2xl p-6 border border-border">
              <div className="flex items-center justify-between mb-3">
                <span className="text-muted-foreground text-sm">{label}</span>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div className="text-2xl font-bold text-foreground">{value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Transactions */}
      {accounts.length > 0 && (
        <div className="glass-card rounded-2xl border border-border">
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 className="font-bold text-foreground">Recent Transactions</h3>
            <Link to="/dashboard/transactions" className="text-primary text-sm hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {transactions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">No transactions yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {transactions.map((txn) => {
                const Icon = TXN_ICON[txn.type] || ArrowUpRight;
                const isCredit = txn.amount > 0;
                return (
                  <div key={txn.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', isCredit ? 'bg-green-500/10' : 'bg-red-500/10')}>
                      <Icon className={cn('w-4 h-4', isCredit ? 'text-green-600' : 'text-red-500')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{txn.description || txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}</div>
                      <div className="text-xs text-muted-foreground">{new Date(txn.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className={cn('font-semibold text-sm shrink-0', isCredit ? 'text-green-600' : 'text-red-500')}>
                      {isCredit ? '+' : ''}{txn.currency} {Math.abs(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
