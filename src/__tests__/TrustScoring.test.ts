import {
  computeTrustScore,
  getSenderTrust,
  getTemplateMatch,
  getTransactionProof,
  getCorroboration,
  getAiConfidence,
  getHistoricalPattern,
  type TrustSignals,
} from '../services/TrustScoring';

describe('TrustScoring', () => {
  describe('computeTrustScore', () => {
    it('returns 0 for all-zero signals', () => {
      const signals: TrustSignals = {
        sender_trust: 0,
        template_match: 0,
        transaction_proof: 0,
        corroboration: 0,
        ai_confidence: 0,
        historical_pattern: 0,
      };
      const result = computeTrustScore(signals);
      expect(result.score).toBe(0);
      expect(result.behavior).toBe('warn_user');
    });

    it('returns 100 for all-max signals', () => {
      const signals: TrustSignals = {
        sender_trust: 25,
        template_match: 20,
        transaction_proof: 20,
        corroboration: 15,
        ai_confidence: 10,
        historical_pattern: 10,
      };
      const result = computeTrustScore(signals);
      expect(result.score).toBe(100);
      expect(result.behavior).toBe('silent_auto');
    });

    it('clamps signals that exceed max', () => {
      const signals: TrustSignals = {
        sender_trust: 50,   // max 25
        template_match: 40, // max 20
        transaction_proof: 30, // max 20
        corroboration: 25,  // max 15
        ai_confidence: 20,  // max 10
        historical_pattern: 20, // max 10
      };
      const result = computeTrustScore(signals);
      expect(result.score).toBe(100);
    });

    it('clamps negative signals to 0', () => {
      const signals: TrustSignals = {
        sender_trust: -5,
        template_match: -10,
        transaction_proof: 20,
        corroboration: 5,
        ai_confidence: 0,
        historical_pattern: 0,
      };
      const result = computeTrustScore(signals);
      expect(result.score).toBe(25);
      expect(result.signals.sender_trust).toBe(0);
      expect(result.signals.template_match).toBe(0);
    });

    it('maps score 90-100 to silent_auto', () => {
      const result = computeTrustScore({
        sender_trust: 25, template_match: 20, transaction_proof: 20,
        corroboration: 15, ai_confidence: 10, historical_pattern: 0,
      });
      expect(result.score).toBe(90);
      expect(result.behavior).toBe('silent_auto');
    });

    it('maps score 75-89 to auto_review', () => {
      const result = computeTrustScore({
        sender_trust: 25, template_match: 20, transaction_proof: 20,
        corroboration: 5, ai_confidence: 5, historical_pattern: 0,
      });
      expect(result.score).toBe(75);
      expect(result.behavior).toBe('auto_review');
    });

    it('maps score 50-74 to suggested', () => {
      const result = computeTrustScore({
        sender_trust: 25, template_match: 20, transaction_proof: 0,
        corroboration: 5, ai_confidence: 0, historical_pattern: 0,
      });
      expect(result.score).toBe(50);
      expect(result.behavior).toBe('suggested');
    });

    it('maps score 25-49 to ask_user', () => {
      const result = computeTrustScore({
        sender_trust: 25, template_match: 0, transaction_proof: 0,
        corroboration: 0, ai_confidence: 0, historical_pattern: 0,
      });
      expect(result.score).toBe(25);
      expect(result.behavior).toBe('ask_user');
    });

    it('maps score 0-24 to warn_user', () => {
      const result = computeTrustScore({
        sender_trust: 20, template_match: 0, transaction_proof: 0,
        corroboration: 0, ai_confidence: 0, historical_pattern: 0,
      });
      expect(result.score).toBe(20);
      expect(result.behavior).toBe('warn_user');
    });
  });

  describe('signal helpers', () => {
    it('getSenderTrust returns correct values', () => {
      expect(getSenderTrust('bank_app_notification')).toBe(25);
      expect(getSenderTrust('upi_app_notification')).toBe(20);
      expect(getSenderTrust('bank_sms_shortcode')).toBe(25);
      expect(getSenderTrust('bank_sms_regular')).toBe(15);
      expect(getSenderTrust('unknown_app_notification')).toBe(5);
      expect(getSenderTrust('unknown_sms_sender')).toBe(0);
    });

    it('getTemplateMatch returns correct values', () => {
      expect(getTemplateMatch('exact')).toBe(20);
      expect(getTemplateMatch('partial')).toBe(12);
      expect(getTemplateMatch('has_amount_merchant')).toBe(8);
      expect(getTemplateMatch('unstructured')).toBe(0);
    });

    it('getTransactionProof returns correct values', () => {
      expect(getTransactionProof('upi_reference')).toBe(20);
      expect(getTransactionProof('transaction_id')).toBe(15);
      expect(getTransactionProof('account_hint')).toBe(10);
      expect(getTransactionProof('no_reference')).toBe(0);
    });

    it('getCorroboration returns correct values', () => {
      expect(getCorroboration('multi_source')).toBe(15);
      expect(getCorroboration('single_source')).toBe(5);
      expect(getCorroboration('conflicting')).toBe(0);
    });

    it('getAiConfidence returns correct values', () => {
      expect(getAiConfidence('high')).toBe(10);
      expect(getAiConfidence('medium')).toBe(7);
      expect(getAiConfidence('low')).toBe(4);
      expect(getAiConfidence('none_or_below')).toBe(0);
      expect(getAiConfidence('not_configured')).toBe(5);
    });

    it('getHistoricalPattern returns correct values', () => {
      expect(getHistoricalPattern('recurring_match')).toBe(10);
      expect(getHistoricalPattern('similar')).toBe(5);
      expect(getHistoricalPattern('completely_new')).toBe(0);
    });
  });
});
