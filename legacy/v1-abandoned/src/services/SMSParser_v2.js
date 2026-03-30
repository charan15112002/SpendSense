/**
 * SMSParser v2 — Full credit + debit + transfer detection
 *
 * Now handles:
 *   - Bank credits (salary, transfers in, refunds, cashback)
 *   - Own-account transfers
 *   - Salary detection with cycle-start triggering
 *   - Amazon Pay / wallet credits
 *   - All previous debit parsing
 */

// ── Credit detection keywords ──────────────────────────────────

const CREDIT_KEYWORDS = [
  'credited',
  'credit',
  'received',
  'deposited',
  'added to your',
  'transferred to your',
  'refund',
  'cashback',
  'reward',
  'salary',
  'cash back',
  'received in your account',
  'money received',
  'deposit of',
  'payment received',
];

const DEBIT_KEYWORDS = [
  'debited',
  'debit',
  'spent',
  'paid',
  'payment',
  'purchase',
  'withdrawn',
  'transfer to',
  'sent to',
  'transaction of',
  'charged',
  'deducted',
  'pos txn',
  'upi:',
  'payment of',
  'sent rs',
  'paid via upi',
  'successfully transferred',
  'purchase using',
  'txn of',
  'upi payment',
];

const SUCCESS_HINTS = [
  'successful',
  'successfully',
  'completed',
  'processed',
  'credited',
  'debited',
  'paid to',
  'sent to',
  'received from',
  'transaction done',
];

const FAILURE_HINTS = [
  'failed',
  'failure',
  'declined',
  'unsuccessful',
  'not successful',
  'insufficient balance',
  'insufficient funds',
  'low balance',
  'could not be processed',
  'pending',
  'processing',
  'payment request',
  'collect request',
  'request money',
  'autopay mandate',
  'could not be completed',
  'reversed',
  'reversal',
  'will be reversed',
  'not debited',
  'unable to process',
  'unable to complete',
  'timed out',
  'timeout',
  'transaction declined',
  'your payment could',
  'amount not debited',
  'retry',
];

// These phrases definitively mark a transaction as failed,
// even if a success keyword also appears in the same SMS.
const HARD_FAILURE_PHRASES = [
  'could not be processed',
  'could not be completed',
  'unable to process',
  'unable to complete',
  'not successful',
  'will be reversed',
  'has been reversed',
  'amount not debited',
  'insufficient balance',
  'insufficient funds',
  'timed out',
  'transaction declined',
  'payment failed',
  'declined',
  'rejected',
  'rejection',
  'cbs rejection',
  'txn rejected',
  'transaction rejected',
  'payment rejected',
  'request rejected',
  // Paytm / GPay / PhonePe specific failure phrases
  'payment was not successful',
  'your payment has failed',
  'transaction has failed',
  'transaction was unsuccessful',
  'your transaction failed',
  'payment could not be completed',
  'we could not complete',
  'not been debited',
  'money has not been debited',
  'amount will be refunded',
  'will be credited back',
  'has been cancelled',
  'payment cancelled',
  // Retry-request messages (not a completed transaction)
  'retry your payment',
  'please try again',
  // Mandate/autopay setup messages (authorization, not actual payment)
  'autopay mandate',
  'mandate created',
  'mandate is successfully',
  'mandate registered',
  'mandate set up',
  'mandate activated',
  'standing instruction',
  'si registered',
  'auto-debit registered',
  'e-mandate',
  'emandate',
  // Not-debited confirmations
  'not debited',
  'account is not debited',
  'has not been debited',
];

const PROMOTIONAL_HINTS = [
  'pre-approved',
  'pre approved',
  'loan offer',
  'offer valid',
  'cashback offer',
  'flat off',
  'discount',
  'coupon',
  'apply now',
  'click here',
  'tap here',
  'visit us',
  'limited period',
  'eligible for loan',
  'credit card upgrade',
  'special offer',
  'exclusive offer',
  'get up to',
  'win up to',
  'earn up to',
  'upgrade now',
  'activate now',
  'apply for',
  'interest rate',
  'emi offer',
  'no cost emi',
  'instant loan',
  'personal loan',
  'home loan',
  'credit limit',
  'reward points',
  'redeem now',
  'expires',
  'valid till',
  'valid until',
  'use code',
  'promo code',
  'hurry',
  'last chance',
  'don\'t miss',
  'register now',
  'download now',
  'invite your',
  'refer and earn',
  'refer & earn',
  'friends & family',
  'friends and family',
  'share and earn',
  'share & earn',
  'save rs',
  'save ₹',
  'win rs',
  'win ₹',
  'earn rs',
  'earn ₹',
  'get rs',
  'free delivery',
  'open now',
  'deal of',
  'flat rs',
  'flat ₹',
];

// Sender IDs that are purely promotional/service — never financial transactions.
// In India, these are 6-alpha sender IDs that are known marketing senders.
const PROMOTIONAL_SENDER_PATTERNS = [
  /^(AD|VM|BZ|MK|MG|CP|SV|IM)[A-Z]{4}$/i, // AD-xxxxx / BZ-xxxxx style promotional IDs
];

const TRANSACTION_PROOF_PATTERNS = [
  /(?:upi|utr|rrn|txn|ref)(?:erence|action)?(?:\s*(?:id|no|#))?[:\s-]*[a-z0-9]{6,}/i,
  /(?:a\/c|account|card)\s*(?:xx|x+|\*+)?\d{2,}/i,
  /(?:balance|avl\.?\s*bal|available)\s*(?:is|rs|inr|₹)?/i,
  /[a-z0-9._-]+@[a-z0-9]+/i,
];

// ── Salary detection keywords ──────────────────────────────────

const SALARY_HINTS = [
  'salary',
  'sal cr',
  'sal credit',
  'payroll',
  'neft cr',
  'imps cr',
  'salary credit',
  'monthly payment from',
];

// ── Self-transfer hints ────────────────────────────────────────

const SELF_TRANSFER_HINTS = [
  'self transfer',
  'own account',
  'sweep',
  'linked account',
];

// ── Wallet credit detection ────────────────────────────────────

const WALLET_CREDIT_PATTERNS = {
  amazon: [
    'amazon pay balance',
    'amazon pay cashback',
    'amazon reward',
    'amazon gift card',
  ],
  paytm: ['paytm wallet', 'paytm cashback', 'paytm balance credited'],
  phonepe: ['phonepe cashback', 'phonepe reward'],
  gpay: ['gpay reward', 'google pay cashback'],
};

// ── Credit categorization ──────────────────────────────────────

const CREDIT_CATEGORIES = {
  salary: ['salary', 'sal cr', 'payroll', 'salary credit'],
  cashback: [
    'cashback',
    'cash back',
    'reward',
    'refund',
    'reversal',
    'amazon pay balance',
  ],
  transfer_in: ['neft cr', 'imps cr', 'rtgs cr', 'upi cr', 'received from'],
  interest: ['interest credit', 'fd interest', 'rd credit'],
  dividend: ['dividend', 'mutual fund', 'nav credit'],
};

// ─────────────────────────────────────────────────────────────
// AMOUNT PATTERNS (same as v1 — works for both debit/credit)
// ─────────────────────────────────────────────────────────────

const AMOUNT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/i,
  /(?:credited|debited)\s+(?:with\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
  /amount\s+(?:of\s+)?(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i,
];

export class SMSParser {
  /**
   * Parse a message into a transaction.
   * Returns null if not a financial transaction.
   *
   * New: Returns flow = 'credit' | 'debit' | 'transfer'
   */
  static parse(text, sender = '') {
    if (!text || text.length < 10) {
      return null;
    }

    const normalizedText = String(text).replace(/\s+/g, ' ').trim();
    const lower = normalizedText.toLowerCase();

    // Skip OTPs
    if (this.isOTP(lower)) {
      return null;
    }

    if (this.isPromotional(lower, sender)) {
      return null;
    }

    if (this.detectLifecycle(lower) !== 'success') {
      return null;
    }

    // Determine flow direction
    const flow = this.detectFlow(lower, sender);
    if (!flow) {
      return null;
    }

    // Extract amount
    const amount = this.extractAmount(normalizedText);
    if (!amount || amount <= 0 || amount > 100000000) {
      return null;
    }

    if (!this.hasTransactionProof(normalizedText, sender, flow)) {
      return null;
    }

    // Build transaction
    const base = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      amount: parseFloat(amount),
      flow: flow,
      merchant: null,
      from: null,
      creditType: null,
      category: null,
      upiRef: this.extractUPIRef(normalizedText),
      account: this.extractAccount(normalizedText),
      bank: this.extractBank(sender, normalizedText),
      sourceApp: this.extractSourceApp(sender, normalizedText),
      transactionType: this.extractTxnType(lower),
      balance: this.extractBalance(normalizedText),
      rawSMSText: normalizedText,
      rawSender: sender,
      status: 'review',
      userNote: null,
      parserConfidence: this.estimateConfidence({
        flow,
        sender,
        text: normalizedText,
        merchant: null,
      }),
    };

    if (flow === 'debit') {
      base.merchant = this.extractMerchant(normalizedText) || 'Unknown';
      base.category = this.suggestDebitCategory(base.merchant, normalizedText);
      base.parserConfidence = this.estimateConfidence({
        flow,
        sender,
        text: normalizedText,
        merchant: base.merchant,
      });
    }

    if (flow === 'credit') {
      base.from = this.extractCreditFrom(normalizedText) || null;
      base.creditType = this.detectCreditType(lower, sender);
      base.category = base.creditType;
      base.merchant =
        base.from || this.extractBank(sender, normalizedText) || 'Unknown';

      // Flag salary for cycle detection
      if (base.creditType === 'salary') {
        base.isSalaryCredit = true;
      }
    }

    if (flow === 'transfer') {
      base.merchant = 'Self transfer';
      base.category = 'transfer';
    }

    return base;
  }

  // ── Flow detection ───────────────────────────────────────────

  static detectFlow(text, sender = '') {
    const hasCr = CREDIT_KEYWORDS.some(k => text.includes(k));
    const hasDr = DEBIT_KEYWORDS.some(k => text.includes(k));
    const hasSelf = SELF_TRANSFER_HINTS.some(k => text.includes(k));
    const senderText = sender.toUpperCase();

    if (hasSelf) {
      return 'transfer';
    }
    if (
      (senderText.includes('PAYTM') ||
        senderText.includes('PHONEPE') ||
        text.includes('wallet')) &&
      hasCr &&
      !text.includes('debited')
    ) {
      return 'credit';
    }
    if (hasCr && !hasDr) {
      return 'credit';
    }
    if (hasDr && !hasCr) {
      return 'debit';
    }
    if (hasCr && hasDr) {
      // Ambiguous — check which keyword appears first
      const crIdx = Math.min(
        ...CREDIT_KEYWORDS.map(k => text.indexOf(k)).filter(i => i >= 0),
        9999,
      );
      const drIdx = Math.min(
        ...DEBIT_KEYWORDS.map(k => text.indexOf(k)).filter(i => i >= 0),
        9999,
      );
      return crIdx < drIdx ? 'credit' : 'debit';
    }
    return null;
  }

  static detectLifecycle(text) {
    // Hard failure phrases take absolute priority — even if a success keyword
    // appears in the same message (e.g. "could not be processed" contains "processed").
    const hasHardFailure = HARD_FAILURE_PHRASES.some(phrase => text.includes(phrase));
    if (hasHardFailure) {
      return 'failed';
    }

    const hasFailure = FAILURE_HINTS.some(keyword => text.includes(keyword));
    const hasSuccess = SUCCESS_HINTS.some(keyword => text.includes(keyword));

    if (hasFailure && !hasSuccess) {
      return 'failed';
    }

    return 'success';
  }

  static isPromotional(text, sender = '') {
    // Check for known promotional sender ID patterns
    const senderUpper = (sender || '').toUpperCase().replace(/[-]/g, '');
    if (PROMOTIONAL_SENDER_PATTERNS.some(p => p.test(senderUpper))) {
      return true;
    }

    // Hard promotional phrases — ALWAYS block these, even with transaction proof.
    // These are definitively marketing/referral messages, never real transactions.
    const HARD_PROMO = [
      'invite your', 'refer and earn', 'refer & earn',
      'friends & family', 'friends and family',
      'share and earn', 'share & earn',
      'pre-approved', 'pre approved', 'loan offer',
      'offer valid', 'apply now', 'click here', 'tap here',
      'limited period', 'special offer', 'exclusive offer',
      'upgrade now', 'activate now', 'register now', 'download now',
    ];
    if (HARD_PROMO.some(phrase => text.includes(phrase))) {
      return true;
    }

    const hasPromo = PROMOTIONAL_HINTS.some(keyword => text.includes(keyword));
    // Allow if there is strong transaction proof (real account/UPI ref present)
    return hasPromo && !this.hasTransactionProof(text, sender);
  }

  static hasTransactionProof(text, sender = '', flow = null) {
    const hasStructuredProof = TRANSACTION_PROOF_PATTERNS.some(pattern =>
      pattern.test(text),
    );
    const hasSenderContext = /(?:bk|bank|pay|upi|txn)/i.test(sender || '');
    const hasSuccessWord =
      SUCCESS_HINTS.some(keyword => text.includes(keyword)) ||
      (flow === 'debit' && text.includes('paid')) ||
      (flow === 'credit' && text.includes('received'));

    return hasStructuredProof || (hasSenderContext && hasSuccessWord);
  }

  static estimateConfidence({flow, sender, text, merchant}) {
    let score = 0.5;
    if (this.hasTransactionProof(text, sender, flow)) {
      score += 0.2;
    }
    if (merchant && merchant !== 'Unknown') {
      score += 0.15;
    }
    if (flow === 'credit' || flow === 'transfer') {
      score += 0.1;
    }
    if (/(?:upi|utr|rrn|ref)/i.test(text)) {
      score += 0.1;
    }
    return Math.min(score, 0.98);
  }

  // ── Credit type detection ────────────────────────────────────

  static detectCreditType(text, sender) {
    // Salary
    if (SALARY_HINTS.some(k => text.includes(k))) {
      return 'salary';
    }

    // Wallet rewards
    for (const [wallet, patterns] of Object.entries(WALLET_CREDIT_PATTERNS)) {
      if (patterns.some(p => text.includes(p))) {
        return 'cashback';
      }
    }

    // Cashback / refund
    if (
      text.includes('cashback') ||
      text.includes('cash back') ||
      text.includes('refund') ||
      text.includes('reversal')
    ) {
      return 'cashback';
    }

    // Interest
    if (
      text.includes('interest') ||
      text.includes('fd') ||
      text.includes('rd')
    ) {
      return 'interest';
    }

    // Regular bank transfer in
    if (/neft\s+cr|imps\s+cr|rtgs\s+cr/.test(text)) {
      return 'transfer_in';
    }

    // UPI receive
    if (
      text.includes('upi') &&
      (text.includes('received') || text.includes('credited'))
    ) {
      return 'transfer_in';
    }

    return 'transfer_in';
  }

  // ── Who credited (sender name extraction) ────────────────────

  static extractCreditFrom(text) {
    const patterns = [
      /(?:from|by|sender|sent\s+by)\s+([A-Za-z0-9 .'_-]{2,40})(?:\s+to|\s+via|\s+ref|\.|\,|$)/i,
      /([A-Za-z0-9 .'_-]{2,30})\s+(?:has\s+)?(?:transferred|sent|deposited)/i,
      /(?:received\s+from)\s+([A-Za-z0-9 .'_-]{2,40})/i,
      /(?:VPA|UPI\s+ID)\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const name = m[1].trim();
        if (name.length > 1 && !/^(your|a\/c|account|bank|upi)/i.test(name)) {
          return this.titleCase(name);
        }
      }
    }
    return null;
  }

  // ── Debit category suggestion ─────────────────────────────────

  static suggestDebitCategory(merchant, text) {
    const combined = ((merchant || '') + ' ' + text).toLowerCase();
    const map = {
      food: [
        'zomato',
        'swiggy',
        'dominos',
        'kfc',
        'mcdonalds',
        'burger',
        'restaurant',
        'cafe',
        'biryani',
        'food',
        'pizza',
      ],
      groceries: [
        'bigbasket',
        'blinkit',
        'grofers',
        'zepto',
        'dmart',
        'grocery',
        'vegetable',
        'milk',
        'supermarket',
      ],
      travel: [
        'uber',
        'ola',
        'rapido',
        'irctc',
        'redbus',
        'flight',
        'metro',
        'bus',
        'cab',
        'petrol',
        'fuel',
        'diesel',
      ],
      bills: [
        'electricity',
        'bescom',
        'tsspdcl',
        'water',
        'gas',
        'broadband',
        'jio fiber',
        'airtel',
        'recharge',
        'fastag',
      ],
      shopping: [
        'amazon',
        'flipkart',
        'myntra',
        'ajio',
        'meesho',
        'nykaa',
        'mall',
        'store',
      ],
      medical: [
        'pharmeasy',
        '1mg',
        'apollo',
        'hospital',
        'clinic',
        'doctor',
        'pharmacy',
        'lab',
      ],
      entertainment: [
        'netflix',
        'hotstar',
        'disney',
        'spotify',
        'gaana',
        'bookmyshow',
        'pvr',
        'inox',
        'movie',
      ],
      subscription: ['subscription', 'monthly plan', 'membership', 'autopay'],
      emi: ['emi', 'loan', 'repayment', 'bajaj finance'],
      investment: ['zerodha', 'groww', 'upstox', 'mutual fund', 'sip', 'nps'],
      family: [
        'gift',
        'bday',
        'birthday',
        'anniversary',
        'wedding',
        'dad',
        'mom',
        'father',
        'mother',
        'parents',
        'bro',
        'sister',
        'sibling',
      ],
    };
    for (const [cat, kws] of Object.entries(map)) {
      if (kws.some(k => combined.includes(k))) {
        return cat;
      }
    }
    return 'misc';
  }

  // ── Extract amount ────────────────────────────────────────────

  static extractAmount(text) {
    for (const p of AMOUNT_PATTERNS) {
      const m = text.match(p);
      if (m) {
        const v = parseFloat(m[1].replace(/,/g, ''));
        if (!isNaN(v) && v > 0 && v < 10000000) {
          return v;
        }
      }
    }
    return null;
  }

  // ── Extract balance ───────────────────────────────────────────

  static extractBalance(text) {
    const p =
      /(?:avl|available|bal|balance)\s*(?:bal|balance)?\s*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d{1,2})?)/i;
    const m = text.match(p);
    return m ? parseFloat(m[1].replace(/,/g, '')) : null;
  }

  // ── Extract merchant (debit) ──────────────────────────────────

  static extractMerchant(text) {
    // First try named patterns (more meaningful than VPA)
    const namedPatterns = [
      /(?:paid to|to)\s+([A-Za-z][A-Za-z .'&_-]{2,40})(?:\s+via|\s+on|\s+upi|\.|\,|$)/i,
      /(?:merchant|shop)\s*:?\s*([A-Za-z][A-Za-z .'&_-]{2,40})/i,
      /(?:at)\s+([A-Za-z][A-Za-z .'&_-]{2,40})(?:\s+via|\s+ref|\.|\,|$)/i,
      /(?:for|towards)\s+([A-Za-z][A-Za-z .'&_-]{2,40})(?:\s+via|\s+ref|\.|\,|$)/i,
    ];
    for (const p of namedPatterns) {
      const m = text.match(p);
      if (m) {
        const n = m[1].trim();
        if (n.length > 1 && n.length < 50 && !/^(your|a\/c|account|bank|upi|rs|inr)/i.test(n)) {
          return this.titleCase(n);
        }
      }
    }

    // Try VPA — extract name part, but skip if it's just a phone number
    const vpa = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/);
    if (vpa) {
      const localPart = vpa[1].split('@')[0];
      const name = localPart
        .replace(/[._-]/g, ' ')
        .replace(/\d+/g, '')
        .trim();
      // If the VPA local part is purely numeric (phone number), skip it
      if (/^\d+$/.test(localPart)) {
        // Phone-number VPA like 9215676766@ybl — not useful as merchant name
        // Fall through to other patterns or return null
      } else if (name.length > 1) {
        return this.titleCase(name);
      }
    }

    // Fallback: "from/by" patterns
    const fallbackPatterns = [
      /(?:from|by)\s+([A-Za-z][A-Za-z .'&_-]{2,40})(?:\s+upi|\s+ref|\.|\,|$)/i,
    ];
    for (const p of fallbackPatterns) {
      const m = text.match(p);
      if (m) {
        const n = m[1].trim();
        if (n.length > 1 && n.length < 50 && !/^(your|a\/c|account|bank|upi|rs|inr)/i.test(n)) {
          return this.titleCase(n);
        }
      }
    }

    return null;
  }

  // ── Extract UPI ref ───────────────────────────────────────────

  static extractUPIRef(text) {
    const patterns = [
      /UPI\s*(?:Ref\.?\s*(?:No\.?|ID)?\s*:?\s*)([\w\d]{10,20})/i,
      /(?:Ref|Txn|Trans)(?:erence|action)?\.?\s*(?:No\.?|ID|#)?\s*:?\s*([\dA-Z]{8,20})/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        return m[1];
      }
    }
    return null;
  }

  // ── Extract account ───────────────────────────────────────────

  static extractAccount(text) {
    const p =
      /(?:A\/c|Acc(?:ount)?|Card)\s*(?:No\.?|#|ending)?\s*(?:XX+|x+|\*+)?(\d{4})/i;
    const m = text.match(p);
    return m ? `XX${m[1]}` : null;
  }

  // ── Extract bank ──────────────────────────────────────────────

  static extractBank(sender, text) {
    const senderMap = {
      HDFCBK: 'HDFC Bank',
      SBIINB: 'SBI',
      SBIPSG: 'SBI',
      ICICIB: 'ICICI Bank',
      AXISBK: 'Axis Bank',
      KOTAKB: 'Kotak Bank',
      YESBK: 'Yes Bank',
      PNBSMS: 'PNB',
      CANBNK: 'Canara Bank',
      IDFCFB: 'IDFC First',
      BOBTXN: 'Bank of Baroda',
    };
    const up = sender.toUpperCase();
    for (const [code, name] of Object.entries(senderMap)) {
      if (up.includes(code)) {
        return name;
      }
    }
    const banks = [
      'HDFC',
      'SBI',
      'ICICI',
      'Axis',
      'Kotak',
      'PNB',
      'Canara',
      'IndusInd',
      'IDFC',
      'Federal',
      'RBL',
    ];
    for (const b of banks) {
      if (text.toUpperCase().includes(b.toUpperCase())) {
        return b;
      }
    }
    return sender || 'Bank';
  }

  // ── Extract source app ────────────────────────────────────────

  static extractSourceApp(sender, text) {
    const c = (sender + ' ' + text).toLowerCase();
    if (c.includes('gpay') || c.includes('google pay')) {
      return 'GPay';
    }
    if (c.includes('phonepe')) {
      return 'PhonePe';
    }
    if (c.includes('paytm')) {
      return 'Paytm';
    }
    if (c.includes('amazon pay') || c.includes('amazonpay')) {
      return 'Amazon Pay';
    }
    if (c.includes('whatsapp')) {
      return 'WhatsApp Pay';
    }
    if (c.includes('upi')) {
      return 'UPI';
    }
    return 'Bank SMS';
  }

  // ── Extract transaction type ──────────────────────────────────

  static extractTxnType(text) {
    if (text.includes('upi')) {
      return 'UPI';
    }
    if (text.includes('neft')) {
      return 'NEFT';
    }
    if (text.includes('imps')) {
      return 'IMPS';
    }
    if (text.includes('rtgs')) {
      return 'RTGS';
    }
    if (text.includes('card') || text.includes('pos txn')) {
      return 'Card';
    }
    if (text.includes('emi')) {
      return 'EMI';
    }
    if (text.includes('atm')) {
      return 'ATM';
    }
    return 'UPI';
  }

  // ── OTP check ────────────────────────────────────────────────

  static isOTP(text) {
    return (
      text.includes('otp') ||
      text.includes('one time') ||
      /\b\d{4,8}\b is your/.test(text)
    );
  }

  // ── Helpers ──────────────────────────────────────────────────

  static titleCase(str) {
    return str
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  static generateId() {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static isDuplicate(newTxn, existing) {
    return existing.some(e => {
      if (newTxn.upiRef && e.upiRef === newTxn.upiRef) {
        return true;
      }
      const td = Math.abs(new Date(newTxn.timestamp) - new Date(e.timestamp));
      return newTxn.amount === e.amount && newTxn.flow === e.flow && td < 60000;
    });
  }
}

// ── Quick test ────────────────────────────────────────────────

if (require.main === module) {
  const tests = [
    // Debit
    {
      s: 'HDFCBK',
      t: 'Rs.450.00 debited from A/c XX4321 to zomato@icici via UPI. Avl Bal Rs.12,450.',
    },
    // Salary credit
    {
      s: 'SBIINB',
      t: 'Your account XX7890 has been credited with INR 45,000 on 26/06/2024 by NEFT from TechCorp Pvt Ltd (Salary Jun24). Balance: Rs.45,240.',
    },
    // Cashback
    {
      s: 'AMAZONPAY',
      t: 'Rs.500 Amazon Pay balance added to your account as a reward from your employer. Your new balance is Rs.1,250.',
    },
    // Self-transfer
    {
      s: 'AXISBK',
      t: 'Rs.10,000 transferred from your A/c XX1234 to your Axis Savings XX5678 (self transfer).',
    },
    // UPI received
    {
      s: 'ICICIB',
      t: 'INR 3000 credited to your A/c XX5678 from Ravi Kumar via UPI Ref 312345678. Bal: Rs.18,345.',
    },
  ];

  console.log('=== SMSParser v2 Test ===\n');
  tests.forEach((test, i) => {
    const r = SMSParser.parse(test.t, test.s);
    console.log(`Test ${i + 1} [${test.s}]`);
    console.log(
      `  Flow: ${r?.flow}  |  Amount: ₹${r?.amount}  |  CreditType: ${
        r?.creditType || '-'
      }  |  Salary: ${r?.isSalaryCredit || false}`,
    );
    console.log(`  Merchant/From: ${r?.merchant}  |  Category: ${r?.category}`);
    console.log();
  });
}
