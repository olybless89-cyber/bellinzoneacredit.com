import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { setUserLoginPin, setUserTransferPin, updateProfile } from '@/services/api';
import { toast } from 'sonner';
import { User, Shield, CreditCard, KeyRound, Upload, Check, FileBadge } from 'lucide-react';
import type { KycStatus } from '@/types';

const KYC_BADGE: Record<KycStatus, { label: string; className: string }> = {
  pending: { label: 'Pending Review', className: 'bg-yellow-400/10 text-yellow-600' },
  approved: { label: 'Verified', className: 'bg-green-600/10 text-green-700' },
  rejected: { label: 'Rejected — resubmit', className: 'bg-red-400/10 text-red-500' },
};

const ID_TYPES = ['National ID', 'International Passport', "Driver's License", "Voter's Card"];

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

  // Real KYC status from the latest kyc_documents submission
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const loadKycStatus = () => {
    if (!profile) return;
    supabase
      .from('kyc_documents')
      .select('status')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setKycStatus((data?.status as KycStatus) || null));
  };
  useEffect(loadKycStatus, [profile]);

  // KYC submission / resubmission state
  const [kycIdType, setKycIdType] = useState('');
  const [kycFront, setKycFront] = useState<File | null>(null);
  const [kycBack, setKycBack] = useState<File | null>(null);
  const [kycSaving, setKycSaving] = useState(false);

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!kycIdType) { toast.error('Select your ID type'); return; }
    if (!kycFront && !kycBack) { toast.error('Upload at least one side of your ID'); return; }
    setKycSaving(true);
    try {
      const upload = async (file: File, side: 'front' | 'back') => {
        const name = `${profile.id}/${side}_${Date.now()}.${file.name.split('.').pop()}`;
        const { data, error } = await supabase.storage.from('kyc_documents').upload(name, file, { contentType: file.type });
        if (error) throw error;
        return data.path;
      };
      const frontUrl = kycFront ? await upload(kycFront, 'front') : null;
      const backUrl = kycBack ? await upload(kycBack, 'back') : null;
      const { error } = await supabase.from('kyc_documents').insert({
        user_id: profile.id, id_card_type: kycIdType, front_url: frontUrl, back_url: backUrl,
      });
      if (error) throw error;
      toast.success('KYC documents submitted — pending review');
      setKycIdType(''); setKycFront(null); setKycBack(null);
      loadKycStatus();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit KYC documents');
    } finally {
      setKycSaving(false);
    }
  };

  // Transfer PIN change state
  const [tpinOpen, setTpinOpen] = useState(false);
  const [loginPin, setLoginPin] = useState('');
  const [newTpin, setNewTpin] = useState('');
  const [confirmTpin, setConfirmTpin] = useState('');
  const [tpinSaving, setTpinSaving] = useState(false);

  // Login PIN change state
  const [lpinOpen, setLpinOpen] = useState(false);
  const [currentLpin, setCurrentLpin] = useState('');
  const [newLpin, setNewLpin] = useState('');
  const [confirmLpin, setConfirmLpin] = useState('');
  const [lpinSaving, setLpinSaving] = useState(false);

  const handleLpinSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (currentLpin !== profile.login_pin) { toast.error('Incorrect current login PIN'); return; }
    if (!/^\d{4}$/.test(newLpin)) { toast.error('Login PIN must be exactly 4 digits'); return; }
    if (newLpin !== confirmLpin) { toast.error('PINs do not match'); return; }
    if (newLpin === currentLpin) { toast.error('New PIN must be different from the current one'); return; }
    setLpinSaving(true);
    try {
      await setUserLoginPin(profile.id, newLpin);
      await refreshProfile();
      toast.success('Login PIN changed — use it on your next sign-in');
      setLpinOpen(false);
      setCurrentLpin(''); setNewLpin(''); setConfirmLpin('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to change login PIN');
    } finally {
      setLpinSaving(false);
    }
  };

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
          ].map(({ label, value }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</label>
              <div className="text-foreground text-sm py-2 px-3 rounded-lg bg-muted/50 text-muted-foreground">{value || '—'}</div>
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">KYC Status</label>
            <div className="py-2 px-3 rounded-lg bg-muted/50">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${kycStatus ? KYC_BADGE[kycStatus].className : 'bg-muted text-muted-foreground'}`}>
                {kycStatus ? KYC_BADGE[kycStatus].label : 'Not submitted'}
              </span>
            </div>
          </div>
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

      {/* Identity Verification (KYC) */}
      <div className="glass-card rounded-2xl p-8 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <FileBadge className="w-4 h-4 text-primary" /> Identity Verification (KYC)
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${kycStatus ? KYC_BADGE[kycStatus].className : 'bg-muted text-muted-foreground'}`}>
            {kycStatus ? KYC_BADGE[kycStatus].label : 'Not submitted'}
          </span>
        </div>

        {kycStatus === 'approved' ? (
          <p className="text-sm text-muted-foreground">Your identity has been verified. No further action is needed.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              {kycStatus === 'pending'
                ? 'Your documents are being reviewed. You can resubmit if you uploaded the wrong document.'
                : kycStatus === 'rejected'
                  ? 'Your previous submission was rejected. Please upload clear photos of a valid ID below.'
                  : 'Upload a valid government-issued ID to verify your account.'}
            </p>
            <form onSubmit={handleKycSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">ID Card Type</label>
                <select value={kycIdType} onChange={(e) => setKycIdType(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-white border border-border text-foreground text-sm shadow-sm" required>
                  <option value="">Select ID Type</option>
                  {ID_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([['Front', kycFront, setKycFront], ['Back', kycBack, setKycBack]] as const).map(([label, file, setter]) => (
                  <div key={label}>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">ID {label}</label>
                    <label className={`flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-white'}`}>
                      <input type="file" className="sr-only" accept="image/*,application/pdf" onChange={(e) => setter(e.target.files?.[0] ?? null)} />
                      {file
                        ? <><Check className="w-6 h-6 text-primary mb-1" /><span className="text-xs text-primary px-2 truncate max-w-full">{file.name}</span></>
                        : <><Upload className="w-6 h-6 text-muted-foreground mb-1" /><span className="text-xs text-muted-foreground">Click to upload</span></>}
                    </label>
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={kycSaving} className="bg-primary text-primary-foreground hover:bg-primary/90 h-10">
                {kycSaving ? 'Submitting...' : kycStatus === 'pending' || kycStatus === 'rejected' ? 'Resubmit Documents' : 'Submit for Verification'}
              </Button>
            </form>
          </>
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

        {/* Login PIN — functional */}
        <div className="py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Login PIN</div>
              <div className="text-xs text-muted-foreground">•••• — used to sign in and authorize transfers</div>
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => setLpinOpen((o) => !o)}
              className="text-primary hover:bg-primary/10 text-xs border border-primary/30"
            >
              {lpinOpen ? 'Close' : 'Change'}
            </Button>
          </div>

          {lpinOpen && (
            <form onSubmit={handleLpinSave} className="mt-4 space-y-3 rounded-xl bg-muted/50 border border-border p-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Current Login PIN</label>
                <Input type="password" inputMode="numeric" maxLength={4} placeholder="••••" value={currentLpin}
                  onChange={(e) => setCurrentLpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="bg-white border-border h-10 max-w-[140px] text-center tracking-[0.3em]" required />
              </div>
              <div className="flex gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">New Login PIN</label>
                  <Input type="password" inputMode="numeric" maxLength={4} placeholder="4 digits" value={newLpin}
                    onChange={(e) => setNewLpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="bg-white border-border h-10 max-w-[140px] text-center tracking-[0.3em]" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Confirm New PIN</label>
                  <Input type="password" inputMode="numeric" maxLength={4} placeholder="4 digits" value={confirmLpin}
                    onChange={(e) => setConfirmLpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="bg-white border-border h-10 max-w-[140px] text-center tracking-[0.3em]" required />
                </div>
              </div>
              <Button type="submit" disabled={lpinSaving} className="bg-primary text-primary-foreground hover:bg-primary/90 h-10">
                {lpinSaving ? 'Saving...' : 'Save Login PIN'}
              </Button>
            </form>
          )}
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

      </div>
    </div>
  );
}
