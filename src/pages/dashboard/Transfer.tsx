import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowUpRight, Ban, Eye, EyeOff, Info, KeyRound, Landmark, MailWarning, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { getTransferBlockStatus, getUserAccounts, notify, setUserTransferPin, transferFunds } from '@/services/api';
import type { BankAccount, TransferMethod } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Stage = 'form' | 'confirm' | 'pin' | 'tpin' | 'cot';

const METHODS: { value: TransferMethod; label: string; eta: string; fee: number }[] = [
  { value: 'internal', label: 'Internal Transfer (within Bellinzone A Credit)', eta: 'Instant', fee: 0 },
  { value: 'ach', label: 'ACH Transfer (US banks)', eta: '1–3 business days', fee: 0 },
  { value: 'wire', label: 'Domestic Wire Transfer', eta: 'Same business day', fee: 15 },
  { value: 'international', label: 'International Wire (SWIFT)', eta: '1–5 business days', fee: 25 },
];

function PinBoxes({
  pin, setPin, show, error, autoFocus,
}: {
  pin: string[];
  setPin: (p: string[]) => void;
  show: boolean;
  error: string;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (autoFocus) setTimeout(() => refs.current[0]?.focus(), 100);
  }, [autoFocus]);

  return (
    <div className="flex gap-4 justify-center mb-2">
      {pin.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type={show ? 'text' : 'password'}
          maxLength={1}
          value={d}
          onChange={(e) => {
            const val = e.target.value;
            if (!/^\d?$/.test(val)) return;
            const next = [...pin]; next[i] = val; setPin(next);
            if (val && i < 3) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !pin[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          className={cn(
            'w-14 h-16 rounded-xl border-2 text-center text-2xl font-bold bg-white text-foreground outline-none transition-all shadow-sm',
            d ? 'border-primary' : 'border-border',
            'focus:border-primary focus:ring-2 focus:ring-primary/20',
            error && 'border-destructive'
          )}
          inputMode="numeric"
        />
      ))}
    </div>
  );
}

export default function TransferPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<Stage>('form');
  const [blockReason, setBlockReason] = useState<string | null>(null);
  const navigate = useNavigate();

  const [fromId, setFromId] = useState('');
  const [method, setMethod] = useState<TransferMethod>('internal');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [swiftCode, setSwiftCode] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // Login PIN state
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');

  // Transfer PIN state (create mode when the user has none set)
  const [tpin, setTpin] = useState(['', '', '', '']);
  const [tpinConfirm, setTpinConfirm] = useState(['', '', '', '']);
  const [showTpin, setShowTpin] = useState(false);
  const [tpinError, setTpinError] = useState('');

  // COT state
  const [cot, setCot] = useState('');
  const [cotError, setCotError] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getUserAccounts(user.id).then((data) => {
        setAccounts(data);
        if (data[0]) setFromId(data[0].id);
      }),
      getTransferBlockStatus(user.id).then((s) => setBlockReason(s.blocked ? s.reason : null)),
    ]).finally(() => setLoading(false));
  }, [user]);

  const fromAccount = accounts.find((a) => a.id === fromId);
  const selectedMethod = METHODS.find((m) => m.value === method) || METHODS[0];
  const amountNum = parseFloat(amount) || 0;
  const fee = selectedMethod.fee;
  const totalDebit = amountNum + fee;
  const routingRequired = method === 'ach' || method === 'wire';
  const needsBankDetails = method !== 'internal';
  const hasTransferPin = !!profile?.transfer_pin;

  const routingValid = !routingRequired || /^\d{9}$/.test(routingNumber.trim());
  const detailsValid =
    beneficiaryName.trim().length > 1 &&
    toAccount.trim().length >= 4 &&
    (!needsBankDetails || bankName.trim().length > 1) &&
    routingValid &&
    (method !== 'international' || swiftCode.trim().length >= 8);

  const isValid =
    !blockReason &&
    fromId &&
    detailsValid &&
    amountNum > 0 &&
    fromAccount &&
    totalDebit <= fromAccount.balance;

  // Step 1: form → confirm
  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    // Re-check block status right before continuing
    const status = await getTransferBlockStatus(user.id);
    if (status.blocked) {
      setBlockReason(status.reason);
      toast.error(status.reason || 'Transfers are currently disabled');
      return;
    }
    if (!isValid) return;
    setStage('confirm');
  };

  // Step 2: confirm → login PIN
  const handleConfirm = () => setStage('pin');

  // Step 3: verify login PIN → transfer PIN stage
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredPin = pin.join('');
    if (enteredPin.length < 4) { setPinError('Enter your 4-digit PIN'); return; }

    if (profile?.login_pin !== enteredPin) {
      setPinError('Incorrect login PIN. Please try again.');
      setPin(['', '', '', '']);
      return;
    }
    setPinError('');
    setStage('tpin');
  };

  // Step 4: transfer PIN — verify existing, or create one on first use → COT stage
  const handleTpinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const entered = tpin.join('');
    if (entered.length < 4) { setTpinError('Enter your 4-digit transfer PIN'); return; }

    if (hasTransferPin) {
      if (profile?.transfer_pin !== entered) {
        setTpinError('Incorrect transfer PIN. Please try again.');
        setTpin(['', '', '', '']);
        return;
      }
    } else {
      const confirm = tpinConfirm.join('');
      if (confirm.length < 4) { setTpinError('Confirm your new transfer PIN'); return; }
      if (entered !== confirm) {
        setTpinError('PINs do not match. Try again.');
        setTpin(['', '', '', '']);
        setTpinConfirm(['', '', '', '']);
        return;
      }
      if (entered === profile?.login_pin) {
        setTpinError('Transfer PIN must be different from your login PIN.');
        setTpin(['', '', '', '']);
        setTpinConfirm(['', '', '', '']);
        return;
      }
      try {
        await setUserTransferPin(user.id, entered);
        await refreshProfile();
        toast.success('Transfer PIN created');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Failed to save transfer PIN');
        return;
      }
    }
    setTpinError('');
    setStage('cot');
  };

  // Step 5: verify COT code → execute transfer
  const handleCotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCot = cot.trim().toUpperCase();
    if (!enteredCot) { setCotError('Enter your COT code'); return; }

    if (!profile?.cot_code) {
      setCotError('No COT code has been issued for your account yet. Request one from support via Secure Mail.');
      return;
    }
    if (profile.cot_code.trim().toUpperCase() !== enteredCot) {
      setCotError('Invalid COT code. Check the code sent by the bank and try again.');
      setCot('');
      return;
    }

    setCotError('');
    setSubmitting(true);
    try {
      await transferFunds({
        fromAccountId: fromId,
        toAccountNumber: toAccount.trim(),
        amount: totalDebit,
        description: description || undefined,
        senderUserId: user?.id,
        details: {
          beneficiaryName: beneficiaryName.trim(),
          bankName: needsBankDetails ? bankName.trim() : 'Bellinzone A Credit',
          routingNumber: routingNumber.trim(),
          swiftCode: method === 'international' ? swiftCode.trim() : undefined,
          method,
          reference: description.trim() || undefined,
        },
      });
      toast.success(`${fromAccount?.currency || '$'}${amountNum.toFixed(2)} sent to ${beneficiaryName.trim()}!`);

      if (user) {
        notify(user.id, {
          title: 'Transfer sent',
          body: `${fromAccount?.currency || 'USD'} ${amountNum.toFixed(2)} ${selectedMethod.label.split(' (')[0].toLowerCase()} to ${beneficiaryName.trim()} (${toAccount.trim()}) was completed successfully.`,
          type: 'transaction',
        });
      }

      navigate('/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Transfer failed');
      setStage('confirm');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="space-y-4 max-w-xl"><Skeleton className="h-12 rounded-xl" /><Skeleton className="h-64 rounded-2xl" /></div>;

  const labelCls = 'block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2';
  const inputCls = 'bg-white border-border shadow-sm h-12';

  const stepIndex = { form: 1, confirm: 2, pin: 3, tpin: 3, cot: 3 }[stage];

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Fund Transfer</h1>
        <p className="text-muted-foreground text-sm mt-1">Send money securely — verified with your login PIN, transfer PIN and COT code</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        {['Details', 'Review', 'Verify & Send'].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center border',
              stepIndex > i ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'
            )}>
              {i + 1}
            </span>
            <span className={stepIndex > i ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
            {i < 2 && <span className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      {blockReason && (
        <div className="glass-card rounded-2xl p-5 border border-destructive/40 bg-destructive/5 flex items-start gap-3">
          <Ban className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-destructive text-sm">Transfers Unavailable</h3>
            <p className="text-muted-foreground text-sm mt-1">{blockReason}</p>
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center border border-dashed border-border">
          <h3 className="font-semibold text-foreground mb-2">No Accounts Available</h3>
          <p className="text-muted-foreground text-sm">You need at least one account to make transfers.</p>
        </div>
      ) : (
        <>
          {/* ── STAGE 1: Form ── */}
          {stage === 'form' && (
            <form onSubmit={handleReview} className="glass-card rounded-2xl p-8 border border-border space-y-6">
              <div>
                <label className={labelCls}>From Account</label>
                <select value={fromId} onChange={(e) => setFromId(e.target.value)} className="w-full h-12 px-4 rounded-xl bg-muted border border-border text-foreground text-sm">
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.account_number} — {a.currency} {a.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({a.account_type})
                    </option>
                  ))}
                </select>
                {fromAccount && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Info className="w-3 h-3" />
                    Available: {fromAccount.currency} {fromAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Transfer Method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value as TransferMethod)} className="w-full h-12 px-4 rounded-xl bg-muted border border-border text-foreground text-sm">
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} — {m.eta}{m.fee > 0 ? ` (${m.fee.toFixed(2)} fee)` : ' (free)'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Landmark className="w-4 h-4 text-primary" />
                  Beneficiary Details
                </div>

                <div>
                  <label className={labelCls}>Beneficiary Full Name</label>
                  <Input placeholder="e.g. John A. Smith" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} className={inputCls} required />
                </div>

                <div>
                  <label className={labelCls}>Beneficiary Account Number / IBAN</label>
                  <Input placeholder={method === 'internal' ? 'e.g. BZC0012345678' : 'e.g. 000123456789'} value={toAccount} onChange={(e) => setToAccount(e.target.value)} className={cn(inputCls, 'font-mono')} required />
                </div>

                {needsBankDetails && (
                  <div>
                    <label className={labelCls}>Beneficiary Bank Name</label>
                    <Input placeholder="e.g. Chase Bank, HSBC, Barclays" value={bankName} onChange={(e) => setBankName(e.target.value)} className={inputCls} required />
                  </div>
                )}

                {(routingRequired || method === 'international') && (
                  <div>
                    <label className={labelCls}>Routing Number (ABA){routingRequired ? '' : ' — if available'}</label>
                    <Input placeholder="9-digit routing number" value={routingNumber} onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))} className={cn(inputCls, 'font-mono')} inputMode="numeric" required={routingRequired} />
                    {routingNumber && !routingValid && (
                      <p className="text-xs text-destructive mt-1">Routing number must be exactly 9 digits</p>
                    )}
                  </div>
                )}

                {method === 'international' && (
                  <div>
                    <label className={labelCls}>SWIFT / BIC Code</label>
                    <Input placeholder="e.g. CHASUS33XXX" value={swiftCode} onChange={(e) => setSwiftCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))} className={cn(inputCls, 'font-mono')} required />
                    {swiftCode && swiftCode.trim().length < 8 && (
                      <p className="text-xs text-destructive mt-1">SWIFT/BIC must be 8–11 characters</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className={labelCls}>Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                    {fromAccount?.currency || '$'}
                  </span>
                  <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className={cn(inputCls, 'pl-12 text-lg font-semibold')} required />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Fee: {fromAccount?.currency || '$'}{fee.toFixed(2)} · Arrival: {selectedMethod.eta}</span>
                  {amountNum > 0 && <span className="font-semibold text-foreground">Total debit: {fromAccount?.currency || '$'}{totalDebit.toFixed(2)}</span>}
                </div>
                {amountNum > 0 && fromAccount && totalDebit > fromAccount.balance && (
                  <p className="text-xs text-destructive mt-1">Insufficient funds (amount + fee)</p>
                )}
              </div>

              <div>
                <label className={labelCls}>Reference / Description (Optional)</label>
                <Input placeholder="e.g. Monthly rent, Invoice #123" value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} />
              </div>

              <Button type="submit" disabled={!isValid} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base">
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Review Transfer
              </Button>
            </form>
          )}

          {/* ── STAGE 2: Confirm ── */}
          {stage === 'confirm' && (
            <div className="glass-card rounded-2xl p-8 border border-border space-y-6">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">Review Transfer</h2>
                <p className="text-muted-foreground text-sm mt-1">Please confirm the beneficiary details before proceeding</p>
              </div>

              <div className="rounded-xl bg-muted border border-border divide-y divide-border text-sm">
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">From</span>
                  <span className="font-semibold text-foreground font-mono">{fromAccount?.account_number}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Transfer Method</span>
                  <span className="font-semibold text-foreground">{selectedMethod.label.split(' (')[0]}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Beneficiary Name</span>
                  <span className="font-semibold text-foreground">{beneficiaryName.trim()}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Account Number</span>
                  <span className="font-semibold text-foreground font-mono">{toAccount.trim()}</span>
                </div>
                {needsBankDetails && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-muted-foreground">Beneficiary Bank</span>
                    <span className="font-semibold text-foreground">{bankName.trim()}</span>
                  </div>
                )}
                {routingNumber.trim() && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-muted-foreground">Routing Number</span>
                    <span className="font-semibold text-foreground font-mono">{routingNumber.trim()}</span>
                  </div>
                )}
                {method === 'international' && swiftCode.trim() && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-muted-foreground">SWIFT / BIC</span>
                    <span className="font-semibold text-foreground font-mono">{swiftCode.trim()}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-foreground">
                    {fromAccount?.currency} {amountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Transfer Fee</span>
                  <span className="font-semibold text-foreground">{fromAccount?.currency} {fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Total Debit</span>
                  <span className="font-bold text-base text-primary">
                    {fromAccount?.currency} {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between px-4 py-3">
                  <span className="text-muted-foreground">Estimated Arrival</span>
                  <span className="font-semibold text-foreground">{selectedMethod.eta}</span>
                </div>
                {description && (
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-muted-foreground">Reference</span>
                    <span className="font-semibold text-foreground">{description}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={handleConfirm} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base">
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Proceed to Verification
                </Button>
                <Button type="button" variant="ghost" onClick={() => setStage('form')} className="w-full border border-border text-muted-foreground">
                  ← Edit Details
                </Button>
              </div>
            </div>
          )}

          {/* ── STAGE 3a: Login PIN ── */}
          {stage === 'pin' && (
            <form onSubmit={handlePinSubmit} className="glass-card rounded-2xl p-8 border border-border space-y-6 text-center">
              <div>
                <div className="w-14 h-14 rounded-full bg-primary/10 border-4 border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-extrabold text-foreground">Verify Your Login PIN</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Step 1 of 3 — enter your 4-digit login PIN to send{' '}
                  <span className="font-semibold text-foreground">
                    {fromAccount?.currency} {amountNum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>{' '}
                  to <span className="font-semibold text-foreground">{beneficiaryName.trim()}</span>
                </p>
              </div>

              <div>
                <PinBoxes pin={pin} setPin={setPin} show={showPin} error={pinError} autoFocus />
                <button type="button" onClick={() => setShowPin(!showPin)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mx-auto transition-colors mt-2">
                  {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showPin ? 'Hide' : 'Show'} PIN
                </button>
                {pinError && <p className="text-xs text-destructive mt-2">{pinError}</p>}
              </div>

              <div className="flex flex-col gap-3">
                <Button type="submit" disabled={pin.join('').length < 4} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base">
                  Continue
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setStage('confirm'); setPin(['', '', '', '']); setPinError(''); }} className="w-full border border-border text-muted-foreground">
                  ← Back
                </Button>
              </div>
            </form>
          )}

          {/* ── STAGE 3b: Transfer PIN ── */}
          {stage === 'tpin' && (
            <form onSubmit={handleTpinSubmit} className="glass-card rounded-2xl p-8 border border-border space-y-6 text-center">
              <div>
                <div className="w-14 h-14 rounded-full bg-primary/10 border-4 border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <KeyRound className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-extrabold text-foreground">
                  {hasTransferPin ? 'Enter Your Transfer PIN' : 'Create Your Transfer PIN'}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {hasTransferPin
                    ? 'Step 2 of 3 — enter the 4-digit transfer PIN for this account'
                    : 'Step 2 of 3 — set a 4-digit transfer PIN (different from your login PIN). You will use it to authorize all future transfers.'}
                </p>
              </div>

              <div>
                {!hasTransferPin && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">New Transfer PIN</p>
                )}
                <PinBoxes pin={tpin} setPin={setTpin} show={showTpin} error={tpinError} autoFocus />
                {!hasTransferPin && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4">Confirm Transfer PIN</p>
                    <PinBoxes pin={tpinConfirm} setPin={setTpinConfirm} show={showTpin} error={tpinError} />
                  </>
                )}
                <button type="button" onClick={() => setShowTpin(!showTpin)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mx-auto transition-colors mt-2">
                  {showTpin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {showTpin ? 'Hide' : 'Show'} PIN
                </button>
                {tpinError && <p className="text-xs text-destructive mt-2">{tpinError}</p>}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={tpin.join('').length < 4 || (!hasTransferPin && tpinConfirm.join('').length < 4)}
                  className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base"
                >
                  Continue
                </Button>
                <Button type="button" variant="ghost" onClick={() => { setStage('pin'); setTpin(['', '', '', '']); setTpinConfirm(['', '', '', '']); setTpinError(''); }} className="w-full border border-border text-muted-foreground">
                  ← Back
                </Button>
              </div>
            </form>
          )}

          {/* ── STAGE 3c: COT code ── */}
          {stage === 'cot' && (
            <form onSubmit={handleCotSubmit} className="glass-card rounded-2xl p-8 border border-border space-y-6 text-center">
              <div>
                <div className="w-14 h-14 rounded-full bg-primary/10 border-4 border-primary/30 flex items-center justify-center mx-auto mb-4">
                  <MailWarning className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-extrabold text-foreground">Cost of Transfer (COT) Code</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Step 3 of 3 — enter the COT code issued by the bank to authorize this transfer of{' '}
                  <span className="font-semibold text-foreground">
                    {fromAccount?.currency} {totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </p>
              </div>

              {profile?.cot_code ? (
                <div>
                  <Input
                    placeholder="e.g. X7K9P2QD"
                    value={cot}
                    onChange={(e) => { setCot(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)); setCotError(''); }}
                    className="bg-white border-border shadow-sm h-14 text-center text-xl font-mono tracking-[0.3em] font-bold max-w-xs mx-auto"
                    autoFocus
                  />
                  {cotError && <p className="text-xs text-destructive mt-2">{cotError}</p>}
                  <p className="text-xs text-muted-foreground mt-3">
                    Your COT code was sent to you via Secure Mail.{' '}
                    <Link to="/dashboard/messages" className="text-primary font-semibold hover:underline">Open Secure Mail</Link>
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5 text-left space-y-3">
                  <p className="text-sm text-foreground font-semibold">No COT code issued yet</p>
                  <p className="text-sm text-muted-foreground">
                    A Cost of Transfer code is required to complete outgoing transfers. Request your COT code from
                    customer support — it will be delivered to you via Secure Mail.
                  </p>
                  <Link to="/dashboard/messages">
                    <Button type="button" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      Request COT Code via Secure Mail
                    </Button>
                  </Link>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {profile?.cot_code && (
                  <Button type="submit" disabled={submitting || !cot.trim()} className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 text-base">
                    {submitting ? 'Processing...' : 'Confirm & Send'}
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={() => { setStage('tpin'); setCot(''); setCotError(''); }} className="w-full border border-border text-muted-foreground">
                  ← Back
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
