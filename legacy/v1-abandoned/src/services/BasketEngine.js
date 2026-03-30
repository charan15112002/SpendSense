/**
 * BasketEngine.js
 *
 * Manages transaction baskets (categories):
 * 1. 12 core predefined baskets — never deleted
 * 2. AI maps free text to the closest basket
 * 3. Creates new baskets only when truly needed (max ~18 total)
 * 4. Prevents basket explosion with smart merging
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_BASKETS_KEY = 'spendsense_custom_baskets';
const API_KEY_KEY = 'anthropic_api_key';

// ── Core baskets (always present, never deleted) ──────────────

export const CORE_BASKETS = [
  { id: 'food',          label: 'Food & Dining',   icon: '🍔', color: '#FF6B6B', bg: '#FFF0F0', isCore: true },
  { id: 'groceries',     label: 'Groceries',        icon: '🛒', color: '#06D6A0', bg: '#F0FEF8', isCore: true },
  { id: 'travel',        label: 'Travel',           icon: '🚗', color: '#4ECDC4', bg: '#F0FFFE', isCore: true },
  { id: 'bills',         label: 'Bills & Utilities',icon: '💡', color: '#FFB703', bg: '#FFFBF0', isCore: true },
  { id: 'shopping',      label: 'Shopping',         icon: '🛍', color: '#A855F7', bg: '#FAF0FF', isCore: true },
  { id: 'medical',       label: 'Medical',          icon: '💊', color: '#EF233C', bg: '#FFF0F2', isCore: true },
  { id: 'entertainment', label: 'Entertainment',    icon: '🎬', color: '#FF8500', bg: '#FFF5EC', isCore: true },
  { id: 'subscription',  label: 'Subscriptions',    icon: '📱', color: '#5B4FE8', bg: '#EEF0FF', isCore: true },
  { id: 'emi',           label: 'EMI & Loans',      icon: '🏦', color: '#E63946', bg: '#FFF0F0', isCore: true },
  { id: 'investment',    label: 'Investments',      icon: '📈', color: '#2DC653', bg: '#F0FBF4', isCore: true },
  { id: 'family',        label: 'Family & Friends', icon: '👨‍👩‍👦', color: '#8B5CF6', bg: '#F5F0FF', isCore: true },
  { id: 'misc',          label: 'Miscellaneous',    icon: '📦', color: '#9CA3AF', bg: '#F9FAFB', isCore: true },
];

// ── Keyword map for fast offline classification ───────────────

const KEYWORD_MAP = {
  food:          ['zomato','swiggy','dominos','kfc','mcdonalds','burger','pizza','restaurant','cafe','hotel','biryani','food','dhaba','dinner','lunch','breakfast','canteen','mess','eat'],
  groceries:     ['bigbasket','blinkit','grofers','zepto','dmart','grocery','vegetables','milk','curd','dairy','egg','bread','rice','flour','supermarket','provisions','kiryana'],
  travel:        ['uber','ola','rapido','irctc','redbus','makemytrip','flight','metro','bus','cab','auto','petrol','diesel','fuel','train','toll','parking','rapido'],
  bills:         ['electricity','bescom','tsspdcl','tneb','water','gas','broadband','jio','airtel','bsnl','recharge','postpaid','prepaid','fastag','wifi','internet','electricity board'],
  shopping:      ['amazon','flipkart','myntra','ajio','meesho','nykaa','snapdeal','tata cliq','croma','reliance digital','mall','clothing','shoes','dress'],
  medical:       ['pharmeasy','1mg','apollo','medplus','hospital','clinic','doctor','lab','diagnostic','pharmacy','medicine','health','dentist','scan','test'],
  entertainment: ['netflix','hotstar','disney','spotify','gaana','jiosaavn','bookmyshow','pvr','inox','movie','cinema','youtube','prime video','zee5'],
  subscription:  ['subscription','plan','membership','annual','monthly plan','autopay','standing instruction','renewal'],
  emi:           ['emi','loan','equated','repayment','bajaj','home loan','car loan','personal loan','credit card'],
  investment:    ['zerodha','groww','upstox','kuvera','mutual fund','sip','nps','ppf','fd','fixed deposit','gold bond','stock','share'],
  family:        ['dad','mom','father','mother','parents','bro','brother','sister','sibling','wife','husband','son','daughter','family','home','native'],
};

export class BasketEngine {

  // ── Get all baskets (core + custom) ──────────────────────────

  static async getAllBaskets() {
    const customRaw = await AsyncStorage.getItem(CUSTOM_BASKETS_KEY);
    const custom = customRaw ? JSON.parse(customRaw) : [];
    return [...CORE_BASKETS, ...custom];
  }

  static async getCustomBaskets() {
    const raw = await AsyncStorage.getItem(CUSTOM_BASKETS_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  static getBasketById(id, allBaskets = CORE_BASKETS) {
    return allBaskets.find(b => b.id === id) || CORE_BASKETS[11]; // fallback to misc
  }

  // ── MAIN: Classify from user's free text + transaction ───────

  /**
   * User types "bought milk and curd from corner shop".
   * Returns { basketId, basketLabel, confidence, method, isNew }
   *
   * Methods: 'keyword' | 'ai' | 'pattern' | 'fallback'
   */
  static async classifyFromText(userText, transaction, existingPatternSuggestion = null) {

    // 1. Pattern engine already knows this merchant
    if (existingPatternSuggestion?.autoClassify) {
      return {
        basketId: existingPatternSuggestion.category,
        confidence: 0.95,
        method: 'pattern',
        isNew: false,
      };
    }

    // 2. Try keyword matching on user text (fast, free)
    const keywordResult = this.classifyByKeyword(userText, transaction?.merchant);
    if (keywordResult.confidence > 0.7) {
      return { ...keywordResult, method: 'keyword', isNew: false };
    }

    // 3. Try AI classification
    const apiKey = await AsyncStorage.getItem(API_KEY_KEY);
    if (apiKey) {
      try {
        const aiResult = await this.classifyWithAI(userText, transaction, apiKey);
        if (aiResult) return aiResult;
      } catch (err) {
        console.warn('[BasketEngine] AI failed, falling back:', err.message);
      }
    }

    // 4. Fallback: use keyword result even if low confidence, or misc
    if (keywordResult.basketId !== 'misc') {
      return { ...keywordResult, method: 'keyword', isNew: false };
    }

    return { basketId: 'misc', confidence: 0.3, method: 'fallback', isNew: false };
  }

  // ── Keyword classification ────────────────────────────────────

  static classifyByKeyword(text, merchantName = '') {
    const combined = `${text} ${merchantName}`.toLowerCase();
    let bestMatch = { basketId: 'misc', confidence: 0 };

    for (const [basketId, keywords] of Object.entries(KEYWORD_MAP)) {
      const matchCount = keywords.filter(k => combined.includes(k)).length;
      if (matchCount > 0) {
        const confidence = Math.min(0.6 + matchCount * 0.15, 0.95);
        if (confidence > bestMatch.confidence) {
          bestMatch = { basketId, confidence };
        }
      }
    }

    return bestMatch;
  }

  // ── AI classification via Claude ──────────────────────────────

  static async classifyWithAI(userText, transaction, apiKey) {
    const customBaskets = await this.getCustomBaskets();
    const allBasketLabels = [
      ...CORE_BASKETS.map(b => `${b.id}: ${b.label}`),
      ...customBaskets.map(b => `${b.id}: ${b.label}`),
    ].join('\n');

    const prompt = `You are a financial transaction categorizer for an Indian user.

Available baskets:
${allBasketLabels}

Transaction details:
- Merchant: ${transaction?.merchant || 'Unknown'}
- Amount: ₹${transaction?.amount || '?'}
- User's description: "${userText}"

Rules:
1. Map to the CLOSEST existing basket. Prefer broad baskets over creating new ones.
2. "milk and curd" → groceries. "mobile recharge" → bills. "Ola cab" → travel.
3. Only suggest a NEW basket if the transaction type is genuinely not covered by any existing basket.
4. Keep basket names SHORT (2-3 words max), practical, and in English.
5. Max 6 total custom baskets allowed across the app.

Respond with ONLY this JSON, nothing else:
{
  "basketId": "existing_basket_id or new_snake_case_id",
  "basketLabel": "Existing Label or New Label",
  "isNew": false,
  "confidence": 0.0-1.0,
  "reason": "one short sentence"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim();
    if (!text) return null;

    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    // If AI wants to create a new basket, check if we're under the limit
    if (parsed.isNew) {
      const allowed = await this.canCreateNewBasket();
      if (!allowed) {
        // Find closest core basket instead
        return { basketId: 'misc', confidence: 0.4, method: 'ai', isNew: false };
      }
      await this.createCustomBasket(parsed.basketId, parsed.basketLabel);
    }

    return {
      basketId: parsed.basketId,
      confidence: parsed.confidence || 0.8,
      method: 'ai',
      isNew: parsed.isNew || false,
    };
  }

  // ── Custom basket management ──────────────────────────────────

  static async canCreateNewBasket() {
    const custom = await this.getCustomBaskets();
    return custom.length < 6; // max 6 custom baskets
  }

  static async createCustomBasket(id, label) {
    const custom = await this.getCustomBaskets();

    // Don't duplicate
    if (custom.find(b => b.id === id)) return;

    // Generate a color from a set of good options
    const colors = ['#F59E0B','#10B981','#3B82F6','#EC4899','#8B5CF6','#14B8A6'];
    const bgs    = ['#FFFBEB','#ECFDF5','#EFF6FF','#FDF2F8','#F5F3FF','#F0FDFA'];
    const idx = custom.length % colors.length;

    custom.push({
      id,
      label,
      icon: '🏷️',
      color: colors[idx],
      bg: bgs[idx],
      isCore: false,
      createdAt: new Date().toISOString(),
    });

    await AsyncStorage.setItem(CUSTOM_BASKETS_KEY, JSON.stringify(custom));
  }

  static async deleteCustomBasket(id) {
    const custom = await this.getCustomBaskets();
    const filtered = custom.filter(b => b.id !== id);
    await AsyncStorage.setItem(CUSTOM_BASKETS_KEY, JSON.stringify(filtered));
  }

  // ── Basket stats for insights ─────────────────────────────────

  static groupByBasket(transactions) {
    const result = {};
    transactions.forEach(t => {
      const id = t.category || t.cat || 'misc';
      if (!result[id]) result[id] = { total: 0, count: 0, transactions: [] };
      result[id].total += t.amount || 0;
      result[id].count++;
      result[id].transactions.push(t);
    });
    return result;
  }
}
