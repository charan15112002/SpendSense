import {
  isPackageWhitelisted,
  isSenderKnown,
  hasFinancialKeywords,
  parseNotificationText,
  parseSmsText,
  type PackageWhitelist,
  type TemplateConfig,
  type ShortcodeDB,
} from '../services/NotificationParser';

// Test fixtures matching the actual JSON configs
const whitelist: PackageWhitelist = {
  packages: {
    'com.google.android.apps.nbu.paisa': {name: 'Google Pay', type: 'upi_app', sender_trust: 20},
    'com.phonepe.app': {name: 'PhonePe', type: 'upi_app', sender_trust: 20},
    'com.sbi.SBIFreedomPlus': {name: 'SBI YONO', type: 'bank_app', sender_trust: 25},
    'com.snapwork.hdfc': {name: 'HDFC', type: 'bank_app', sender_trust: 25},
  },
  explicitly_excluded: {
    'com.google.android.gm': 'Gmail — v1 learning: duplicate transactions',
  },
};

const templates: TemplateConfig = {
  templates: {
    'com.google.android.apps.nbu.paisa': [
      {name: 'gpay_paid', pattern: 'Paid (?:Rs\\.?|₹)\\s?([\\d,]+(?:\\.\\d{1,2})?) to (.+?)(?:\\s|$)', extract: {amount: 1, merchant: 2}, flow: 'outflow'},
      {name: 'gpay_received', pattern: 'Received (?:Rs\\.?|₹)\\s?([\\d,]+(?:\\.\\d{1,2})?) from (.+?)(?:\\s|$)', extract: {amount: 1, merchant: 2}, flow: 'inflow'},
    ],
    'com.sbi.SBIFreedomPlus': [
      {name: 'sbi_debited', pattern: '(?:Your A/c|A/c)\\s*(?:XX|xx|\\*+)\\s*\\d+\\s*(?:is )?debited (?:for |by )?(?:Rs\\.?|₹|INR)\\s?([\\d,]+(?:\\.\\d{1,2})?)', extract: {amount: 1}, flow: 'outflow'},
    ],
  },
  generic_fallback: {
    amount_pattern: '(?:Rs\\.?|₹|INR)\\s?([\\d,]+(?:\\.\\d{1,2})?)',
    merchant_pattern: '(?:to|from|at)\\s+([A-Za-z][A-Za-z0-9 ._-]{2,30})',
  },
  status_keywords: {
    failed: ['failed', 'failure', 'unsuccessful', 'declined', 'rejected', 'cbs rejection'],
    pending: ['pending', 'processing', 'initiated'],
    reversed: ['reversed', 'reversal'],
    refunded: ['refund', 'refunded'],
    disputed: ['disputed', 'chargeback'],
    expired: ['expired'],
    success: ['success', 'successful', 'credited', 'debited', 'paid', 'received', 'sent'],
  },
};

const shortcodeDB: ShortcodeDB = {
  shortcodes: {
    SBI: {senders: ['SBIBNK', 'SBIPSG'], type: 'bank', sender_trust: 25},
    HDFC: {senders: ['HDFCBK'], type: 'bank', sender_trust: 25},
  },
  phishing_phrases: ['click here', 'update kyc', 'verify now'],
};

describe('NotificationParser', () => {
  describe('isPackageWhitelisted', () => {
    it('allows whitelisted packages', () => {
      expect(isPackageWhitelisted('com.google.android.apps.nbu.paisa', whitelist)).toBe(true);
      expect(isPackageWhitelisted('com.sbi.SBIFreedomPlus', whitelist)).toBe(true);
    });

    it('rejects non-whitelisted packages (Section 6 System 1 step 2)', () => {
      expect(isPackageWhitelisted('com.random.app', whitelist)).toBe(false);
    });

    it('rejects Gmail explicitly (Section 7 C6)', () => {
      expect(isPackageWhitelisted('com.google.android.gm', whitelist)).toBe(false);
    });
  });

  describe('isSenderKnown', () => {
    it('matches known shortcodes', () => {
      const result = isSenderKnown('VM-SBIBNK', shortcodeDB);
      expect(result.known).toBe(true);
      expect(result.bankName).toBe('SBI');
      expect(result.senderTrust).toBe(25);
    });

    it('rejects unknown senders', () => {
      const result = isSenderKnown('RANDOM123', shortcodeDB);
      expect(result.known).toBe(false);
    });
  });

  describe('hasFinancialKeywords', () => {
    it('detects financial text', () => {
      expect(hasFinancialKeywords('Your account debited Rs 500')).toBe(true);
      expect(hasFinancialKeywords('UPI transaction successful')).toBe(true);
    });

    it('rejects non-financial text', () => {
      expect(hasFinancialKeywords('Your pizza is on the way!')).toBe(false);
    });
  });

  describe('parseNotificationText', () => {
    it('parses GPay paid notification with template match', () => {
      const result = parseNotificationText(
        'Paid Rs 250.00 to Zomato',
        'com.google.android.apps.nbu.paisa',
        templates,
      );
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(250);
      expect(result!.merchant).toBe('Zomato');
      expect(result!.flow).toBe('outflow');
      expect(result!.status).toBe('success');
      expect(result!.templateMatchLevel).toBe('exact');
    });

    it('parses GPay received notification', () => {
      const result = parseNotificationText(
        'Received Rs 1,500 from John',
        'com.google.android.apps.nbu.paisa',
        templates,
      );
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(1500);
      expect(result!.merchant).toBe('John');
      expect(result!.flow).toBe('inflow');
    });

    it('parses SBI debit notification', () => {
      const result = parseNotificationText(
        'Your A/c XX1234 is debited for Rs.500.00',
        'com.sbi.SBIFreedomPlus',
        templates,
      );
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(500);
      expect(result!.flow).toBe('outflow');
    });

    it('uses generic fallback for unknown template from whitelisted package', () => {
      const result = parseNotificationText(
        'Amount Rs 999 transferred to BigBazaar for purchase',
        'com.snapwork.hdfc',
        templates,
      );
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(999);
      expect(result!.templateName).toBeNull();
      expect(result!.templateMatchLevel).toBe('has_amount_merchant');
    });

    it('returns null when no amount is extractable (Section 6 System 1 step 4)', () => {
      const result = parseNotificationText(
        'Welcome to HDFC bank! Enjoy our new services.',
        'com.snapwork.hdfc',
        templates,
      );
      expect(result).toBeNull();
    });

    it('detects failed status with priority over success (Section 4 D2)', () => {
      const result = parseNotificationText(
        'Your payment of Rs 500 to Zomato has failed',
        'com.google.android.apps.nbu.paisa',
        templates,
      );
      // Generic fallback should extract amount
      expect(result).not.toBeNull();
      expect(result!.status).toBe('failed');
    });

    it('detects CBS rejection as failure (v1 learning)', () => {
      const result = parseNotificationText(
        'CBS Rejection 0116: Rs 200 debited from account',
        'com.sbi.SBIFreedomPlus',
        templates,
      );
      expect(result).not.toBeNull();
      expect(result!.status).toBe('failed');
    });

    it('detects UPI reference number', () => {
      const result = parseNotificationText(
        'Paid Rs 100 to Shop UPI ref 123456789012',
        'com.google.android.apps.nbu.paisa',
        templates,
      );
      expect(result).not.toBeNull();
      expect(result!.hasUpiRef).toBe(true);
    });
  });

  describe('parseSmsText', () => {
    it('parses bank SMS with template', () => {
      const result = parseSmsText(
        'Paid Rs 350 to Swiggy via UPI',
        'VM-SBIBNK',
        templates,
        shortcodeDB,
      );
      expect(result).not.toBeNull();
      expect(result!.amount).toBe(350);
    });

    it('detects SMS with links as phishing (Section 6 System 9 Layer 4)', () => {
      const result = parseSmsText(
        'Your account credited Rs 49999. Click https://fake.com to verify',
        'VM-SBIBNK',
        templates,
        shortcodeDB,
      );
      expect(result).not.toBeNull();
      expect(result!.containsLink).toBe(true);
    });

    it('detects phishing phrases (Section 6 System 9 Layer 4)', () => {
      const result = parseSmsText(
        'Dear customer, update KYC immediately. Rs 100 debited',
        'VM-SBIBNK',
        templates,
        shortcodeDB,
      );
      // Should return null because phishing phrases trigger auto-reject
      // Actually the function returns the parsed result; the pipeline rejects it
      expect(result).not.toBeNull();
      expect(result!.containsPhishingPhrase).toBe(true);
    });

    it('detects account hint in SMS', () => {
      const result = parseSmsText(
        'Your A/c XX1234 is debited for Rs.500.00',
        'VM-SBIBNK',
        templates,
        shortcodeDB,
      );
      expect(result).not.toBeNull();
      expect(result!.hasAccountHint).toBe(true);
    });
  });
});
