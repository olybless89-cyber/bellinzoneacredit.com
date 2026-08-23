import { supabase } from '@/db/supabase';
import type { BankAccount, Transaction, Investment, Profile, CardRequest, AppNotification, MailMessage, TransferDetails } from '@/types';

// Tables/columns from migration 00006 may not exist in the live DB yet.
// Missing-schema errors must degrade gracefully instead of breaking the app.
function isMissingSchemaError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  if (e.code === '42P01' || e.code === '42703' || e.code === 'PGRST205' || e.code === 'PGRST204') return true;
  const msg = (e.message || '').toLowerCase();
  return msg.includes('does not exist') || msg.includes('could not find') || msg.includes('schema cache');
}

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
  details?: TransferDetails;
  senderUserId?: string;
}) {
  const { fromAccountId, toAccountNumber, amount, description, details } = payload;

  // Enforce transfer blocks (per-user + global)
  const block = await getTransferBlockStatus(payload.senderUserId);
  if (block.blocked) throw new Error(block.reason || 'Transfers are currently disabled on this account');

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

  const methodLabels: Record<string, string> = {
    internal: 'Internal Transfer', ach: 'ACH Transfer', wire: 'Wire Transfer', international: 'International Wire',
  };
  const methodLabel = details ? methodLabels[details.method] || 'Fund Transfer' : 'Fund Transfer';

  // Record outgoing transaction
  const { error: txErr } = await supabase.from('transactions').insert({
    account_id: fromAccountId,
    type: 'transfer',
    status: 'completed',
    amount: -amount,
    currency: sender.currency,
    description: description || `${methodLabel} to ${details?.beneficiaryName || toAccountNumber}`,
    recipient_account: toAccountNumber,
    metadata: details ? { ...details, method_label: methodLabel } : {},
  });
  if (txErr) throw txErr;

  // Credit recipient if internal account
  const { data: recipient } = await supabase
    .from('bank_accounts')
    .select('id, user_id, balance, currency')
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

    notify(recipient.user_id, {
      title: 'Funds received',
      body: `Your account ${toAccountNumber} was credited ${sender.currency} ${amount.toFixed(2)} via incoming transfer.`,
      type: 'transaction',
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
    .select('balance, currency, user_id')
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

  notify(account.user_id, {
    title: 'Deposit successful',
    body: `${account.currency} ${amount.toFixed(2)} was deposited into your account. New balance: ${account.currency} ${(account.balance + amount).toFixed(2)}.`,
    type: 'transaction',
  });

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
    .select('balance, currency, user_id')
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

  notify(account.user_id, {
    title: 'Withdrawal successful',
    body: `${account.currency} ${amount.toFixed(2)} was withdrawn from your account. New balance: ${account.currency} ${(account.balance - amount).toFixed(2)}.`,
    type: 'transaction',
  });

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
    .select('balance, currency, user_id')
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

  notify(account.user_id, {
    title: 'Account credited',
    body: `${account.currency} ${amount.toFixed(2)} was credited to your account by the bank${description ? ` (${description})` : ''}. New balance: ${account.currency} ${(account.balance + amount).toFixed(2)}.`,
    type: 'transaction',
  });

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
  if (data) {
    notify(data.user_id, {
      title: `Card request ${status}`,
      body: `Your ${data.card_network} ${data.card_type} card request is now ${status}.${notes ? ` Note: ${notes}` : ''}`,
      type: status === 'completed' ? 'success' : status === 'pending' ? 'info' : 'warning',
    });
  }
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

// ─── Transfer Controls (per-user + global block) ─────────────────────────────

export async function getGlobalTransfersBlocked(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'transfers_blocked')
      .maybeSingle();
    if (error) {
      if (isMissingSchemaError(error)) return false;
      return false;
    }
    return data?.value === true;
  } catch {
    return false;
  }
}

export async function setGlobalTransfersBlocked(blocked: boolean): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .upsert({ key: 'transfers_blocked', value: blocked, updated_at: new Date().toISOString() });
  if (error) {
    if (isMissingSchemaError(error)) throw new Error('Database migration 00006 has not been applied yet. Run it in the Supabase SQL Editor first.');
    throw error;
  }
}

export async function setUserTransfersBlocked(userId: string, blocked: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ transfers_blocked: blocked })
    .eq('id', userId);
  if (error) {
    if (isMissingSchemaError(error)) throw new Error('Database migration 00006 has not been applied yet. Run it in the Supabase SQL Editor first.');
    throw error;
  }
  notify(userId, {
    title: blocked ? 'Transfers restricted' : 'Transfers restored',
    body: blocked
      ? 'Outgoing transfers from your account have been temporarily disabled. Please contact support for more information.'
      : 'Outgoing transfers from your account have been re-enabled.',
    type: 'security',
  });
}

export async function getTransferBlockStatus(userId?: string): Promise<{ blocked: boolean; reason: string | null }> {
  const globalBlocked = await getGlobalTransfersBlocked();
  if (globalBlocked) {
    return { blocked: true, reason: 'All outgoing transfers are temporarily suspended by the bank. Please try again later or contact support.' };
  }
  if (userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('transfers_blocked')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data?.transfers_blocked) {
      return { blocked: true, reason: 'Transfers from your account are currently restricted. Please contact support.' };
    }
  }
  return { blocked: false, reason: null };
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function notify(
  userId: string,
  payload: { title: string; body?: string; type?: AppNotification['type']; metadata?: Record<string, unknown> }
): Promise<void> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title: payload.title,
      body: payload.body || null,
      type: payload.type || 'info',
      metadata: payload.metadata || {},
    });
    if (error && !isMissingSchemaError(error)) console.warn('notify failed', error);
  } catch {
    // notifications are best-effort
  }
}

export async function getNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (!isMissingSchemaError(error)) console.warn('getNotifications failed', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error && !isMissingSchemaError(error)) console.warn('markNotificationRead failed', error);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error && !isMissingSchemaError(error)) console.warn('markAllNotificationsRead failed', error);
}

// ─── Built-in Mail (website's own message system) ────────────────────────────

export async function getAdminProfiles(): Promise<{ id: string; first_name: string | null; last_name: string | null; username: string | null }[]> {
  // public_profiles is an RLS-bypassing view readable by everyone
  const { data, error } = await supabase
    .from('public_profiles')
    .select('id, first_name, last_name, username')
    .eq('role', 'admin');
  if (error) return [];
  return Array.isArray(data) ? data : [];
}

export async function getInbox(userId: string): Promise<MailMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    if (!isMissingSchemaError(error)) console.warn('getInbox failed', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function getSentMessages(userId: string): Promise<MailMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('sender_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    if (!isMissingSchemaError(error)) console.warn('getSentMessages failed', error);
    return [];
  }
  return Array.isArray(data) ? data : [];
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);
  if (error) return 0;
  return count || 0;
}

export async function sendMailMessage(payload: {
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
}): Promise<void> {
  const { error } = await supabase.from('messages').insert({
    sender_id: payload.senderId,
    recipient_id: payload.recipientId,
    subject: payload.subject,
    body: payload.body,
  });
  if (error) {
    if (isMissingSchemaError(error)) throw new Error('Database migration 00006 has not been applied yet. Run it in the Supabase SQL Editor first.');
    throw error;
  }
  notify(payload.recipientId, {
    title: `New message: ${payload.subject}`,
    body: 'You have a new secure message. Open Messages to read it.',
    type: 'message',
  });
}

export async function markMessageRead(id: string): Promise<void> {
  const { error } = await supabase.from('messages').update({ is_read: true }).eq('id', id);
  if (error && !isMissingSchemaError(error)) console.warn('markMessageRead failed', error);
}

// Admin: fetch profiles for the recipient picker / name resolution
export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  if (error) return [];
  return Array.isArray(data) ? data : [];
}
