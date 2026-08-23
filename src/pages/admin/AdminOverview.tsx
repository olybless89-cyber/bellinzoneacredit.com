import { useEffect, useState } from 'react';
import { supabase } from '@/db/supabase';
import { Users, ShieldCheck, ArrowUpRight, TrendingUp, Clock, AlertCircle, Ban, ArrowLeftRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { getGlobalTransfersBlocked, setGlobalTransfersBlocked } from '@/services/api';
import { toast } from 'sonner';

interface Stats {
  total_users: number;
  pending_kyc: number;
  total_transactions: number;
  total_volume: number;
  active_investments: number;
  failed_transactions: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentUsers, setRecentUsers] = useState<{ id: string; username: string | null; first_name: string | null; created_at: string; role: string }[]>([]);
  const [globalBlocked, setGlobalBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  useEffect(() => {
    getGlobalTransfersBlocked().then(setGlobalBlocked);
    const load = async () => {
      const [usersRes, kycRes, txnRes, investRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('kyc_documents').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('transactions').select('id, amount, status', { count: 'exact' }),
        supabase.from('investments').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      const txns = txnRes.data || [];
      const total_volume = txns.reduce((s, t) => s + Math.abs(t.amount), 0);
      const failed_transactions = txns.filter((t) => t.status === 'failed').length;

      setStats({
        total_users: usersRes.count || 0,
        pending_kyc: kycRes.count || 0,
        total_transactions: txnRes.count || 0,
        total_volume,
        active_investments: investRes.count || 0,
        failed_transactions,
      });

      const { data: recent } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, created_at, role')
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentUsers(recent || []);
    };
    load().finally(() => setLoading(false));
  }, []);

  const toggleGlobalBlock = async () => {
    setBlockLoading(true);
    try {
      await setGlobalTransfersBlocked(!globalBlocked);
      setGlobalBlocked(!globalBlocked);
      toast.success(!globalBlocked ? 'All user transfers are now BLOCKED' : 'Transfers re-enabled for all users');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update transfer setting');
    } finally {
      setBlockLoading(false);
    }
  };

  const cards = stats ? [
    { label: 'Total Users', value: stats.total_users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Pending KYC', value: stats.pending_kyc, icon: ShieldCheck, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Transactions', value: stats.total_transactions, icon: ArrowUpRight, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Volume (USD)', value: `$${stats.total_volume.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-400/10' },
    { label: 'Active Investments', value: stats.active_investments, icon: Clock, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Failed Txns', value: stats.failed_transactions, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-400/10' },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Admin Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Real-time platform metrics</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          : cards.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card rounded-2xl p-5 border border-border">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="text-2xl font-extrabold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))
        }
      </div>

      {/* Global transfer controls */}
      <div className={`glass-card rounded-2xl border p-6 flex items-center justify-between gap-4 flex-wrap ${globalBlocked ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${globalBlocked ? 'bg-destructive/20' : 'bg-primary/10'}`}>
            {globalBlocked ? <Ban className="w-5 h-5 text-destructive" /> : <ArrowLeftRight className="w-5 h-5 text-primary" />}
          </div>
          <div>
            <h2 className="font-bold text-foreground">Transfer Controls</h2>
            <p className="text-sm text-muted-foreground">
              {globalBlocked
                ? 'All outgoing user transfers are currently BLOCKED platform-wide.'
                : 'Outgoing user transfers are currently enabled platform-wide.'}
            </p>
          </div>
        </div>
        <Button
          onClick={toggleGlobalBlock}
          disabled={blockLoading}
          className={globalBlocked
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
        >
          {blockLoading ? 'Updating...' : globalBlocked ? 'Enable Transfers For All' : 'Block Transfers For All Users'}
        </Button>
      </div>

      {/* Recent users */}
      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">Recent Registrations</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                <th className="text-left px-6 py-3">User</th>
                <th className="text-left px-6 py-3">Role</th>
                <th className="text-left px-6 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                  </tr>
                ))
                : recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground text-sm">
                        {u.first_name || u.username || 'Unknown'}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">@{u.username || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-destructive/20 text-destructive' : 'bg-primary/10 text-primary'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
