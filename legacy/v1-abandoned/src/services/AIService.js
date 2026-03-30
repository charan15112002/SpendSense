/**
 * AIService.js — Gemini Flash Integration
 *
 * Uses Google Gemini 2.0 Flash (FREE tier: 15 req/min, 1500/day)
 * for smart SMS parsing, categorization, and insights.
 *
 * Get your free API key at: https://aistudio.google.com
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const CATEGORIES = [
  'food',
  'groceries',
  'travel',
  'bills',
  'shopping',
  'medical',
  'entertainment',
  'subscription',
  'emi',
  'investments',
  'transfer',
  'family',
  'misc',
];

// Simple in-memory rate limiter: max 14 calls/minute
const rateLimiter = {
  calls: [],
  canCall() {
    const now = Date.now();
    this.calls = this.calls.filter(t => now - t < 60000);
    return this.calls.length < 14;
  },
  record() {
    this.calls.push(Date.now());
  },
};

export class AIService {
  // ── API Key Management ───────────────────────────
  static async hasApiKey() {
    return Boolean(await this.getApiKey());
  }

  static async getApiKey() {
    return await AsyncStorage.getItem('gemini_api_key');
  }

  static async setApiKey(key) {
    await AsyncStorage.setItem('gemini_api_key', key.trim());
  }

  // ── Core Gemini API call ──────────────────────────
  static async callGemini(prompt, maxTokens = 256) {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return null;
    }

    if (!rateLimiter.canCall()) {
      console.warn('[AIService] Rate limit reached, skipping Gemini call');
      return null;
    }

    rateLimiter.record();

    try {
      const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          contents: [{parts: [{text: prompt}]}],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.1, // Low temperature for factual extraction
          },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.warn(`[AIService] Gemini error ${response.status}: ${err.slice(0, 200)}`);
        return null;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return text ? text.trim() : null;
    } catch (err) {
      console.warn('[AIService] Gemini call failed:', err?.message);
      return null;
    }
  }

  // ── SMS Validation + Parsing (the big accuracy fix) ──
  /**
   * Send a raw SMS to Gemini and ask: "Is this a real completed transaction?"
   * Returns structured data or null if Gemini is unavailable.
   *
   * This replaces brittle keyword matching with actual language understanding.
   */
  static async parseSMS(smsText, sender = '') {
    if (!smsText || smsText.length < 15) {
      return null;
    }

    const prompt = `You are analyzing an Indian bank/UPI SMS message. Determine if this is a REAL COMPLETED financial transaction (money actually moved).

REJECT these (return shouldTrack: false):
- Failed/declined/rejected transactions
- Autopay mandate setup/registration (no money moved yet)
- OTPs, login alerts, balance check alerts
- Promotional offers, loan offers, cashback offers
- Payment requests, collect requests
- Upcoming EMI reminders (not yet deducted)
- Standing instruction registrations

ACCEPT these (return shouldTrack: true):
- Money actually debited from account
- Money actually credited to account
- UPI payments completed
- Bill payments completed
- Recharges completed
- ATM withdrawals
- Refunds received
- Salary credited

SMS Sender: ${sender}
SMS Text: ${smsText.slice(0, 500)}

Respond ONLY with this exact JSON format, nothing else:
{"shouldTrack": true/false, "flow": "debit"/"credit"/"transfer", "amount": number, "merchant": "name", "category": "${CATEGORIES.join('/')}",  "confidence": 0.0-1.0, "reason": "2-3 words why"}

If rejected, still include the amount if visible:
{"shouldTrack": false, "amount": number_or_0, "reason": "mandate setup"}`;

    try {
      const raw = await this.callGemini(prompt, 200);
      if (!raw) {
        return null;
      }

      // Extract JSON from response (Gemini sometimes wraps in markdown)
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      if (typeof parsed.shouldTrack !== 'boolean') {
        return null;
      }

      return {
        shouldTrack: parsed.shouldTrack,
        flow: ['debit', 'credit', 'transfer'].includes(parsed.flow)
          ? parsed.flow
          : null,
        amount:
          typeof parsed.amount === 'number' && parsed.amount > 0
            ? parsed.amount
            : null,
        merchant: parsed.merchant || null,
        category: CATEGORIES.includes(parsed.category)
          ? parsed.category
          : 'misc',
        confidence:
          typeof parsed.confidence === 'number'
            ? Math.min(parsed.confidence, 0.99)
            : 0.7,
        reason: parsed.reason || '',
        aiParsed: true,
      };
    } catch (err) {
      console.warn('[AIService] parseSMS error:', err?.message);
      return null;
    }
  }

  // ── Batch SMS validation (for historical scan) ──
  /**
   * Validate multiple SMS at once to save API calls.
   * Groups 5 SMS per request to Gemini.
   */
  static async parseSMSBatch(smsList) {
    if (!smsList?.length) {
      return [];
    }

    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return smsList.map(() => null); // No AI available
    }

    const results = new Array(smsList.length).fill(null);
    const batchSize = 5;

    for (let i = 0; i < smsList.length; i += batchSize) {
      const batch = smsList.slice(i, i + batchSize);
      const prompt = `Analyze these ${batch.length} Indian bank/UPI SMS messages. For each, determine if it's a REAL COMPLETED financial transaction.

REJECT: failed/declined transactions, mandate setups, OTPs, promotions, payment requests, reminders.
ACCEPT: actual debits, credits, UPI payments, recharges, refunds, salary.

${batch.map((sms, idx) => `[SMS ${idx + 1}] Sender: ${sms.sender || '?'}\n${(sms.text || '').slice(0, 300)}`).join('\n\n')}

Respond with a JSON array of ${batch.length} objects in order:
[{"shouldTrack": true/false, "flow": "debit/credit/transfer", "amount": number, "merchant": "name", "category": "food/groceries/travel/bills/shopping/medical/entertainment/subscription/emi/investments/transfer/family/misc", "confidence": 0.0-1.0, "reason": "2-3 words"}]
Nothing else.`;

      try {
        const raw = await this.callGemini(prompt, 400);
        if (!raw) continue;

        const jsonMatch = raw.match(/\[[\s\S]*\]/);
        if (!jsonMatch) continue;

        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          parsed.forEach((result, idx) => {
            if (i + idx < results.length && typeof result.shouldTrack === 'boolean') {
              results[i + idx] = {...result, aiParsed: true};
            }
          });
        }
      } catch (err) {
        console.warn(`[AIService] Batch ${i}-${i + batchSize} error:`, err?.message);
      }

      // Small delay between batches to respect rate limits
      if (i + batchSize < smsList.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    return results;
  }

  // ── Category suggestion from user note ──────────
  static async suggestCategoryFromNote(userNote, merchant, amount) {
    if (!userNote || userNote.length < 2) {
      return null;
    }

    const prompt = `An Indian user made a payment of ₹${amount || '?'} to "${merchant || 'Unknown'}" and described it as: "${userNote}"

What category does this belong to?
Categories: ${CATEGORIES.join(', ')}

Respond with ONLY a JSON object:
{"category": "category_name", "confidence": 0.9}`;

    try {
      const raw = await this.callGemini(prompt, 60);
      if (!raw) return null;

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      if (CATEGORIES.includes(parsed.category)) {
        return parsed;
      }
    } catch (_) {}
    return null;
  }

  // ── Transaction Categorization (legacy compat) ───
  static async suggestCategory(merchant, smsText, amount) {
    return this.suggestCategoryFromNote(
      smsText?.substring(0, 200) || merchant,
      merchant,
      amount,
    );
  }

  // ── Review transaction message (legacy compat) ───
  static async reviewTransactionMessage(transaction) {
    const rawText =
      transaction.rawSMS ||
      transaction.rawNotificationText ||
      transaction.rawSMSText;
    if (!rawText) return null;

    const result = await this.parseSMS(rawText, transaction.rawSender || '');
    if (!result) return null;

    return {
      shouldTrack: result.shouldTrack,
      category: result.category,
      confidence: result.confidence,
      merchant: result.merchant,
      reason: result.reason,
    };
  }

  // ── Monthly Insights ──────────────────────────────
  static async generateInsights(transactions, budgets) {
    const summary = this.summarizeForInsights(transactions, budgets);

    const prompt = `You are a personal finance advisor for an Indian UPI user.
Analyze this spending data and generate 3-5 actionable insights.
Be specific, practical, encouraging. Use ₹ amounts. Keep each insight 1-2 sentences.

${summary}

Respond ONLY with a JSON array:
[{"type": "warning/tip/achievement", "title": "Short title", "explanation": "1-2 sentence insight", "icon": "emoji"}]`;

    try {
      const raw = await this.callGemini(prompt, 500);
      if (!raw) return this.getFallbackInsights(transactions, budgets);

      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return this.getFallbackInsights(transactions, budgets);

      return JSON.parse(jsonMatch[0]);
    } catch (_) {
      return this.getFallbackInsights(transactions, budgets);
    }
  }

  static summarizeForInsights(transactions, budgets) {
    const byCategory = {};
    transactions.forEach(txn => {
      const cat = txn.category || 'misc';
      byCategory[cat] = (byCategory[cat] || 0) + (txn.amount || 0);
    });

    const byMerchant = {};
    transactions.forEach(txn => {
      const m = txn.merchant || 'Unknown';
      byMerchant[m] = (byMerchant[m] || 0) + (txn.amount || 0);
    });
    const topMerchants = Object.entries(byMerchant)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => `${name}: ₹${Math.round(amount)}`);

    const total = transactions.reduce((s, t) => s + (t.amount || 0), 0);

    return `Total spend this cycle: ₹${Math.round(total)}
Transaction count: ${transactions.length}
By category: ${JSON.stringify(byCategory)}
Top merchants: ${topMerchants.join(', ')}
Budgets: ${JSON.stringify(
      (budgets || []).map(b => ({
        category: b.category,
        limit: b.limit,
        used: b.used,
      })),
    )}`;
  }

  // ── Fallback insights (no API needed) ─────────────
  static getFallbackInsights(transactions, budgets) {
    const insights = [];
    const byCategory = {};
    transactions.forEach(txn => {
      const cat = txn.category || 'misc';
      byCategory[cat] = (byCategory[cat] || 0) + (txn.amount || 0);
    });

    (budgets || []).forEach(budget => {
      const used = byCategory[budget.category] || 0;
      const pct = budget.limit > 0 ? (used / budget.limit) * 100 : 0;
      if (pct > 90) {
        insights.push({
          type: 'warning',
          title: `${budget.category} budget almost full`,
          explanation: `You've used ₹${Math.round(used)} of your ₹${budget.limit} ${budget.category} budget (${Math.round(pct)}%).`,
          icon: '⚠️',
        });
      }
    });

    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    if (top) {
      insights.push({
        type: 'tip',
        title: `Top spend: ${top[0]}`,
        explanation: `Your biggest expense category is ${top[0]} at ₹${Math.round(top[1])} this cycle.`,
        icon: '📊',
      });
    }

    if (transactions.length > 20) {
      const dailyAvg = transactions.reduce((s, t) => s + (t.amount || 0), 0) / 30;
      insights.push({
        type: 'tip',
        title: 'Daily average',
        explanation: `You spend roughly ₹${Math.round(dailyAvg)} per day on average.`,
        icon: '📅',
      });
    }

    return insights;
  }

  // ── Spending Pattern Analysis ─────────────────────
  static async analyzePattern(currentMonth, previousMonth) {
    const prompt = `Compare these two months of Indian user spending and identify key changes in 2-3 sentences. Be direct.
Current: ${JSON.stringify(currentMonth)}
Previous: ${JSON.stringify(previousMonth)}`;

    try {
      const raw = await this.callGemini(prompt, 150);
      return raw || null;
    } catch (_) {
      return null;
    }
  }
}
