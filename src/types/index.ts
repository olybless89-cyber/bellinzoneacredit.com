import type React from 'react';

export interface Option {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  withCount?: boolean;
}

export type UserRole = 'user' | 'admin';
export type AccountType = 'savings' | 'checking' | 'corporate' | 'student' | 'joint' | 'fixed';
export type TransactionType = 'deposit' | 'withdrawal' | 'transfer' | 'interest';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type InvestmentStatus = 'active' | 'completed' | 'cancelled';
export type KycStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  gender: string | null;
  dob: string | null;
  country: string | null;
  login_pin: string | null;
  avatar_url: string | null;
  transfers_blocked?: boolean;
  transfer_pin?: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  account_number: string;
  account_type: AccountType;
  currency: string;
  balance: number;
  branch: string | null;
  apy: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  currency: string;
  description: string | null;
  recipient_account: string | null;
  reference: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  plan_name: string;
  amount: number;
  roi_percent: number;
  roi_type: string;
  duration_days: number;
  status: InvestmentStatus;
  started_at: string;
  ends_at: string | null;
  created_at: string;
}

export interface KycDocument {
  id: string;
  user_id: string;
  id_card_type: string;
  front_url: string | null;
  back_url: string | null;
  status: KycStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CardRequest {
  id: string;
  user_id: string;
  account_id: string | null;
  card_type: string;
  card_network: string;
  delivery_address: string | null;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'transaction' | 'message' | 'security';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: NotificationType;
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MailMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export type TransferMethod = 'internal' | 'ach' | 'wire' | 'international';

export interface TransferDetails {
  beneficiaryName: string;
  bankName: string;
  routingNumber: string;
  swiftCode?: string;
  method: TransferMethod;
  reference?: string;
}
