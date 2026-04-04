/**
 * SQLite Database Schema (Lock IDs: M1, M2, M5, M10)
 *
 * Transactions table implements the full 6-axis model with provenance fields.
 * Uses SQLite per Section 7 (C9) — replaces AsyncStorage from v1.
 */

export const DATABASE_NAME = 'spendsense.db';
export const DATABASE_VERSION = 1;

export const CREATE_TRANSACTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY NOT NULL,
    amount REAL NOT NULL,
    merchant TEXT,
    timestamp TEXT NOT NULL,

    -- Axis 1: Status (lifecycle state)
    status TEXT NOT NULL CHECK(status IN (
      'success', 'failed', 'pending', 'reversed',
      'refunded', 'disputed', 'expired'
    )),

    -- Axis 2: Flow (direction of money)
    flow TEXT NOT NULL CHECK(flow IN ('outflow', 'inflow', 'internal')),

    -- Axis 3: Economic type (what kind of money movement)
    economic_type TEXT NOT NULL CHECK(economic_type IN (
      'genuine_spend', 'bill_payment', 'subscription', 'insurance_premium',
      'fee_charge', 'government_payment', 'gift_given', 'charity_donation',
      'group_split_paid', 'self_transfer', 'investment_out', 'lent_out',
      'loan_repayment_out', 'credit_card_payment', 'emi_payment',
      'cash_withdrawal', 'cash_deposit', 'salary_credit', 'secondary_income',
      'reimbursement', 'gift_received', 'cashback_reward', 'refund',
      'investment_return', 'group_split_received', 'government_receipt',
      'insurance_claim', 'deposit_return', 'borrowed_in', 'loan_recovery_in',
      'unclassified'
    )),

    -- Axis 4: Payment instrument
    payment_instrument TEXT NOT NULL CHECK(payment_instrument IN (
      'bank_account', 'credit_card', 'rupay_credit_on_upi', 'debit_card',
      'upi', 'upi_lite', 'wallet', 'cash', 'neft_rtgs_imps',
      'auto_debit', 'unknown'
    )),

    -- Axis 5: Liability effect
    liability_effect TEXT NOT NULL CHECK(liability_effect IN (
      'creates_liability', 'settles_liability', 'reduces_receivable',
      'increases_receivable', 'none'
    )),

    -- Axis 6: Confidence
    confidence TEXT NOT NULL CHECK(confidence IN (
      'auto_high', 'auto_medium', 'suggested', 'uncertain',
      'user_confirmed', 'user_override'
    )),

    -- Provenance fields (M5: source trust scoring)
    source_app TEXT NOT NULL DEFAULT '',
    raw_text TEXT NOT NULL DEFAULT '',
    trust_score INTEGER NOT NULL DEFAULT 0 CHECK(trust_score >= 0 AND trust_score <= 100),
    detection_source TEXT NOT NULL DEFAULT 'manual' CHECK(detection_source IN (
      'notification', 'sms', 'manual', 'corroborated'
    )),

    -- Quarantine (M10: fake defense)
    is_quarantined INTEGER NOT NULL DEFAULT 0 CHECK(is_quarantined IN (0, 1)),

    -- Timestamps
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

// Diagnostic evidence tables (Bug 1 fix: persist to SQLite, not memory)
export const CREATE_DIAGNOSTIC_TABLES = `
  CREATE TABLE IF NOT EXISTS diagnostic_config (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS event_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    seq INTEGER NOT NULL,
    event TEXT NOT NULL,
    source TEXT,
    package_or_sender TEXT,
    detail TEXT,
    raw_text TEXT
  );

  CREATE TABLE IF NOT EXISTS decision_trace (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    function_name TEXT NOT NULL,
    inputs TEXT NOT NULL,
    output TEXT NOT NULL,
    score REAL,
    exclusion_reason TEXT
  );

  CREATE TABLE IF NOT EXISTS platform_trace (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    event TEXT NOT NULL,
    detail TEXT
  );
`;

export const CREATE_DIAGNOSTIC_INDICES = [
  'CREATE INDEX IF NOT EXISTS idx_event_timeline_ts ON event_timeline(ts);',
  'CREATE INDEX IF NOT EXISTS idx_platform_trace_ts ON platform_trace(ts);',
];

export const CREATE_TRANSACTIONS_INDICES = [
  'CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_economic_type ON transactions(economic_type);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_is_quarantined ON transactions(is_quarantined);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_trust_score ON transactions(trust_score);',
];
