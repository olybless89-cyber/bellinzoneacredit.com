import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Search, UserCog, Ban, CheckCircle, Mail, ChevronDown, ChevronUp, PlusCircle, ArrowLeftRight, KeyRound, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Profile, BankAccount } from '@/types';
import { adminCreditAccount, adminDeleteUser, setUserLoginPin, setUserTransfersBlocked, setUserTransferPin } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

interface UserWithAccounts extends Profile {
  account_count: number;
  total_balance: number;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user: adminUser } = useAuth();
  const [users, setUsers] = useState<UserWithAccounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'first_name'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Security codes (transfer PIN / login PIN) dialog state
  const [codesUser, setCodesUser] = useState<UserWithAccounts | null>(null);
  const [tpinInput, setTpinInput] = useState('');
  const [lpinInput, setLpinInput] = useState('');
  const [codesLoading, setCodesLoading] = useState(false);

  const openCodes = (u: UserWithAccounts) => {
    setCodesUser(u);
    setTpinInput('');
    setLpinInput('');
  };

  // Delete user state
  const [deleteUser, setDeleteUser] = useState<UserWithAccounts | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteUser = async () => {
    if (!deleteUser) return;
    if (deleteConfirmText !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
    setDeleting(true);
    try {
      await adminDeleteUser(deleteUser.id);
      toast.success(`Deleted ${deleteUser.first_name || deleteUser.username || deleteUser.email}`);
      setDeleteUser(null);
      setDeleteConfirmText('');
      loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const resetLoginPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codesUser) return;
    if (!/^\d{4}$/.test(lpinInput)) { toast.error('Login PIN must be exactly 4 digits'); return; }
    setCodesLoading(true);
    try {
      await setUserLoginPin(codesUser.id, lpinInput);
      setCodesUser({ ...codesUser, login_pin: lpinInput });
      setLpinInput('');
      toast.success('Login PIN reset');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset login PIN');
    } finally {
      setCodesLoading(false);
    }
  };

  const resetTransferPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codesUser) return;
    if (!/^\d{4}$/.test(tpinInput)) { toast.error('Transfer PIN must be exactly 4 digits'); return; }
    setCodesLoading(true);
    try {
      await setUserTransferPin(codesUser.id, tpinInput);
      setCodesUser({ ...codesUser, transfer_pin: tpinInput });
      setTpinInput('');
      toast.success('Transfer PIN reset');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset transfer PIN');
    } finally {
      setCodesLoading(false);
    }
  };

  // Add-balance dialog state
  const [creditUser, setCreditUser] = useState<UserWithAccounts | null>(null);
  const [creditAccounts, setCreditAccounts] = useState<BankAccount[]>([]);
  const [creditAccountId, setCreditAccountId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNote, setCreditNote] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);

  const openCredit = async (u: UserWithAccounts) => {
    setCreditUser(u);
    setCreditAmount(''); setCreditNote('');
    const { data: accs } = await supabase.from('bank_accounts').select('*').eq('user_id', u.id).order('created_at', { ascending: true });
    setCreditAccounts(accs || []);
    setCreditAccountId(accs && accs[0] ? accs[0].id : '');
  };

  const submitCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditAccountId) { toast.error('User has no account to credit'); return; }
    const amt = parseFloat(creditAmount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setCreditLoading(true);
    try {
      await adminCreditAccount({ accountId: creditAccountId, amount: amt, description: creditNote || 'Admin Credit' });
      toast.success(`$${amt.toFixed(2)} credited successfully`);
      setCreditUser(null);
      await loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to credit account');
    } finally {
      setCreditLoading(false);
    }
  };

  const loadUsers = useCallback(async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order(sortField, { ascending: sortDir === 'asc' });

    if (!profiles) { setLoading(false); return; }

    const enriched = await Promise.all(
      profiles.map(async (p) => {
        const { data: accs } = await supabase
          .from('bank_accounts')
          .select('balance')
          .eq('user_id', p.id);
        const account_count = accs?.length || 0;
        const total_balance = accs?.reduce((s, a) => s + a.balance, 0) || 0;
        return { ...p, account_count, total_balance };
      })
    );
    setUsers(enriched);
    setLoading(false);
  }, [sortField, sortDir]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const toggleTransferBlock = async (u: UserWithAccounts) => {
    const blocked = !!u.transfers_blocked;
    setActionLoading(u.id + '_block');
    try {
      await setUserTransfersBlocked(u.id, !blocked);
      toast.success(!blocked
        ? `Transfers blocked for ${u.first_name || u.username || u.email}`
        : `Transfers unblocked for ${u.first_name || u.username || u.email}`);
      await loadUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update transfer block');
    }
    setActionLoading(null);
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setActionLoading(userId);
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) { toast.error('Failed to update role'); }
    else { toast.success(`Role updated to ${newRole}`); await loadUsers(); }
    setActionLoading(null);
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.username?.toLowerCase().includes(q) ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const SortBtn = ({ field, label }: { field: typeof sortField; label: string }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => { setSortField(field); setSortDir((d) => field === sortField ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }}
    >
      {label}
      {sortField === field ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} total registered users</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name, username, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-muted border-border" />
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-muted/30">
                <th className="text-left px-6 py-3"><SortBtn field="first_name" label="User" /></th>
                <th className="text-left px-6 py-3">Email</th>
                <th className="text-left px-6 py-3">Country</th>
                <th className="text-left px-6 py-3">Accounts</th>
                <th className="text-left px-6 py-3">Balance (USD)</th>
                <th className="text-left px-6 py-3">Role</th>
                <th className="text-left px-6 py-3"><SortBtn field="created_at" label="Joined" /></th>
                <th className="text-left px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {Array.from({ length: 8 }).map((__, j) => <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>)}
                  </tr>
                ))
                : filtered.length === 0
                  ? <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">No users found</td></tr>
                  : filtered.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {(u.first_name?.[0] || u.username?.[0] || '?').toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-sm text-foreground">{u.first_name} {u.last_name}</div>
                            <div className="text-xs text-muted-foreground">@{u.username || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{u.email || '—'}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{u.country || '—'}</td>
                      <td className="px-6 py-4 text-sm text-foreground font-medium">{u.account_count}</td>
                      <td className="px-6 py-4 text-sm text-foreground font-semibold">${u.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.role === 'admin' ? 'bg-destructive/20 text-destructive' : 'bg-primary/10 text-primary'}`}>
                            {u.role}
                          </span>
                          {u.transfers_blocked && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive">
                              transfers blocked
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2 max-w-md">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="border border-primary/30 text-xs h-8 px-2 text-primary hover:bg-primary/10"
                            onClick={() => openCredit(u)}
                            disabled={actionLoading === u.id + '_credit'}
                          >
                            <PlusCircle className="w-3 h-3 mr-1" />Add Balance
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`border text-xs h-8 px-2 ${u.transfers_blocked ? 'border-green-600/40 text-green-700 hover:bg-green-600/10' : 'border-destructive/40 text-destructive hover:bg-destructive/10'}`}
                            onClick={() => toggleTransferBlock(u)}
                            disabled={actionLoading === u.id + '_block'}
                          >
                            {u.transfers_blocked
                              ? <><CheckCircle className="w-3 h-3 mr-1" />Unblock Transfers</>
                              : <><ArrowLeftRight className="w-3 h-3 mr-1" />Block Transfers</>}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="border border-border text-xs h-8 px-2"
                            onClick={() => toggleRole(u.id, u.role)}
                            disabled={actionLoading === u.id}
                          >
                            {u.role === 'admin' ? <><Ban className="w-3 h-3 mr-1" />Demote</> : <><UserCog className="w-3 h-3 mr-1" />Promote</>}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="border border-border text-xs h-8 px-2"
                            onClick={() => navigate(`/admin/messages?to=${u.id}`)}
                          >
                            <Mail className="w-3 h-3 mr-1" />Message
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="border border-primary/30 text-primary hover:bg-primary/10 text-xs h-8 px-2"
                            onClick={() => openCodes(u)}
                          >
                            <KeyRound className="w-3 h-3 mr-1" />PINs
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="border border-red-500/40 text-red-500 hover:bg-red-500/10 text-xs h-8 px-2"
                            onClick={() => setDeleteUser(u)}
                            disabled={actionLoading === u.id}
                          >
                            <Trash2 className="w-3 h-3 mr-1" />Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>

      {!loading && (
        <div className="text-xs text-muted-foreground text-right">
          Showing {filtered.length} of {users.length} users
        </div>
      )}

      {/* Add Balance dialog */}
      <Dialog open={!!creditUser} onOpenChange={(open) => !open && setCreditUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Balance — {creditUser?.first_name || creditUser?.username || 'User'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCredit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</label>
              {creditAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">This user has no bank account yet.</p>
              ) : (
                <select value={creditAccountId} onChange={(e) => setCreditAccountId(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-muted border border-border text-foreground text-sm">
                  {creditAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_number} — {a.currency} {a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({a.account_type})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">$</span>
                <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="bg-white border-border h-12 pl-8 text-lg font-semibold" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Note (Optional)</label>
              <Input placeholder="e.g. Welcome bonus, Manual deposit" value={creditNote} onChange={(e) => setCreditNote(e.target.value)} className="bg-white border-border h-12" />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreditUser(null)} className="border border-border">Cancel</Button>
              <Button type="submit" disabled={creditLoading || !creditAccountId} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {creditLoading ? 'Crediting...' : 'Credit Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Security Codes dialog (COT + transfer PIN) */}
      <Dialog open={!!codesUser} onOpenChange={(open) => !open && setCodesUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Security Codes — {codesUser?.first_name || codesUser?.username || 'User'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Transfer PIN reset */}
            <form onSubmit={resetTransferPin} className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Transfer PIN</label>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${codesUser?.transfer_pin ? 'bg-green-600/10 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                  {codesUser?.transfer_pin ? 'Set' : 'Not set'}
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={tpinInput}
                  onChange={(e) => setTpinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="New 4-digit PIN"
                  className="bg-white border-border h-11 text-center tracking-[0.3em]"
                />
                <Button type="submit" disabled={codesLoading || tpinInput.length < 4} className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 shrink-0">
                  Reset PIN
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">The user is notified by notification whenever their transfer PIN changes.</p>
            </form>

            {/* Login PIN reset */}
            <form onSubmit={resetLoginPin} className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Login PIN</label>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${codesUser?.login_pin ? 'bg-green-600/10 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                  {codesUser?.login_pin ? 'Set' : 'Not set'}
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={lpinInput}
                  onChange={(e) => setLpinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="New 4-digit PIN"
                  className="bg-white border-border h-11 text-center tracking-[0.3em]"
                />
                <Button type="submit" disabled={codesLoading || lpinInput.length < 4} className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 shrink-0">
                  Reset PIN
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Resets the PIN the user signs in with. They are notified of the change.</p>
            </form>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setCodesUser(null); loadUsers(); }} className="border border-border">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User confirmation dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => { if (!open) { setDeleteUser(null); setDeleteConfirmText(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete User — {deleteUser?.first_name || deleteUser?.username || 'User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">This permanently deletes:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>The user's login and profile ({deleteUser?.email})</li>
                <li>All bank accounts and transaction history</li>
                <li>KYC documents, notifications and Secure Mail</li>
              </ul>
              <p className="font-semibold text-red-500">This cannot be undone.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Type DELETE to confirm</label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="bg-white border-border h-11 font-mono tracking-[0.2em]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => { setDeleteUser(null); setDeleteConfirmText(''); }} className="border border-border">Cancel</Button>
            <Button
              type="button"
              onClick={confirmDeleteUser}
              disabled={deleting || deleteConfirmText !== 'DELETE'}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />{deleting ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
