/**
 * Quarantine Gate (Lock ID: M10)
 *
 * Transactions below trust threshold are quarantined and NEVER enter spend totals.
 * The quarantine gate operates at transaction creation time.
 *
 * From Section 4:
 *   - Score 0-24: "Low confidence — please verify" → quarantined
 *   - SMS with links → automatic trust score = 0 → quarantined (Layer 4)
 *   - Unknown package → trust capped at 40 (Layer 1+2 fail) → quarantined
 *   - AI NEVER overrides weak structural authenticity (M10)
 */

import type {TrustResult} from './TrustScoring';
import type {CreateTransactionInput} from '../database/TransactionRepository';

// Trust score at or below which a transaction is quarantined
export const QUARANTINE_THRESHOLD = 24;

// Trust cap when source is unknown (Layer 1+2 both fail)
export const UNKNOWN_SOURCE_TRUST_CAP = 40;

export interface QuarantineDecision {
  is_quarantined: boolean;
  reason: string | null;
}

/**
 * Determine whether a transaction should be quarantined based on trust score.
 *
 * Rules from Section 4 Fake Alert Defense:
 *   - Score <= 24 → quarantine with warning
 *   - SMS containing links → trust = 0 → quarantined (handled upstream by setting trust to 0)
 *   - This gate just checks the final trust score
 */
export function shouldQuarantine(trustResult: TrustResult): QuarantineDecision {
  if (trustResult.score <= QUARANTINE_THRESHOLD) {
    return {
      is_quarantined: true,
      reason: `Trust score ${trustResult.score} is below quarantine threshold (${QUARANTINE_THRESHOLD})`,
    };
  }

  return {
    is_quarantined: false,
    reason: null,
  };
}

/**
 * Apply quarantine decision to a transaction input before creation.
 * Returns the input with is_quarantined set appropriately.
 */
export function applyQuarantineGate(
  input: CreateTransactionInput,
  trustResult: TrustResult,
): CreateTransactionInput {
  const decision = shouldQuarantine(trustResult);
  return {
    ...input,
    is_quarantined: decision.is_quarantined,
    trust_score: trustResult.score,
  };
}
