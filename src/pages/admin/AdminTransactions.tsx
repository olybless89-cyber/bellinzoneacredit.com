import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/db/supabase';
import { Search, TrendingDown, TrendingUp, ArrowUpRight, Filter, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/types';

const TXN_TYPES = ['deposit', 'withdrawal', 'transfer', 'interest'];
const TXN_STATUSES = ['completed', 'pending', 'failed', 'cancelled'];

// datetime-local inputs want "YYYY-MM-DDTHH:mm" in local time
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface TxnWithUser extends Transaction {
  username: string | null;
  first_name: string | null;
}

const TYPE_COLORS: Record<string, string> = {
  deposit: 'text-green-600',
  withdrawal: 'text-red-500',
  transfer: 'text-yellow-400',
  interest: 'text-blue-400',
};

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-400/10 text-green-600',
  pending: 'bg-yellow-400/10 text-yellow-400',
  failed: 'bg-red-400/10 text-red-500',
  cancelled: 'bg-gray-400/10 text-gray-400',
};

export default function AdminTransactions() {
  const [txns, setTxns] = useState<TxnWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // Edit dialog state
  const [editing, setEditing] = useState<TxnWithUser | null>(null);
  const [editForm, setEditForm] = useState({ type: '', status: '', amount: '', description: '', recipient_account: '', reference: '', created_at: '' });
  const [saving, setSaving] = useState(false);

  const openEdit = (t: TxnWithUser) => {
    setEditing(t);
    setEditForm({
      type: t.type,
      status: t.status,
      amount: String(t.amount),
      description: t.description || '',
      recipient_account: t.recipient_account || '',
      reference: t.reference,
      created_at: toLocalInput(t.created_at),
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const amount = parseFloat(editForm.amount);
    if (isNaN(amount)) { toast.error('Amount must be a number'); return; }
    const date = new Date(editForm.created_at);
    if (isNaN(date.getTime())) { toast.error('Invalid date'); return; }
    setSaving(true);
    const { error } = await supabase
      .from('transactions')
      .update({
        type: editForm.type,
        status: editForm.status,
        amount,
        description: editForm.description || null,
        recipient_account: editForm.recipient_account || null,
        reference: editForm.reference,
        created_at: date.toISOString(),
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) { toast.error(`Failed to update transaction: ${error.message}`); return; }
    toast.success('Transaction updated');
    setEditing(null);
    loadTxns();
  };

  const loadTxns = useCallback(async () => {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (!transactions) { setLoading(false); return; }

    const enriched = await Promise.all(
      transactions.map(async (t) => {
        const { data: acc } = await supabase
          .from('bank_accounts')
          .select('user_id')
          .eq('id', t.account_id)
          .maybeSingle();
        if (!acc) return { ...t, username: null, first_name: null };

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, first_name')
          .eq('id', acc.user_id)
          .maybeSingle();
        return { ...t, username: profile?.username || null, first_name: profile?.first_name || null };
      })
    );
    setTxns(enriched);
    setLoading(false);
  }, [page]);

  useEffect(() => { setLoading(true); loadTxns(); }, [loadTxns]);

  const filtered = txns.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.description?.toLowerCase().includes(q) ||
      t.reference?.toLowerCase().includes(q) ||
      t.recipient_account?.toLowerCase().includes(q) ||
      t.username?.toLowerCase().includes(q)
    );
  });

  const totalVolume = filtered.reduce((s, t) => s + Math.abs(t.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">All Transactions</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {filtered.length} transactions · Total volume: ${totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by description, reference, user…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted border-border" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {['all', 'deposit', 'withdrawal', 'transfer', 'interest'].map((f) => (
            <Button
              key={f}
              size="sm"
              variant={typeFilter === f ? 'default' : 'ghost'}
              className={cn('text-xs', typeFilter === f ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground')}
              onClick={() => setTypeFilter(f)}
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
                <th className="text-left px-6 py-3">User</th>
                <th className="text-left px-6 py-3">Type</th>
                <th className="text-right px-6 py-3">Amount</th>
                <th className="text-left px-6 py-3">Description</th>
                <th className="text-left px-6 py-3">Recipient</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="text-left px-6 py-3">Date</th>
                <th className="text-right px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 8 }).map((__, j) => <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>)}
                  </tr>
                ))
                : filtered.length === 0
                  ? <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">No transactions found</td></tr>
                  : filtered.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">{t.first_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">@{t.username || '—'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn('flex items-center gap-1.5 text-sm font-semibold', TYPE_COLORS[t.type] || 'text-muted-foreground')}>
                          {t.amount >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                          {t.type}
                        </div>
                      </td>
                      <td className={cn('px-6 py-4 text-right text-sm font-bold', t.amount >= 0 ? 'text-green-600' : 'text-red-500')}>
                        {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {t.currency}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground max-w-[180px] truncate">{t.description || '—'}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground font-mono">{t.recipient_account || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[t.status] || ''}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button size="sm" variant="ghost" className="border border-border h-8 px-2" onClick={() => openEdit(t)} title="Edit transaction">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Page {page + 1}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" className="border border-border" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            Previous
          </Button>
          <Button size="sm" variant="ghost" className="border border-border" onClick={() => setPage((p) => p + 1)} disabled={txns.length < PAGE_SIZE}>
            Next <ArrowUpRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>

      {/* Edit transaction dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={saveEdit} className="space-y-4 mt-2">
              <div className="text-xs text-muted-foreground">
                {editing.first_name || 'Unknown user'} · <span className="font-mono">{editing.id.slice(0, 8)}…</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Type</label>
                  <select value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-foreground text-sm capitalize">
                    {TXN_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Status</label>
                  <select value={editForm.status} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))} className="w-full h-10 px-3 rounded-lg bg-muted border border-border text-foreground text-sm capitalize">
                    {TXN_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Amount (negative = money out)</label>
                <Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} className="bg-muted border-border" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Description</label>
                <Input value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} className="bg-muted border-border" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Recipient Account</label>
                  <Input value={editForm.recipient_account} onChange={(e) => setEditForm((f) => ({ ...f, recipient_account: e.target.value }))} className="bg-muted border-border font-mono text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Reference</label>
                  <Input value={editForm.reference} onChange={(e) => setEditForm((f) => ({ ...f, reference: e.target.value }))} className="bg-muted border-border font-mono text-xs" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Date & Time</label>
                <Input type="datetime-local" value={editForm.created_at} onChange={(e) => setEditForm((f) => ({ ...f, created_at: e.target.value }))} className="bg-muted border-border" required />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)} className="border border-border">
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
