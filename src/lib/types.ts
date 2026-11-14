export type LocationType =
  | 'bank_account'
  | 'deposit'
  | 'money_market_fund'
  | 'provident_fund'
  | 'study_fund'
  | 'other';

export type TransactionKind = 'opening' | 'deposit' | 'withdrawal';

export type MemberRole = 'owner' | 'member';

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
}

export interface Member {
  user_id: string;
  role: MemberRole;
  display_name: string;
  joined_at: string;
}

export interface SavingInput {
  purpose: string;
  location_type: LocationType;
  institution: string;
  notes: string | null;
}

export interface SavingWithBalance extends SavingInput {
  id: string;
  household_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  balance_agorot: number;
}

export interface Transaction {
  id: string;
  saving_id: string;
  kind: TransactionKind;
  amount_agorot: number;
  occurred_on: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
  author_name: string | null;
}
