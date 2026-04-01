/**
 * Source-Trust Scoring Skeleton (Lock IDs: M5, M10)
 *
 * 6-signal scoring function returning 0-100.
 * Signals from Section 4 Source-Trust Scoring Model:
 *   Signal 1: sender_trust (0-25)
 *   Signal 2: template_match (0-20)
 *   Signal 3: transaction_proof (0-20)
 *   Signal 4: corroboration (0-15)
 *   Signal 5: ai_confidence (0-10)
 *   Signal 6: historical_pattern (0-10)
 *
 * Total possible: 100
 */

export interface TrustSignals {
  sender_trust: number;       // 0-25
  template_match: number;     // 0-20
  transaction_proof: number;  // 0-20
  corroboration: number;      // 0-15
  ai_confidence: number;      // 0-10
  historical_pattern: number; // 0-10
}

export interface TrustResult {
  score: number;              // 0-100
  signals: TrustSignals;
  behavior: TrustBehavior;
}

// Trust Score → UX Behavior mapping (Section 4)
export type TrustBehavior =
  | 'silent_auto'   // 90-100: Silent auto-classify, appears as confirmed
  | 'auto_review'   // 75-89: Auto-classify with "Review" chip
  | 'suggested'     // 50-74: Show as "Suggested: [category]" — user must confirm
  | 'ask_user'      // 25-49: Show raw, ask user to classify
  | 'warn_user';    // 0-24: Show with warning: "Low confidence — please verify"

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreToBehavior(score: number): TrustBehavior {
  if (score >= 90) return 'silent_auto';
  if (score >= 75) return 'auto_review';
  if (score >= 50) return 'suggested';
  if (score >= 25) return 'ask_user';
  return 'warn_user';
}

/**
 * Compute trust score from 6 signals.
 * Each signal is clamped to its valid range.
 */
export function computeTrustScore(signals: TrustSignals): TrustResult {
  const clamped: TrustSignals = {
    sender_trust: clamp(signals.sender_trust, 0, 25),
    template_match: clamp(signals.template_match, 0, 20),
    transaction_proof: clamp(signals.transaction_proof, 0, 20),
    corroboration: clamp(signals.corroboration, 0, 15),
    ai_confidence: clamp(signals.ai_confidence, 0, 10),
    historical_pattern: clamp(signals.historical_pattern, 0, 10),
  };

  const score =
    clamped.sender_trust +
    clamped.template_match +
    clamped.transaction_proof +
    clamped.corroboration +
    clamped.ai_confidence +
    clamped.historical_pattern;

  return {
    score: clamp(score, 0, 100),
    signals: clamped,
    behavior: scoreToBehavior(score),
  };
}

// --- Signal computation helpers (Section 4 lookup tables) ---

export type SenderType =
  | 'bank_app_notification'    // 25
  | 'upi_app_notification'     // 20
  | 'bank_sms_shortcode'       // 25
  | 'bank_sms_regular'         // 15
  | 'unknown_app_notification' // 5
  | 'unknown_sms_sender';      // 0

const SENDER_TRUST_SCORES: Record<SenderType, number> = {
  bank_app_notification: 25,
  upi_app_notification: 20,
  bank_sms_shortcode: 25,
  bank_sms_regular: 15,
  unknown_app_notification: 5,
  unknown_sms_sender: 0,
};

export function getSenderTrust(senderType: SenderType): number {
  return SENDER_TRUST_SCORES[senderType];
}

export type TemplateMatchLevel =
  | 'exact'    // 20
  | 'partial'  // 12
  | 'has_amount_merchant' // 8
  | 'unstructured'; // 0

const TEMPLATE_MATCH_SCORES: Record<TemplateMatchLevel, number> = {
  exact: 20,
  partial: 12,
  has_amount_merchant: 8,
  unstructured: 0,
};

export function getTemplateMatch(level: TemplateMatchLevel): number {
  return TEMPLATE_MATCH_SCORES[level];
}

export type TransactionProofLevel =
  | 'upi_reference'     // 20
  | 'transaction_id'    // 15
  | 'account_hint'      // 10
  | 'no_reference';     // 0

const TRANSACTION_PROOF_SCORES: Record<TransactionProofLevel, number> = {
  upi_reference: 20,
  transaction_id: 15,
  account_hint: 10,
  no_reference: 0,
};

export function getTransactionProof(level: TransactionProofLevel): number {
  return TRANSACTION_PROOF_SCORES[level];
}

export type CorroborationLevel =
  | 'multi_source'  // 15 (same transaction from 2+ sources)
  | 'single_source' // 5
  | 'conflicting';  // 0

const CORROBORATION_SCORES: Record<CorroborationLevel, number> = {
  multi_source: 15,
  single_source: 5,
  conflicting: 0,
};

export function getCorroboration(level: CorroborationLevel): number {
  return CORROBORATION_SCORES[level];
}

export type AiConfidenceLevel =
  | 'high'          // 10 (>90%)
  | 'medium'        // 7 (70-89%)
  | 'low'           // 4 (50-69%)
  | 'none_or_below' // 0 (<50%)
  | 'not_configured'; // 5 (neutral)

const AI_CONFIDENCE_SCORES: Record<AiConfidenceLevel, number> = {
  high: 10,
  medium: 7,
  low: 4,
  none_or_below: 0,
  not_configured: 5,
};

export function getAiConfidence(level: AiConfidenceLevel): number {
  return AI_CONFIDENCE_SCORES[level];
}

export type HistoricalPatternLevel =
  | 'recurring_match' // 10
  | 'similar'         // 5
  | 'completely_new'; // 0

const HISTORICAL_PATTERN_SCORES: Record<HistoricalPatternLevel, number> = {
  recurring_match: 10,
  similar: 5,
  completely_new: 0,
};

export function getHistoricalPattern(level: HistoricalPatternLevel): number {
  return HISTORICAL_PATTERN_SCORES[level];
}
