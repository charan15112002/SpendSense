import {shouldQuarantine, applyQuarantineGate, QUARANTINE_THRESHOLD} from '../services/QuarantineGate';
import type {TrustResult} from '../services/TrustScoring';
import type {CreateTransactionInput} from '../database/TransactionRepository';

function makeTrustResult(score: number): TrustResult {
  return {
    score,
    signals: {
      sender_trust: 0, template_match: 0, transaction_proof: 0,
      corroboration: 0, ai_confidence: 0, historical_pattern: 0,
    },
    behavior: score >= 90 ? 'silent_auto' :
              score >= 75 ? 'auto_review' :
              score >= 50 ? 'suggested' :
              score >= 25 ? 'ask_user' : 'warn_user',
  };
}

function makeTransactionInput(overrides?: Partial<CreateTransactionInput>): CreateTransactionInput {
  return {
    amount: 500,
    merchant: 'Test Merchant',
    timestamp: new Date().toISOString(),
    status: 'success',
    flow: 'outflow',
    economic_type: 'genuine_spend',
    payment_instrument: 'upi',
    liability_effect: 'none',
    confidence: 'suggested',
    source_app: 'com.google.android.apps.nbu.paisa',
    raw_text: 'Paid Rs 500 to Test Merchant',
    trust_score: 50,
    detection_source: 'notification',
    is_quarantined: false,
    ...overrides,
  };
}

describe('QuarantineGate', () => {
  describe('shouldQuarantine', () => {
    it('quarantines when trust score is 0', () => {
      const result = shouldQuarantine(makeTrustResult(0));
      expect(result.is_quarantined).toBe(true);
      expect(result.reason).toContain('0');
    });

    it('quarantines when trust score equals threshold (24)', () => {
      const result = shouldQuarantine(makeTrustResult(QUARANTINE_THRESHOLD));
      expect(result.is_quarantined).toBe(true);
    });

    it('does NOT quarantine when trust score is 25', () => {
      const result = shouldQuarantine(makeTrustResult(25));
      expect(result.is_quarantined).toBe(false);
      expect(result.reason).toBeNull();
    });

    it('does NOT quarantine when trust score is 90', () => {
      const result = shouldQuarantine(makeTrustResult(90));
      expect(result.is_quarantined).toBe(false);
    });

    it('quarantines SMS-with-links scenario (trust = 0)', () => {
      // SMS with links → automatic trust score = 0 (set upstream)
      const result = shouldQuarantine(makeTrustResult(0));
      expect(result.is_quarantined).toBe(true);
    });
  });

  describe('applyQuarantineGate', () => {
    it('sets is_quarantined true for low trust', () => {
      const input = makeTransactionInput();
      const trust = makeTrustResult(10);
      const result = applyQuarantineGate(input, trust);
      expect(result.is_quarantined).toBe(true);
      expect(result.trust_score).toBe(10);
    });

    it('sets is_quarantined false for adequate trust', () => {
      const input = makeTransactionInput();
      const trust = makeTrustResult(75);
      const result = applyQuarantineGate(input, trust);
      expect(result.is_quarantined).toBe(false);
      expect(result.trust_score).toBe(75);
    });

    it('preserves all other transaction fields', () => {
      const input = makeTransactionInput({merchant: 'Zomato', amount: 350});
      const trust = makeTrustResult(60);
      const result = applyQuarantineGate(input, trust);
      expect(result.merchant).toBe('Zomato');
      expect(result.amount).toBe(350);
      expect(result.economic_type).toBe('genuine_spend');
    });
  });
});
