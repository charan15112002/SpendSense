/**
 * 6-Axis Transaction Model (Lock ID: M2)
 *
 * Every transaction has exactly 6 axes:
 *   status, flow, economic_type, payment_instrument, liability_effect, confidence
 *
 * Plus provenance fields for source tracking (Lock ID: M5).
 */

// AXIS 1: STATUS (lifecycle state)
export type TransactionStatus =
  | 'success'
  | 'failed'
  | 'pending'
  | 'reversed'
  | 'refunded'
  | 'disputed'
  | 'expired';

// AXIS 2: FLOW (direction of money)
export type TransactionFlow = 'outflow' | 'inflow' | 'internal';

// AXIS 3: ECONOMIC TYPE (what kind of money movement)
export type EconomicType =
  // Outflow — counts as SPENDING
  | 'genuine_spend'
  | 'bill_payment'
  | 'subscription'
  | 'insurance_premium'
  | 'fee_charge'
  | 'government_payment'
  | 'gift_given'
  | 'charity_donation'
  | 'group_split_paid'
  // Internal — NOT spending
  | 'self_transfer'
  // Outflow — NOT spending
  | 'investment_out'
  | 'lent_out'
  | 'loan_repayment_out'
  | 'credit_card_payment'
  | 'emi_payment'
  // Outflow — CASH-OUT
  | 'cash_withdrawal'
  // Inflow — CASH-IN
  | 'cash_deposit'
  // Inflow — TRUE INCOME
  | 'salary_credit'
  | 'secondary_income'
  | 'reimbursement'
  // Inflow — NON-INCOME CREDIT
  | 'gift_received'
  | 'cashback_reward'
  | 'refund'
  | 'investment_return'
  | 'group_split_received'
  | 'government_receipt'
  | 'insurance_claim'
  | 'deposit_return'
  // Inflow — LIABILITY
  | 'borrowed_in'
  // Inflow — RECEIVABLE CLEARED
  | 'loan_recovery_in'
  // Unclassified
  | 'unclassified';

// AXIS 4: PAYMENT INSTRUMENT
export type PaymentInstrument =
  | 'bank_account'
  | 'credit_card'
  | 'rupay_credit_on_upi'
  | 'debit_card'
  | 'upi'
  | 'upi_lite'
  | 'wallet'
  | 'cash'
  | 'neft_rtgs_imps'
  | 'auto_debit'
  | 'unknown';

// AXIS 5: LIABILITY EFFECT
export type LiabilityEffect =
  | 'creates_liability'
  | 'settles_liability'
  | 'reduces_receivable'
  | 'increases_receivable'
  | 'none';

// AXIS 6: CONFIDENCE
export type ConfidenceLevel =
  | 'auto_high'       // 95-100%
  | 'auto_medium'     // 80-94%
  | 'suggested'       // 50-79%
  | 'uncertain'       // 0-49%
  | 'user_confirmed'  // User explicitly set
  | 'user_override';  // User changed an auto-classification

// Provenance fields (Lock ID: M5 — source trust scoring)
export interface TransactionProvenance {
  source_app: string;       // Package name of the app that generated the notification/SMS
  raw_text: string;         // Original notification/SMS text
  trust_score: number;      // 0-100, computed from 6 signals
  detection_source: 'notification' | 'sms' | 'manual' | 'corroborated';
}

export interface Transaction {
  id: string;
  amount: number;           // Always positive; flow determines direction
  merchant: string | null;
  timestamp: string;        // ISO 8601

  // 6 axes
  status: TransactionStatus;
  flow: TransactionFlow;
  economic_type: EconomicType;
  payment_instrument: PaymentInstrument;
  liability_effect: LiabilityEffect;
  confidence: ConfidenceLevel;

  // Provenance
  source_app: string;
  raw_text: string;
  trust_score: number;
  detection_source: 'notification' | 'sms' | 'manual' | 'corroborated';

  // Quarantine (Lock ID: M10)
  is_quarantined: boolean;

  created_at: string;       // ISO 8601
  updated_at: string;       // ISO 8601
}

/**
 * Economic types that count as SPENDING for spend totals.
 * Failed/reversed/pending transactions are NEVER counted (M2).
 * Self-transfers are NEVER counted (M2).
 * Credit card payments are liability settlements, NOT spending (M2).
 */
export const SPENDING_ECONOMIC_TYPES: ReadonlySet<EconomicType> = new Set([
  'genuine_spend',
  'bill_payment',
  'subscription',
  'insurance_premium',
  'fee_charge',
  'government_payment',
  'gift_given',
  'charity_donation',
  'group_split_paid',
]);

/**
 * Statuses that are eligible for spend total inclusion.
 * Only 'success' counts. Everything else is excluded.
 */
export const SPEND_ELIGIBLE_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  'success',
]);
