import { useEffect, useState, useCallback } from 'react';
import { CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getAllCardRequests, updateCardRequestStatus } from '@/services/api';
import type { CardRequest } from '@/types';
import { cn } from '@/lib/utils';

interface Row extends CardRequest {
  username: string | null;
  first_name: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-400',
  completed: 'bg-green-500/10 text-green-600',
  failed: 'bg-red-500/10 text-red-500',
  cancelled: 'bg-muted text-muted-foreground',
};

export default function AdminCardRequests() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAllCardRequests();
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (r: Row, status: 'completed' | 'failed' | 'cancelled') => {
    setActionLoading(r.id + status);
    try {
      await updateCardRequestStatus(r.id, status);
      toast.success(`Card request marked ${status}`);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setActionLoading(null);
    }
  };

  const pending = rows.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Debit Card Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">{rows.length} total · {pending} pending</p>
      </div>

      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : rows.length === 0 ? (
          <div className="p-16 text-center">
            <CreditCard className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-1">No Card Requests</h3>
            <p className="text-muted-foreground text-sm">When users request debit cards, they'll appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
                  <th className="text-left px-6 py-3">User</th>
                  <th className="text-left px-6 py-3">Card</th>
                  <th className="text-left px-6 py-3">Delivery Address</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Requested</th>
                  <th className="text-left px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">{r.first_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">@{r.username || '—'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{r.card_network} {r.card_type}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground max-w-[220px] truncate">{r.delivery_address || '—'}</td>
                    <td className="px-6 py-4">
                      <Badge className={cn('text-xs border-0 capitalize', STATUS_COLORS[r.status] || '')}>{r.status}</Badge>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-6 py-4">
                      {r.status === 'pending' ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" className="border border-green-500/30 text-xs h-8 px-2 text-green-600 hover:bg-green-500/10" onClick={() => handleAction(r, 'completed')} disabled={!!actionLoading}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="border border-red-500/30 text-xs h-8 px-2 text-red-500 hover:bg-red-500/10" onClick={() => handleAction(r, 'failed')} disabled={!!actionLoading}>
                            <XCircle className="w-3 h-3 mr-1" />Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{r.status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
