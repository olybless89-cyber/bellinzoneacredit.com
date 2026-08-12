import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Building2, ChevronRight, ChevronLeft, Upload, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const COUNTRIES = ['United States','United Kingdom','Canada','Australia','Germany','France','India','Nigeria','South Africa','Singapore','UAE','Netherlands','Switzerland','Japan','Brazil','Mexico','Kenya','Ghana'];
const CURRENCIES = ['USD','GBP','EUR','CAD','AUD','NGN','ZAR','SGD','AED','CHF','JPY'];
const ACCOUNT_TYPES = ['savings','checking','corporate','student','joint','fixed'];
const BRANCHES = ['London City Branch','New York Main Branch','Tokyo Fintech Hub','Zurich Private Wealth Center','Bellinzona HQ'];
const ID_TYPES = ['National ID','International Passport','Driver\'s License','Voter\'s Card'];

interface FormData {
  fname: string; lname: string; gender: string; dob: string;
  country: string; email: string; phone: string;
  currency: string; account_type: string; branch: string; id_card_type: string;
  username: string; password: string; login_pin: string; agree: boolean;
}

const STEP_TITLES = ['Personal Info', 'Contact', 'Account & KYC', 'Security'];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    fname: '', lname: '', gender: '', dob: '',
    country: '', email: '', phone: '',
    currency: 'USD', account_type: 'savings', branch: '', id_card_type: '',
    username: '', password: '', login_pin: '', agree: false,
  });

  const set = (k: keyof FormData, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const uploadKyc = async (userId: string) => {
    const upload = async (file: File, side: 'front' | 'back') => {
      const name = `${userId}/${side}_${Date.now()}.${file.name.split('.').pop()}`;
      const { data, error } = await supabase.storage.from('kyc_documents').upload(name, file, { contentType: file.type });
      if (error) throw error;
      const { data: url } = supabase.storage.from('kyc_documents').getPublicUrl(data.path);
      return url.publicUrl;
    };
    const frontUrl = frontFile ? await upload(frontFile, 'front') : null;
    const backUrl = backFile ? await upload(backFile, 'back') : null;
    await supabase.from('kyc_documents').insert({
      user_id: userId, id_card_type: form.id_card_type, front_url: frontUrl, back_url: backUrl,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.agree) { toast.error('Please accept terms & conditions.'); return; }
    if (form.login_pin.length !== 4) { toast.error('PIN must be exactly 4 digits.'); return; }
    if (!/^\d{4}$/.test(form.login_pin)) { toast.error('PIN must be numeric.'); return; }
    // Supabase requires min 6-char password; pad PIN with a static prefix
    const PIN_SECRET = `skb_${form.login_pin}`;
    if (!form.email) { toast.error('Email is required.'); return; }
    setLoading(true);
    try {
      // Use real email address for auth; PIN is the password
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: PIN_SECRET,
        options: {
          data: {
            first_name: form.fname,
            last_name: form.lname,
            username: form.username,
            gender: form.gender,
            dob: form.dob,
            country: form.country,
            login_pin: form.login_pin,
          },
          emailRedirectTo: 'https://bellinzoneacredit.com/dashboard',
        },
      });
      if (signUpErr) throw signUpErr;

      if (authData.user) {
        // Update profile with full contact info + username
        await supabase.from('profiles').update({
          email: form.email,
          phone: form.phone,
          first_name: form.fname,
          last_name: form.lname,
          username: form.username,
          gender: form.gender,
          dob: form.dob,
          country: form.country,
          login_pin: form.login_pin,
        }).eq('id', authData.user.id);

        // Create bank account
        const { data: newAccount } = await supabase.from('bank_accounts').insert({
          user_id: authData.user.id,
          account_type: form.account_type,
          currency: form.currency,
          branch: form.branch,
          apy: form.account_type === 'savings' ? 4.85 : form.account_type === 'fixed' ? 5.40 : 0,
          balance: 0,
        }).select('account_number').maybeSingle();

        // KYC upload
        if (frontFile || backFile) await uploadKyc(authData.user.id);

        // Send welcome email (non-blocking)
        supabase.functions.invoke('send-email', {
          body: {
            type: 'welcome',
            to: form.email,
            user_id: authData.user.id,
            data: {
              first_name: form.fname,
              username: form.username,
              account_number: newAccount?.account_number || '',
            },
          },
        }).catch(() => null);
      }
      toast.success('Account created! Check your email, then sign in.');
      navigate('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (msg.includes('already registered') || msg.includes('already taken')) {
        toast.error('Email or username already registered. Please use different credentials.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eff6ff] via-white to-[#f0f9ff] flex items-center justify-center px-4 py-24">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-xl mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span><span className="text-primary">Bellinzona</span></span>
          </Link>
          <div className="text-muted-foreground text-sm">Step {step + 1} of 4 — {STEP_TITLES[step]}</div>
        </div>

        {/* Progress */}
        <div className="relative mb-8">
          <div className="w-full h-1.5 bg-border rounded-full">
            <div className="h-1.5 bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-3">
            {STEP_TITLES.map((t, i) => (
              <div key={t} className={cn('flex flex-col items-center gap-1', i <= step ? 'text-primary' : 'text-muted-foreground')}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2', i < step ? 'bg-primary border-primary text-primary-foreground' : i === step ? 'border-primary text-primary' : 'border-border text-muted-foreground')}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className="text-xs hidden sm:block">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-8 border border-border shadow-xl">
          <form onSubmit={step === 3 ? handleSubmit : (e) => { e.preventDefault(); setStep((s) => s + 1); }}>
            {/* Step 1 */}
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground mb-6">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="label-sm">First Name</label><Input placeholder="John" value={form.fname} onChange={(e) => set('fname', e.target.value)} className="bg-white border-border shadow-sm" required /></div>
                  <div><label className="label-sm">Last Name</label><Input placeholder="Smith" value={form.lname} onChange={(e) => set('lname', e.target.value)} className="bg-white border-border shadow-sm" required /></div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">Gender</label>
                  <select value={form.gender} onChange={(e) => set('gender', e.target.value)} className="w-full h-10 px-3 rounded-lg bg-white border border-border text-foreground text-sm shadow-sm" required>
                    <option value="">Select Gender</option>
                    {['Male','Female','Other'].map((g) => <option key={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">Date of Birth</label>
                  <Input type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} className="bg-white border-border shadow-sm" required />
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground mb-6">Contact Information</h3>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">Country</label>
                  <select value={form.country} onChange={(e) => set('country', e.target.value)} className="w-full h-10 px-3 rounded-lg bg-white border border-border text-foreground text-sm shadow-sm" required>
                    <option value="">Select Country</option>
                    {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-2">Email Address</label><Input type="email" placeholder="john@example.com" value={form.email} onChange={(e) => set('email', e.target.value)} className="bg-white border-border shadow-sm" required /></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-2">Phone Number</label><Input placeholder="+1 234 567 890" value={form.phone} onChange={(e) => set('phone', e.target.value)} className="bg-white border-border shadow-sm" required /></div>
              </div>
            )}

            {/* Step 3 */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground mb-6">Account Setup & KYC</h3>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">Account Currency</label>
                  <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className="w-full h-10 px-3 rounded-lg bg-white border border-border text-foreground text-sm shadow-sm">
                    {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">Account Type</label>
                  <select value={form.account_type} onChange={(e) => set('account_type', e.target.value)} className="w-full h-10 px-3 rounded-lg bg-secondary border border-border text-foreground text-sm capitalize">
                    {ACCOUNT_TYPES.map((t) => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">Preferred Branch</label>
                  <select value={form.branch} onChange={(e) => set('branch', e.target.value)} className="w-full h-10 px-3 rounded-lg bg-white border border-border text-foreground text-sm shadow-sm" required>
                    <option value="">Select Branch</option>
                    {BRANCHES.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">ID Card Type</label>
                  <select value={form.id_card_type} onChange={(e) => set('id_card_type', e.target.value)} className="w-full h-10 px-3 rounded-lg bg-white border border-border text-foreground text-sm shadow-sm" required>
                    <option value="">Select ID Type</option>
                    {ID_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {[['Front', frontFile, setFrontFile], ['Back', backFile, setBackFile]].map(([label, file, setter]) => (
                  <div key={label as string}>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2">ID Card {label as string}</label>
                    <label className={cn('flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed cursor-pointer transition-colors', (file as File) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-white')}>
                      <input type="file" className="sr-only" accept="image/*,application/pdf" onChange={(e) => (setter as React.Dispatch<React.SetStateAction<File | null>>)(e.target.files?.[0] ?? null)} />
                      {(file as File) ? <><Check className="w-6 h-6 text-primary mb-1" /><span className="text-xs text-primary">{(file as File).name}</span></> : <><Upload className="w-6 h-6 text-muted-foreground mb-1" /><span className="text-xs text-muted-foreground">Click to upload</span></>}
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* Step 4 */}
            {step === 3 && (
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-foreground mb-6">Security Setup</h3>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-2">Username</label><Input placeholder="johnsmith" value={form.username} onChange={(e) => set('username', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} className="bg-white border-border shadow-sm" required /></div>
                <div><label className="block text-xs font-semibold text-muted-foreground mb-2">Password</label><Input type="password" placeholder="••••••••" value={form.password} onChange={(e) => set('password', e.target.value)} className="bg-white border-border shadow-sm" required /></div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">4-Digit Login PIN</label>
                  <Input type="password" placeholder="••••" maxLength={4} inputMode="numeric" pattern="[0-9]{4}" value={form.login_pin} onChange={(e) => set('login_pin', e.target.value.replace(/\D/g, '').slice(0, 4))} className="bg-white border-border tracking-widest text-center text-xl shadow-sm" required />
                  <p className="text-xs text-muted-foreground mt-1">This PIN is used to log in to your account.</p>
                </div>
                <div className="flex items-start gap-3 mt-2">
                  <input type="checkbox" id="agree" checked={form.agree} onChange={(e) => set('agree', e.target.checked)} className="mt-1 accent-primary" />
                  <label htmlFor="agree" className="text-xs text-muted-foreground">
                    I agree to the{' '}
                    <a href="#" className="text-primary hover:underline">User Agreement</a> and{' '}
                    <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 gap-3">
              {step > 0 ? (
                <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)} className="border border-border text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              ) : <div />}
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 px-8">
                {step < 3 ? <><span>Next Step</span><ChevronRight className="w-4 h-4 ml-1" /></> : loading ? 'Creating...' : 'Create Account'}
              </Button>
            </div>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account? <Link to="/login" className="text-primary hover:underline font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
