/**
 * PatternEngine.js
 *
 * Learns from the user's transaction history to:
 * 1. Auto-suggest basket after 3 occurrences of same merchant
 * 2. Auto-classify silently after 5 occurrences
 * 3. Build a "merchant fingerprint" database locally
 * 4. Detect recurring transactions (daily milk, monthly Netflix etc.)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PATTERNS_KEY = 'spendsense_patterns';

// How many times before we act
const SUGGEST_THRESHOLD   = 3;  // show suggestion
const AUTOFILL_THRESHOLD  = 5;  // auto-classify silently

export class PatternEngine {

  // ── Load / Save patterns ──────────────────────────────────────

  static async loadPatterns() {
    const raw = await AsyncStorage.getItem(PATTERNS_KEY);
    return raw ? JSON.parse(raw) : {};
  }

  static async savePatterns(patterns) {
    await AsyncStorage.setItem(PATTERNS_KEY, JSON.stringify(patterns));
  }

  // ── Record a classified transaction ──────────────────────────

  /**
   * Called every time a user confirms a category for a transaction.
   * Builds up the fingerprint for this merchant.
   */
  static async recordClassification(transaction, confirmedCategory, userNote) {
    const patterns = await this.loadPatterns();
    const key = this.getMerchantKey(transaction);

    if (!patterns[key]) {
      patterns[key] = {
        merchantKey: key,
        merchantName: transaction.merchant,
        upiId: transaction.upiRef || null,
        categories: {},
        totalCount: 0,
        lastSeen: null,
        averageAmount: 0,
        amountHistory: [],
        notes: [],
        isRecurring: false,
        recurringFrequency: null,
        autoClassify: false,
      };
    }

    const p = patterns[key];

    // Update category counts
    p.categories[confirmedCategory] = (p.categories[confirmedCategory] || 0) + 1;
    p.totalCount++;
    p.lastSeen = transaction.timestamp || new Date().toISOString();

    // Track amount history (last 10)
    p.amountHistory.push(transaction.amount);
    if (p.amountHistory.length > 10) p.amountHistory.shift();
    p.averageAmount = Math.round(
      p.amountHistory.reduce((s, a) => s + a, 0) / p.amountHistory.length
    );

    // Track notes for context
    if (userNote && !p.notes.includes(userNote)) {
      p.notes.push(userNote);
      if (p.notes.length > 5) p.notes.shift();
    }

    // Enable auto-classify after threshold
    if (p.totalCount >= AUTOFILL_THRESHOLD) {
      p.autoClassify = true;
    }

    // Detect recurring pattern
    p.isRecurring = this.detectRecurring(p);

    await this.savePatterns(patterns);
    return p;
  }

  // ── Get suggestion for a new transaction ─────────────────────

  /**
   * Returns suggestion object or null.
   * { category, confidence, autoClassify, message, pattern }
   */
  static async getSuggestion(transaction) {
    const patterns = await this.loadPatterns();
    const key = this.getMerchantKey(transaction);
    const p = patterns[key];

    if (!p || p.totalCount < SUGGEST_THRESHOLD) return null;

    // Find the most frequently used category
    const topCategory = Object.entries(p.categories)
      .sort((a, b) => b[1] - a[1])[0];

    if (!topCategory) return null;

    const [category, count] = topCategory;
    const confidence = Math.min(count / p.totalCount, 1);

    // Auto-classify silently after threshold
    if (p.autoClassify) {
      return {
        category,
        confidence,
        autoClassify: true,
        message: null, // silent
        pattern: p,
      };
    }

    // Suggest (show to user)
    const amtText = p.averageAmount > 0
      ? ` (usually ₹${p.averageAmount.toLocaleString('en-IN')})`
      : '';
    const recurText = p.isRecurring ? ' · recurring' : '';

    return {
      category,
      confidence,
      autoClassify: false,
      message: `Usually classified as ${category}${amtText}${recurText}`,
      pattern: p,
    };
  }

  // ── Recurring detection ───────────────────────────────────────

  static detectRecurring(pattern) {
    if (pattern.totalCount < 3) return false;

    // Check if amounts are consistent (within 20% of average)
    const avgAmt = pattern.averageAmount;
    const consistent = pattern.amountHistory.every(
      a => Math.abs(a - avgAmt) / avgAmt < 0.2
    );

    return consistent;
  }

  // ── Get all recurring transactions ───────────────────────────

  static async getRecurringMerchants() {
    const patterns = await this.loadPatterns();
    return Object.values(patterns)
      .filter(p => p.isRecurring && p.totalCount >= 3)
      .sort((a, b) => b.totalCount - a.totalCount);
  }

  // ── Merchant key generation ───────────────────────────────────

  /**
   * Creates a stable key for a merchant.
   * Priority: UPI ID > cleaned merchant name > amount band
   */
  static getMerchantKey(transaction) {
    // Best: UPI ID is perfectly unique
    if (transaction.upiRef) {
      const vpa = transaction.rawSMSText?.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/);
      if (vpa) return `vpa:${vpa[1].toLowerCase()}`;
    }

    // Good: cleaned merchant name
    if (transaction.merchant && transaction.merchant !== 'Unknown') {
      const cleaned = transaction.merchant
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 20);
      return `merchant:${cleaned}`;
    }

    // Fallback: amount band (catches recurring same-amount payments)
    const band = Math.round((transaction.amount || 0) / 10) * 10;
    return `amount:${band}`;
  }

  // ── Spending pattern analysis ─────────────────────────────────

  /**
   * Analyses all patterns and returns insights like:
   * - "You buy from milk_shop daily"
   * - "Netflix is a monthly subscription"
   * - "Your average Zomato order is ₹380"
   */
  static async getPatternInsights() {
    const patterns = await this.loadPatterns();
    const insights = [];

    for (const p of Object.values(patterns)) {
      if (p.totalCount < 3) continue;

      const topCat = Object.entries(p.categories).sort((a, b) => b[1] - a[1])[0]?.[0];

      if (p.isRecurring && p.totalCount >= 5) {
        insights.push({
          type: 'pattern',
          icon: '🔄',
          merchantName: p.merchantName,
          title: `${p.merchantName} — recurring`,
          text: `You pay ₹${p.averageAmount.toLocaleString('en-IN')} to ${p.merchantName} regularly. ` +
                `Auto-classified as ${topCat}.`,
        });
      }
    }

    return insights.slice(0, 5); // max 5 pattern insights
  }

  // ── Reset patterns (for testing) ─────────────────────────────

  static async clearPatterns() {
    await AsyncStorage.removeItem(PATTERNS_KEY);
  }
}
