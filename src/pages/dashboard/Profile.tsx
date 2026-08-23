import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { setUserTransferPin, updateProfile } from '@/services/api';
import { toast } from 'sonner';
import { User, Shield, CreditCard, KeyRound, MailWarning } from 'lucide-react';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: profile?.phone || '',
    country: profile?.country || '',
  });

  // Transfer PIN change state
  const [tpinOpen, setTpinOpen] = useState(false);
  const [loginPin, setLoginPin] = useState('');
  const [newTpin, setNewTpin] = useState('');
  const [confirmTpin, setConfirmTpin] = useState('');
  const [tpinSaving, setTpinSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(profile.id, form);
      await refreshProfile();
      toast.success('Profile updated!');
      setEditing(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleTpinSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (loginPin !== profile.login_pin) { toast.error('Incorrect login PIN'); return; }
    if (!/^\d{4}$/.test(newTpin)) { toast.error('Transfer PIN must be exactly 4 digits'); return; }
    if (newTpin !== confirmTpin) { toast.error('Transfer PINs do not match'); return; }
    if (newTpin === profile.login_pin) { toast.error('Transfer PIN must be different from your login PIN'); return; }
    setTpinSaving(true);
    try {
      await setUserTransferPin(profile.id, newTpin);
      await refreshProfile();
      toast.success(profile.transfer_pin ? 'Transfer PIN changed' : 'Transfer PIN created');
      setTpinOpen(false);
      setLoginPin(''); setNewTpin(''); setConfirmTpin('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save transfer PIN');
    } finally {
      setTpinSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">My Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your personal information and settings</p>
      </div>

      {/* Avatar */}
      <div className="glass-card rounded-2xl p-8 border border-border flex items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <span className="text-3xl font-bold text-primary">
            {(profile?.first_name?.[0] || profile?.username?.[0] || 'U').toUpperCase()}
          </span>
        </div>
        <div>
          <div className="font-bold text-xl text-foreground">
            {profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : profile?.username}
          </div>
          <div className="text-muted-foreground text-sm">@{profile?.username}</div>
          <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold capitalize">
            <Shield className="w-3 h-3" /> {profile?.role}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="glass-card rounded-2xl p-8 border border-border space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <User className="w-4 h-4 text-primary" /> Personal Information
          </div>
          {!editing && <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-primary border border-primary/30 hover:bg-primary/10">Edit</Button>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'First Name', key: 'first_name' as const },
            { label: 'Last Name', key: 'last_name' as const },
            { label: 'Phone', key: 'phone' as const },
            { label: 'Country', key: 'country' as const },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</label>
              {editing ? (
                <Input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="bg-white border-border shadow-sm" />
              ) : (
                <div className="text-foreground text-sm py-2 px-3 rounded-lg bg-muted">{profile?.[key] || '—'}</div>
              )}
            </div>
          ))}
        </div>

        {/* Read-only fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
          {[
            { label: 'Email', value: profile?.email },
            { label: 'Username', value: profile?.username },
            { label: 'Member Since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—' },
            { label: 'KYC Status', value: 'Pending Review' },
          ].map(({ label, value }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</label>
              <div className="text-foreground text-sm py-2 px-3 rounded-lg bg-muted/50 text-muted-foreground">{value || '—'}</div>
            </div>
          ))}
        </div>

        {editing && (
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)} className="border border-border text-muted-foreground">Cancel</Button>
          </div>
        )}
      </div>

      {/* Security */}
      <div className="glass-card rounded-2xl p-8 border border-border space-y-2">
        <div className="flex items-center gap-2 font-semibold text-foreground mb-4">
          <CreditCard className="w-4 h-4 text-primary" /> Security
        </div>

        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <div className="text-sm font-medium text-foreground">Password</div>
            <div className="text-xs text-muted-foreground">••••••••</div>
          </div>
          <span className="text-xs text-muted-foreground">Managed at sign-in</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-border">
          <div>
            <div className="text-sm font-medium text-foreground">Login PIN</div>
            <div className="text-xs text-muted-foreground">••••</div>
          </div>
          <span className="text-xs text-muted-foreground">Set at registration</span>
        </div>

        {/* Transfer PIN — functional */}
        <div className="py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <KeyRound className="w-3.5 h-3.5 text-primary" /> Transfer PIN
              </div>
              <div className="text-xs text-muted-foreground">
                {profile?.transfer_pin ? '•••• — required to authorize transfers' : 'Not set — you will be asked to create one on your first transfer'}
              </div>
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => setTpinOpen((o) => !o)}
              className="text-primary hover:bg-primary/10 text-xs border border-primary/30"
            >
              {tpinOpen ? 'Close' : profile?.transfer_pin ? 'Change' : 'Set Now'}
            </Button>
          </div>

          {tpinOpen && (
            <form onSubmit={handleTpinSave} className="mt-4 space-y-3 rounded-xl bg-muted/50 border border-border p-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Current Login PIN</label>
                <Input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="bg-white border-border h-10 max-w-[140px] text-center tracking-[0.3em]" required />
              </div>
              <div className="flex gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">New Transfer PIN</label>
                  <Input type="password" inputMode="numeric" maxLength={4} placeholder="4 digits" value={newTpin}
                    onChange={(e) => setNewTpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="bg-white border-border h-10 max-w-[140px] text-center tracking-[0.3em]" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Confirm Transfer PIN</label>
                  <Input type="password" inputMode="numeric" maxLength={4} placeholder="4 digits" value={confirmTpin}
                    onChange={(e) => setConfirmTpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="bg-white border-border h-10 max-w-[140px] text-center tracking-[0.3em]" required />
                </div>
              </div>
              <Button type="submit" disabled={tpinSaving} className="bg-primary text-primary-foreground hover:bg-primary/90 h-10">
                {tpinSaving ? 'Saving...' : 'Save Transfer PIN'}
              </Button>
            </form>
          )}
        </div>

        {/* COT status — admin-issued, read-only for the user */}
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MailWarning className="w-3.5 h-3.5 text-primary" /> COT Code
            </div>
            <div className="text-xs text-muted-foreground">
              {profile?.cot_code ? 'Issued — check Secure Mail for your code' : 'Not issued — request from support via Secure Mail'}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${profile?.cot_code ? 'bg-green-600/10 text-green-700' : 'bg-muted text-muted-foreground'}`}>
            {profile?.cot_code ? 'Active' : 'None'}
          </span>
        </div>
      </div>
    </div>
  );
}
