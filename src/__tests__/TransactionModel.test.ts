import {SPENDING_ECONOMIC_TYPES, SPEND_ELIGIBLE_STATUSES} from '../models/Transaction';
import type {EconomicType, TransactionStatus} from '../models/Transaction';

describe('Transaction Model', () => {
  describe('SPENDING_ECONOMIC_TYPES', () => {
    const expectedSpending: EconomicType[] = [
      'genuine_spend', 'bill_payment', 'subscription', 'insurance_premium',
      'fee_charge', 'government_payment', 'gift_given', 'charity_donation',
      'group_split_paid',
    ];

    it('contains all spending types', () => {
      for (const type of expectedSpending) {
        expect(SPENDING_ECONOMIC_TYPES.has(type)).toBe(true);
      }
    });

    it('has exactly 9 spending types', () => {
      expect(SPENDING_ECONOMIC_TYPES.size).toBe(9);
    });

    it('excludes self_transfer (M2: self-transfers NEVER counted)', () => {
      expect(SPENDING_ECONOMIC_TYPES.has('self_transfer')).toBe(false);
    });

    it('excludes credit_card_payment (M2: liability settlement, NOT spending)', () => {
      expect(SPENDING_ECONOMIC_TYPES.has('credit_card_payment')).toBe(false);
    });

    it('excludes investment_out (asset conversion, not spending)', () => {
      expect(SPENDING_ECONOMIC_TYPES.has('investment_out')).toBe(false);
    });

    it('excludes unclassified (not counted until classified)', () => {
      expect(SPENDING_ECONOMIC_TYPES.has('unclassified')).toBe(false);
    });
  });

  describe('SPEND_ELIGIBLE_STATUSES', () => {
    it('only includes success', () => {
      expect(SPEND_ELIGIBLE_STATUSES.has('success')).toBe(true);
      expect(SPEND_ELIGIBLE_STATUSES.size).toBe(1);
    });

    it('excludes failed (M2: failed NEVER counted)', () => {
      expect(SPEND_ELIGIBLE_STATUSES.has('failed')).toBe(false);
    });

    it('excludes reversed (M2: reversed NEVER counted)', () => {
      expect(SPEND_ELIGIBLE_STATUSES.has('reversed')).toBe(false);
    });

    it('excludes pending (M2: pending NEVER counted)', () => {
      expect(SPEND_ELIGIBLE_STATUSES.has('pending')).toBe(false);
    });
  });
});
