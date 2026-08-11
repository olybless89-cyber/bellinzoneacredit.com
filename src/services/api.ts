import { supabase } from '@/db/supabase';
import type { BankAccount, Transaction, Investment, Profile, CardRequest } from '@/types';

// ─── Profiles ───────────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Bank Accounts ───────────────────────────────────────────────────────────

export async function getUserAccounts(userId: string): Promise<BankAccount[]> {
  const { data } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  return Array.isArray(data) ? data : [];
}

export async function createBankAccount(payload: {
  user_id: string;
  account_type: string;
  currency: string;
  branch?: string;
}): Promise<BankAccount | null> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .insert(payload)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Transactions ────────────────────────────────────────────────────────────

export async function getAccountTransactions(
  accountId: string,
  limit = 20,
  cursor?: string
): Promise<Transaction[]> {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data } = await query;
  return Array.isArray(data) ? data : [];
}

export async function getUserTransactions(
  userId: string,
  limit = 20,
  cursor?: string
): Promise<Transaction[]> {
  // Get all account IDs for the user first
  const { data: accounts } = await supabase
    .from('bank_accounts')
    .select('id')
    .eq('user_id', userId);

  if (!accounts || accounts.length === 0) return [];
  const accountIds = accounts.map((a) => a.id);

  let query = supabase
    .from('transactions')
    .select('*')
    .in('account_id', accountIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data } = await query;
  return Array.isArray(data) ? data : [];
}

export async function createTransaction(payload: {
  account_id: string;
  type: string;
  amount: number;
  currency?: string;
  description?: string;
  recipient_account?: string;
}): Promise<Transaction | null> {
  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...payload, status: 'completed' })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function transferFunds(payload: {
  fromAccountId: string;
  toAccountNumber: string;
  amount: number;
  description?: string;
}) {
  const { fromAccountId, toAccountNumber, amount, description } = payload;

  // Check sender balance
  const { data: sender, error: senderErr } = await supabase
    .from('bank_accounts')
    .select('balance, currency')
    .eq('id', fromAccountId)
    .maybeSingle();

  if (senderErr || !sender) throw new Error('Account not found');
  if (sender.balance < amount) throw new Error('Insufficient funds');

  // Debit sender
  const { error: debitErr } = await supabase
    .from('bank_accounts')
    .update({ balance: sender.balance - amount })
    .eq('id', fromAccountId);
  if (debitErr) throw debitErr;

  // Record outgoing transaction
  const { error: txErr } = await supabase.from('transactions').insert({
    account_id: fromAccountId,
    type: 'transfer',
    status: 'completed',
    amount: -amount,
    currency: sender.currency,
    description: description || 'Fund Transfer',
    recipient_account: toAccountNumber,
  });
  if (txErr) throw txErr;

  // Credit recipient if internal account
  const { data: recipient } = await supabase
    .from('bank_accounts')
    .select('id, balance, currency')
    .eq('account_number', toAccountNumber)
    .maybeSingle();

  if (recipient) {
    await supabase
      .from('bank_accounts')
      .update({ balance: recipient.balance + amount })
      .eq('id', recipient.id);

    await supabase.from('transactions').insert({
      account_id: recipient.id,
      type: 'deposit',
      status: 'completed',
      amount,
      currency: recipient.currency,
      description: description || 'Incoming Transfer',
    });
  }

  return { success: true };
}

// ─── Deposit (user funds own account) ─────────────────────────────────────────

export async function depositFunds(payload: {
  accountId: string;
  amount: number;
  description?: string;
}) {
  const { accountId, amount, description } = payload;
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  const { data: account, error: accErr } = await supabase
    .from('bank_accounts')
    .select('balance, currency')
    .eq('id', accountId)
    .maybeSingle();
  if (accErr || !account) throw new Error('Account not found');

  const { error: balErr } = await supabase
    .from('bank_accounts')
    .update({ balance: account.balance + amount })
    .eq('id', accountId);
  if (balErr) throw balErr;

  const { error: txErr } = await supabase.from('transactions').insert({
    account_id: accountId,
    type: 'deposit',
    status: 'completed',
    amount,
    currency: account.currency,
    description: description || 'Deposit',
  });
  if (txErr) throw txErr;

  return { success: true };
}

// ─── Withdrawal (user debits own account) ─────────────────────────────────────

export async function withdrawFunds(payload: {
  accountId: string;
  amount: number;
  description?: string;
  recipient_account?: string;
}) {
  const { accountId, amount, description, recipient_account } = payload;
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  const { data: account, error: accErr } = await supabase
    .from('bank_accounts')
    .select('balance, currency')
    .eq('id', accountId)
    .maybeSingle();
  if (accErr || !account) throw new Error('Account not found');
  if (account.balance < amount) throw new Error('Insufficient funds');

  const { error: balErr } = await supabase
    .from('bank_accounts')
    .update({ balance: account.balance - amount })
    .eq('id', accountId);
  if (balErr) throw balErr;

  const { error: txErr } = await supabase.from('transactions').insert({
    account_id: accountId,
    type: 'withdrawal',
    status: 'completed',
    amount: -amount,
    currency: account.currency,
    description: description || 'Withdrawal',
    recipient_account: recipient_account || null,
  });
  if (txErr) throw txErr;

  return { success: true };
}

// ─── Admin: credit a user account (add balance) ──────────────────────────────

export async function adminCreditAccount(payload: {
  accountId: string;
  amount: number;
  description?: string;
}) {
  const { accountId, amount, description } = payload;
  if (amount <= 0) throw new Error('Amount must be greater than zero');

  const { data: account, error: accErr } = await supabase
    .from('bank_accounts')
    .select('balance, currency')
    .eq('id', accountId)
    .maybeSingle();
  if (accErr || !account) throw new Error('Account not found');

  const { error: balErr } = await supabase
    .from('bank_accounts')
    .update({ balance: account.balance + amount })
    .eq('id', accountId);
  if (balErr) throw balErr;

  const { error: txErr } = await supabase.from('transactions').insert({
    account_id: accountId,
    type: 'deposit',
    status: 'completed',
    amount,
    currency: account.currency,
    description: description || 'Admin Credit',
  });
  if (txErr) throw txErr;

  return { success: true };
}

// ─── Investments ─────────────────────────────────────────────────────────────

export async function getUserInvestments(userId: string): Promise<Investment[]> {
  const { data } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return Array.isArray(data) ? data : [];
}

export async function createInvestment(payload: {
  user_id: string;
  plan_name: string;
  amount: number;
  roi_percent: number;
  roi_type: string;
  duration_days: number;
}): Promise<Investment | null> {
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + payload.duration_days);
  const { data, error } = await supabase
    .from('investments')
    .insert({ ...payload, ends_at: endsAt.toISOString() })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ─── Contact ──────────────────────────────────────────────────────────────────

export async function submitContactMessage(payload: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}) {
  const { error } = await supabase.from('contact_messages').insert(payload);
  if (error) throw error;
}

export async function subscribeNewsletter(email: string) {
  const { error } = await supabase.from('newsletter_subscribers').insert({ email });
  if (error && error.code !== '23505') throw error; // ignore duplicate
}

// ─── Debit Card Requests ─────────────────────────────────────────────────────

export async function getUserCardRequests(userId: string): Promise<CardRequest[]> {
  const { data } = await supabase
    .from('card_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return Array.isArray(data) ? data : [];
}

export async function requestDebitCard(payload: {
  user_id: string;
  account_id: string;
  card_type?: string;
  card_network?: string;
  delivery_address?: string;
}): Promise<CardRequest | null> {
  const { data, error } = await supabase
    .from('card_requests')
    .insert({
      user_id: payload.user_id,
      account_id: payload.account_id,
      card_type: payload.card_type || 'debit',
      card_network: payload.card_network || 'Visa',
      delivery_address: payload.delivery_address || null,
      status: 'pending',
    })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateCardRequestStatus(
  requestId: string,
  status: 'pending' | 'completed' | 'failed' | 'cancelled',
  notes?: string
) {
  const updates: Record<string, unknown> = { status };
  if (notes !== undefined) updates.notes = notes;
  const { data, error } = await supabase
    .from('card_requests')
    .update(updates)
    .eq('id', requestId)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAllCardRequests(): Promise<(CardRequest & { username: string | null; first_name: string | null })[]> {
  const { data } = await supabase
    .from('card_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (!Array.isArray(data)) return [];
  const enriched = await Promise.all(
    data.map(async (cr) => {
      const { data: acc } = await supabase
        .from('bank_accounts')
        .select('user_id')
        .eq('id', cr.account_id)
        .maybeSingle();
      const userId = acc?.user_id;
      if (!userId) return { ...cr, username: null, first_name: null };
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, first_name')
        .eq('id', userId)
        .maybeSingle();
      return { ...cr, username: profile?.username || null, first_name: profile?.first_name || null };
    })
  );
  return enriched;
}
