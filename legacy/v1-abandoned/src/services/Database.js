import AsyncStorage from '@react-native-async-storage/async-storage';
import {SMSParser} from './SMSParser_v2';

const KEYS = {
  TRANSACTIONS: 'spendsense_transactions_v2',
  PATTERNS: 'spendsense_patterns_v2',
  ACTIVITY: 'spendsense_activity_v2',
  PROFILE: 'spendsense_profile',
  SYNC_STATE: 'spendsense_sync_state_v2',
  APP_STATE: 'spendsense_app_state_v2',
};

const LEGACY_KEYS = {
  TRANSACTIONS: ['ss_transactions'],
  PATTERNS: ['ss_patterns'],
  ACTIVITY: ['ss_activity'],
  PROFILE: ['ss_profile'],
};

const DEFAULT_PROFILE = {
  name: 'You',
  cycleDay: 26,
  monthlyIncome: null,
  budgetStyle: null,
  trackingWindowDays: 365,
  notificationsEnabled: false,
};

const DEFAULT_SYNC_STATE = {
  lastFullScanAt: null,
  lastSmsSyncAt: null,
  lastNotificationSyncAt: null,
  lastSyncSource: null,
  smsPermissionGranted: false,
  notificationAccessEnabled: false,
  lastError: null,
};

function safeJsonParse(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
}

function normalizeTimestamp(input) {
  if (!input) {
    return new Date().toISOString();
  }

  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function simpleHash(text) {
  let hash = 0;
  const value = normalizeText(text).toLowerCase();
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getLearningKey(txn) {
  const rawText = normalizeText(
    txn.rawSMS || txn.rawSMSText || txn.rawNotificationText,
  );
  const vpa = rawText
    .match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/)?.[1]
    ?.toLowerCase();
  if (vpa) {
    return `vpa:${vpa}`;
  }

  const merchant = normalizeText(txn.merchant || '');
  if (merchant && merchant !== 'Unknown') {
    return `merchant:${merchant
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 24)}`;
  }

  return `amount:${Math.round(Number(txn.amount || 0) / 10) * 10}`;
}

function summarizePattern(existing = {}, category, note, amount) {
  const categoryCounts = {...(existing.categoryCounts || {})};
  categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  const recentCategories = [
    ...(existing.recentCategories || []),
    category,
  ].slice(-8);
  const dominantCategory = recentCategories.reduce((acc, item) => {
    acc[item] = (acc[item] || 0) + 1;
    return acc;
  }, {});
  const currentCategory =
    Object.entries(dominantCategory).sort(
      (left, right) => right[1] - left[1],
    )[0]?.[0] || category;
  const currentCount = dominantCategory[currentCategory] || 0;
  const totalCount = (existing.count || 0) + 1;

  return {
    category: currentCategory,
    count: totalCount,
    avg_amount: Math.round(
      ((existing.avg_amount || 0) * (existing.count || 0) + (amount || 0)) /
        totalCount,
    ),
    last_seen: new Date().toISOString(),
    auto_classify:
      totalCount >= 4 && currentCount / recentCategories.length >= 0.7,
    notes: note || existing.notes || '',
    categoryCounts,
    recentCategories,
  };
}

function normalizeTxn(txn) {
  const timestamp = normalizeTimestamp(txn.timestamp);
  const merchant = normalizeText(txn.merchant || txn.from || 'Unknown');
  const rawText = normalizeText(
    txn.rawSMS || txn.rawSMSText || txn.rawNotificationText,
  );
  const sourceType =
    txn.sourceType || (txn.rawNotificationText ? 'notification' : 'sms');
  const amount = Number(txn.amount || 0);

  const fingerprintBase = [
    txn.upiRef || '',
    amount ? amount.toFixed(2) : '0',
    txn.flow || '',
    merchant.toLowerCase(),
    rawText.slice(0, 80).toLowerCase(),
    timestamp.slice(0, 16),
  ].join('|');

  return {
    id: txn.id || `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp,
    amount,
    flow: txn.flow || 'debit',
    merchant,
    from: txn.from || null,
    creditType: txn.creditType || null,
    category: txn.category || txn.creditType || 'misc',
    suggestedCategory: txn.suggestedCategory || null,
    upiRef: txn.upiRef || null,
    account: txn.account || null,
    bank: txn.bank || null,
    sourceApp: txn.sourceApp || 'Bank SMS',
    sourceType,
    sourceId: txn.sourceId || null,
    rawSMS: txn.rawSMS || txn.rawSMSText || null,
    rawNotificationText: txn.rawNotificationText || null,
    rawSender: txn.rawSender || txn.sender || null,
    balance: txn.balance ?? null,
    transactionType: txn.transactionType || 'UPI',
    status: txn.status || 'review',
    userNote: txn.userNote || null,
    autoClassified: Boolean(txn.autoClassified),
    aiConfidence: txn.aiConfidence ?? null,
    parserConfidence: txn.parserConfidence ?? null,
    confidenceScore:
      txn.confidenceScore ?? txn.aiConfidence ?? txn.parserConfidence ?? null,
    needsUserReview: Boolean(txn.needsUserReview),
    needsUserNote: Boolean(txn.needsUserNote),
    reviewGroupKey: txn.reviewGroupKey || getLearningKey(txn),
    classifierReason: txn.classifierReason || null,
    parserVersion: txn.parserVersion || 'v4',
    fingerprint: txn.fingerprint || simpleHash(fingerprintBase),
    lastUpdatedAt: new Date().toISOString(),
  };
}

export class Database {
  static initialized = false;
  static initPromise = null;

  static async init() {
    if (this.initialized) {
      return true;
    }

    // Prevent concurrent init — all callers wait on the same promise
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._runInit();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
    return true;
  }

  static async _runInit() {
    console.log('[Database] init: starting migration + reconciliation...');
    await this.migrateLegacyData();
    await this.reconcileStoredTransactions();
    this.initialized = true;
    const raw = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    const count = safeJsonParse(raw, []).length;
    console.log(`[Database] init: complete. ${count} transactions in storage.`);
  }

  static async migrateLegacyData() {
    const existingTransactions = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    if (!existingTransactions) {
      for (const legacyKey of LEGACY_KEYS.TRANSACTIONS) {
        const legacyValue = await AsyncStorage.getItem(legacyKey);
        if (legacyValue) {
          const legacyTransactions = safeJsonParse(legacyValue, []);
          const normalized = legacyTransactions.map(txn => normalizeTxn(txn));
          await AsyncStorage.setItem(
            KEYS.TRANSACTIONS,
            JSON.stringify(this.sortTransactions(normalized)),
          );
          break;
        }
      }
    }

    const existingPatterns = await AsyncStorage.getItem(KEYS.PATTERNS);
    if (!existingPatterns) {
      for (const legacyKey of LEGACY_KEYS.PATTERNS) {
        const legacyValue = await AsyncStorage.getItem(legacyKey);
        if (legacyValue) {
          await AsyncStorage.setItem(KEYS.PATTERNS, legacyValue);
          break;
        }
      }
    }

    const existingActivity = await AsyncStorage.getItem(KEYS.ACTIVITY);
    if (!existingActivity) {
      for (const legacyKey of LEGACY_KEYS.ACTIVITY) {
        const legacyValue = await AsyncStorage.getItem(legacyKey);
        if (legacyValue) {
          await AsyncStorage.setItem(KEYS.ACTIVITY, legacyValue);
          break;
        }
      }
    }

    const existingProfile = await AsyncStorage.getItem(KEYS.PROFILE);
    if (!existingProfile) {
      for (const legacyKey of LEGACY_KEYS.PROFILE) {
        const legacyValue = await AsyncStorage.getItem(legacyKey);
        if (legacyValue) {
          const legacyProfile = safeJsonParse(legacyValue, {});
          await AsyncStorage.setItem(
            KEYS.PROFILE,
            JSON.stringify({...DEFAULT_PROFILE, ...legacyProfile}),
          );
          break;
        }
      }
    }

    if (!(await AsyncStorage.getItem(KEYS.PROFILE))) {
      await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
    }

    if (!(await AsyncStorage.getItem(KEYS.SYNC_STATE))) {
      await AsyncStorage.setItem(
        KEYS.SYNC_STATE,
        JSON.stringify(DEFAULT_SYNC_STATE),
      );
    }
  }

  static async reconcileStoredTransactions() {
    const appState = await this.loadAppState();

    // Run junk/duplicate purge once on upgrade to V7
    // V7 fixes: re-parse all raw SMS through updated parser that catches
    // 'rejection'/'rejected' as failed, filters more promo patterns,
    // and improves merchant extraction (no more phone-number merchants).
    if (!appState.storageMigrationV9) {
      try {
        const removed = await this.purgeJunkTransactions();
        console.log(`[Database] V8 purge: removed ${removed} junk/duplicate entries`);
        const reparsed = await this.reparseAllTransactions();
        console.log(`[Database] V8 reparse: updated ${reparsed} transactions`);
      } catch (err) {
        console.warn('[Database] V8 migration failed (non-fatal):', err?.message);
      }
      await this.saveAppState({storageMigrationV9: true});
    }

    if (appState.storageMigrationV4) {
      return;
    }

    const raw = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    const all = this.sortTransactions(safeJsonParse(raw, []));
    let changed = false;
    const next = [];

    all.forEach(txn => {
      const rawText = txn.rawSMS || txn.rawNotificationText || txn.rawSMSText;
      const userTouched = Boolean(txn.userNote) || txn.status === 'confirmed';

      if (rawText) {
        const reparsed = SMSParser.parse(
          rawText,
          txn.rawSender || txn.bank || txn.sourceApp || '',
        );
        if (!reparsed && !userTouched) {
          changed = true;
          return;
        }

        if (reparsed) {
          txn = {
            ...txn,
            flow: reparsed.flow || txn.flow,
            merchant:
              txn.merchant !== 'Unknown'
                ? txn.merchant
                : reparsed.merchant || txn.merchant,
            category:
              txn.category && txn.category !== 'misc'
                ? txn.category
                : reparsed.category || txn.category,
            upiRef: txn.upiRef || reparsed.upiRef,
            parserConfidence:
              reparsed.parserConfidence ?? txn.parserConfidence ?? null,
            parserVersion: 'v4',
          };
        }
      }

      const ageHours =
        Math.abs(Date.now() - new Date(txn.timestamp).getTime()) /
        (1000 * 60 * 60);
      if (txn.status === 'pending' && ageHours > 72) {
        txn = {
          ...txn,
          status:
            txn.category && txn.category !== 'misc' ? 'confirmed' : 'review',
          needsUserNote: false,
          needsUserReview: txn.category === 'misc' || !txn.category,
        };
        changed = true;
      }

      next.push(normalizeTxn(txn));
    });

    if (changed) {
      await this._saveTxns(next);
    }

    await this.saveAppState({storageMigrationV4: true});
  }

  static sortTransactions(transactions) {
    return [...transactions].sort(
      (left, right) =>
        new Date(right.timestamp).getTime() -
        new Date(left.timestamp).getTime(),
    );
  }

  static async _loadTxns() {
    await this.init();
    const raw = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    return this.sortTransactions(safeJsonParse(raw, []));
  }

  static async _saveTxns(transactions) {
    const trimmed = this.sortTransactions(transactions).slice(0, 5000);
    await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(trimmed));
  }

  static async findDuplicate(txn) {
    const incoming = normalizeTxn(txn);
    const all = await this._loadTxns();

    return (
      all.find(existing => {
        if (incoming.id && existing.id === incoming.id) {
          return true;
        }

        if (
          incoming.upiRef &&
          existing.upiRef &&
          incoming.upiRef === existing.upiRef
        ) {
          return true;
        }

        if (
          incoming.fingerprint &&
          existing.fingerprint === incoming.fingerprint
        ) {
          return true;
        }

        if (
          incoming.rawSMS &&
          existing.rawSMS &&
          simpleHash(incoming.rawSMS) === simpleHash(existing.rawSMS)
        ) {
          return true;
        }

        if (
          incoming.rawNotificationText &&
          existing.rawNotificationText &&
          simpleHash(incoming.rawNotificationText) ===
            simpleHash(existing.rawNotificationText)
        ) {
          return true;
        }

        if (
          !incoming.amount ||
          !existing.amount ||
          incoming.flow !== existing.flow
        ) {
          return false;
        }

        const timeDiff = Math.abs(
          new Date(incoming.timestamp).getTime() -
            new Date(existing.timestamp).getTime(),
        );

        // Same merchant + same amount within 3 minutes = duplicate
        const sameExactTxn =
          incoming.amount === existing.amount &&
          normalizeText(incoming.merchant).toLowerCase() ===
            normalizeText(existing.merchant).toLowerCase() &&
          timeDiff < 3 * 60 * 1000;

        if (sameExactTxn) {
          return true;
        }

        // Cross-source: same amount + same flow within 30 minutes from different source types
        // (covers bank SMS + UPI notification arriving close together for the same payment)
        // 30 min is tight enough to avoid false-positives (two different ₹X payments same day)
        // while still catching SMS + notification pairs
        const crossSourceDuplicate =
          incoming.amount === existing.amount &&
          timeDiff < 30 * 60 * 1000 &&
          incoming.sourceType !== existing.sourceType;

        return crossSourceDuplicate;
      }) || null
    );
  }

  static async saveTxn(txn) {
    const normalized = normalizeTxn(txn);
    const all = await this._loadTxns();
    const duplicate = await this.findDuplicate(normalized);

    if (duplicate) {
      const merged = all.map(existing => {
        if (existing.id !== duplicate.id) {
          return existing;
        }

        return normalizeTxn({
          ...existing,
          ...normalized,
          id: existing.id,
          status:
            existing.status === 'confirmed' || normalized.status === 'confirmed'
              ? 'confirmed'
              : normalized.status || existing.status,
          userNote: existing.userNote || normalized.userNote,
          category:
            existing.category && existing.category !== 'misc'
              ? existing.category
              : normalized.category || existing.category,
        });
      });

      await this._saveTxns(merged);
      return duplicate.id;
    }

    all.unshift(normalized);
    await this._saveTxns(all);
    return normalized.id;
  }

  static async updateTxn(id, fields) {
    const all = await this._loadTxns();
    const updated = all.map(txn =>
      txn.id === id ? normalizeTxn({...txn, ...fields, id}) : txn,
    );
    await this._saveTxns(updated);
  }

  static async applyCategoryToMatchingTransactions(
    referenceTxn,
    {category, userNote},
  ) {
    const key = getLearningKey(referenceTxn);
    if (key.startsWith('amount:')) {
      return 0;
    }

    const all = await this._loadTxns();
    let updatedCount = 0;

    const updated = all.map(txn => {
      if (txn.id === referenceTxn.id || txn.flow !== referenceTxn.flow) {
        return txn;
      }

      if (getLearningKey(txn) !== key) {
        return txn;
      }

      updatedCount += 1;
      return normalizeTxn({
        ...txn,
        category,
        suggestedCategory: category,
        status: 'confirmed',
        autoClassified: true,
        userNote: txn.userNote || userNote || null,
      });
    });

    if (updatedCount > 0) {
      await this._saveTxns(updated);
    }

    return updatedCount;
  }

  static async getTxns({
    limit = 100,
    flow,
    dateFrom,
    dateTo,
    status,
    search,
  } = {}) {
    let all = await this._loadTxns();

    if (flow) {
      all = all.filter(txn => txn.flow === flow);
    }

    if (status) {
      all = all.filter(txn => txn.status === status);
    }

    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      all = all.filter(txn => new Date(txn.timestamp).getTime() >= from);
    }

    if (dateTo) {
      const to = new Date(dateTo).getTime();
      all = all.filter(txn => new Date(txn.timestamp).getTime() <= to);
    }

    if (search) {
      const query = normalizeText(search).toLowerCase();
      all = all.filter(txn =>
        [
          txn.merchant,
          txn.userNote,
          txn.category,
          txn.bank,
          txn.sourceApp,
          txn.from,
          txn.amount,
        ]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query)),
      );
    }

    all = all.filter(txn => txn.status !== 'ignored');

    return all.slice(0, limit);
  }

  static async getPendingTxns() {
    return this.getTxns({status: 'pending', limit: 50});
  }

  static async getRecent(limit = 10) {
    return this.getTxns({limit});
  }

  static async getTxnById(id) {
    const all = await this._loadTxns();
    return all.find(txn => txn.id === id) || null;
  }

  static async deleteTxn(id) {
    const all = await this._loadTxns();
    await this._saveTxns(all.filter(txn => txn.id !== id));
  }

  static async getTotalByFlow(flow, dateFrom, dateTo) {
    const txns = await this.getTxns({flow, dateFrom, dateTo, limit: 5000});
    return {
      total: txns.reduce((sum, txn) => sum + (txn.amount || 0), 0),
      count: txns.length,
    };
  }

  static async getByCategory(dateFrom, dateTo) {
    const txns = await this.getTxns({
      flow: 'debit',
      dateFrom,
      dateTo,
      limit: 5000,
    });
    const grouped = {};

    txns.forEach(txn => {
      const category = txn.category || txn.suggestedCategory || 'misc';
      if (!grouped[category]) {
        grouped[category] = {category, total: 0, count: 0};
      }
      grouped[category].total += txn.amount || 0;
      grouped[category].count += 1;
    });

    return Object.values(grouped).sort(
      (left, right) => right.total - left.total,
    );
  }

  static async getDailySpend(dateFrom, dateTo) {
    const txns = await this.getTxns({
      flow: 'debit',
      dateFrom,
      dateTo,
      limit: 5000,
    });
    const grouped = {};

    txns.forEach(txn => {
      const dateKey = txn.timestamp.slice(0, 10);
      if (!grouped[dateKey]) {
        grouped[dateKey] = {date: dateKey, total: 0, count: 0};
      }
      grouped[dateKey].total += txn.amount || 0;
      grouped[dateKey].count += 1;
    });

    return Object.values(grouped).sort((left, right) =>
      left.date.localeCompare(right.date),
    );
  }

  static async getTopMerchants({dateFrom, dateTo, limit = 5} = {}) {
    const txns = await this.getTxns({
      flow: 'debit',
      dateFrom,
      dateTo,
      limit: 5000,
    });
    const grouped = {};

    txns.forEach(txn => {
      const merchant = txn.merchant || 'Unknown';
      if (!grouped[merchant]) {
        grouped[merchant] = {merchant, total: 0, count: 0};
      }
      grouped[merchant].total += txn.amount || 0;
      grouped[merchant].count += 1;
    });

    return Object.values(grouped)
      .sort((left, right) => right.total - left.total)
      .slice(0, limit);
  }

  static async getSummary(dateFrom, dateTo) {
    const txns = await this.getTxns({dateFrom, dateTo, limit: 5000});
    const summary = {
      spent: 0,
      income: 0,
      transfers: 0,
      pending: 0,
      count: txns.length,
    };

    txns.forEach(txn => {
      if (txn.flow === 'credit') {
        summary.income += txn.amount || 0;
      } else if (txn.flow === 'transfer') {
        summary.transfers += txn.amount || 0;
      } else {
        summary.spent += txn.amount || 0;
      }

      if (txn.status === 'pending') {
        summary.pending += 1;
      }
    });

    return summary;
  }

  static async upsertPattern(key, name, category, amount, note) {
    const raw = await AsyncStorage.getItem(KEYS.PATTERNS);
    const all = safeJsonParse(raw, {});
    const existing = all[key];

    if (existing) {
      all[key] = {
        ...summarizePattern(existing, category, note, amount),
        merchant_key: key,
        merchant_name: name || existing.merchant_name,
      };
    } else {
      all[key] = {
        merchant_key: key,
        merchant_name: name || 'Unknown',
        ...summarizePattern({}, category, note, amount),
      };
    }

    await AsyncStorage.setItem(KEYS.PATTERNS, JSON.stringify(all));
  }

  static async getPattern(key) {
    const raw = await AsyncStorage.getItem(KEYS.PATTERNS);
    const all = safeJsonParse(raw, {});
    const pattern = all[key];
    if (!pattern) {
      return null;
    }

    return {
      ...pattern,
      category:
        pattern.category ||
        Object.entries(pattern.categoryCounts || {}).sort(
          (left, right) => right[1] - left[1],
        )[0]?.[0] ||
        null,
      auto_classify: Boolean(pattern.auto_classify),
    };
  }

  static async getAllPatterns() {
    const raw = await AsyncStorage.getItem(KEYS.PATTERNS);
    const all = safeJsonParse(raw, {});
    return Object.values(all)
      .filter(pattern => pattern.count >= 3)
      .sort((left, right) => right.count - left.count);
  }

  static async log(action, screen, detail = '') {
    const raw = await AsyncStorage.getItem(KEYS.ACTIVITY);
    const logs = safeJsonParse(raw, []);
    logs.unshift({
      timestamp: new Date().toISOString(),
      action,
      screen,
      detail:
        typeof detail === 'object' ? JSON.stringify(detail) : String(detail),
    });
    await AsyncStorage.setItem(
      KEYS.ACTIVITY,
      JSON.stringify(logs.slice(0, 500)),
    );
  }

  static async getActivityLog(limit = 200) {
    const raw = await AsyncStorage.getItem(KEYS.ACTIVITY);
    return safeJsonParse(raw, []).slice(0, limit);
  }

  static async exportActivityLog() {
    const logs = await this.getActivityLog(500);
    return logs
      .map(
        log =>
          `[${log.timestamp}] ${log.screen} -> ${log.action}: ${log.detail}`,
      )
      .join('\n');
  }

  static async saveProfile(profile) {
    const existing = await this.loadProfile();
    await AsyncStorage.setItem(
      KEYS.PROFILE,
      JSON.stringify({...existing, ...profile}),
    );
  }

  static async loadProfile() {
    await this.init();
    const raw = await AsyncStorage.getItem(KEYS.PROFILE);
    return {...DEFAULT_PROFILE, ...safeJsonParse(raw, {})};
  }

  static async saveSyncState(partial) {
    const current = await this.loadSyncState();
    const next = {
      ...current,
      ...partial,
    };
    await AsyncStorage.setItem(KEYS.SYNC_STATE, JSON.stringify(next));
    return next;
  }

  static async loadSyncState() {
    await this.init();
    const raw = await AsyncStorage.getItem(KEYS.SYNC_STATE);
    return {...DEFAULT_SYNC_STATE, ...safeJsonParse(raw, {})};
  }

  static async saveAppState(partial) {
    const raw = await AsyncStorage.getItem(KEYS.APP_STATE);
    const current = safeJsonParse(raw, {});
    const next = {...current, ...partial};
    await AsyncStorage.setItem(KEYS.APP_STATE, JSON.stringify(next));
    return next;
  }

  static async loadAppState() {
    const raw = await AsyncStorage.getItem(KEYS.APP_STATE);
    return safeJsonParse(raw, {});
  }

  /**
   * Remove junk transactions that were incorrectly imported:
   * - Transactions from Gmail or non-UPI app notification sources
   * - Near-duplicate entries: same amount + flow + 60min window regardless of source (keep best one)
   * Returns the number of transactions removed.
   */
  static async purgeJunkTransactions() {
    // Read directly from AsyncStorage to avoid calling _loadTxns() → init() → recursive loop
    const raw = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    const all = this.sortTransactions(safeJsonParse(raw, []));
    const JUNK_SENDER_PATTERNS = [
      'android.gm',
      'com.google.android.gm',
      'gmail',
    ];

    // Step 1: remove Gmail-sourced entries
    const withoutGmail = all.filter(txn => {
      const sender = (txn.rawSender || txn.sourceApp || '').toLowerCase();
      return !JUNK_SENDER_PATTERNS.some(pattern => sender.includes(pattern));
    });

    // Step 2: cross-source dedup — same amount + same flow + within 60min = same payment
    // (covers Bank SMS + Paytm notification + any other source for the same transaction)
    // sourceType is intentionally NOT part of the key so cross-source dups are caught
    const deduped = [];
    for (const txn of withoutGmail) {
      const txnTs = new Date(txn.timestamp).getTime();

      const existingIndex = deduped.findIndex(d => {
        if (!d.amount || d.amount !== txn.amount) return false;
        if (d.flow !== txn.flow) return false;
        // UPI ref match is definitive
        if (d.upiRef && txn.upiRef && d.upiRef === txn.upiRef) return true;
        // Same amount + same flow within 60 minutes = same payment from different source
        const timeDiff = Math.abs(new Date(d.timestamp).getTime() - txnTs);
        return timeDiff < 60 * 60 * 1000;
      });

      if (existingIndex === -1) {
        deduped.push(txn);
      } else {
        // Keep the entry with more complete data
        const existing = deduped[existingIndex];
        const score = t =>
          (t.upiRef ? 3 : 0) +
          (t.userNote ? 2 : 0) +
          (t.category && t.category !== 'misc' ? 2 : 0) +
          (t.merchant && t.merchant !== 'Unknown' ? 1 : 0) +
          (t.sourceType === 'sms' ? 1 : 0); // prefer SMS as ground truth
        if (score(txn) > score(existing)) {
          deduped[existingIndex] = txn;
        }
      }
    }

    const removed = all.length - deduped.length;
    if (removed > 0) {
      await this._saveTxns(deduped);
    }
    return removed;
  }

  /**
   * Re-parse all stored transactions through the latest SMSParser.
   * - Removes entries the parser now rejects (failed txns, promo SMS)
   * - Cross-references: if a rejection/failed SMS exists for amount X,
   *   also removes any matching debit of amount X on the same day
   *   (banks send "debited" SMS first, then "rejection" SMS — both must go)
   * - Updates merchant names using improved extraction
   * Returns the number of transactions modified or removed.
   */
  static async reparseAllTransactions() {
    const raw = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    const all = this.sortTransactions(safeJsonParse(raw, []));

    // ── Pass 1: Identify failed/rejected amounts ──
    // Scan ALL stored transactions' raw text for failure indicators.
    // Also scan raw text of transactions that the parser NOW rejects.
    const failedAmounts = new Map(); // amount → Set of date strings (YYYY-MM-DD)

    for (const txn of all) {
      const rawText = (txn.rawSMS || txn.rawSMSText || txn.rawNotificationText || '').toLowerCase();
      if (!rawText) continue;

      const FAIL_MARKERS = [
        'rejection', 'rejected', 'failed', 'failure', 'declined',
        'reversed', 'reversal', 'insufficient', 'unsuccessful',
        'could not', 'unable to', 'not successful', 'cancelled',
        'not been debited', 'will be reversed', 'has been reversed',
      ];

      const hasFail = FAIL_MARKERS.some(m => rawText.includes(m));
      if (hasFail && txn.amount > 0) {
        const dateKey = (txn.timestamp || '').slice(0, 10);
        if (!failedAmounts.has(txn.amount)) {
          failedAmounts.set(txn.amount, new Set());
        }
        failedAmounts.get(txn.amount).add(dateKey);
      }
    }

    console.log(`[Database] reparseAll: found ${failedAmounts.size} failed amount(s):`,
      [...failedAmounts.entries()].map(([amt, dates]) => `₹${amt} on ${[...dates].join(',')}`));

    // ── Pass 2: Filter and update transactions ──
    const kept = [];
    let changed = 0;

    for (const txn of all) {
      const rawText = txn.rawSMS || txn.rawSMSText || txn.rawNotificationText;
      const userTouched = Boolean(txn.userNote) || txn.status === 'confirmed';

      // If user already confirmed, keep as-is
      if (userTouched) {
        kept.push(txn);
        continue;
      }

      // Check if this debit matches a known failed amount on the same day
      if (txn.flow === 'debit' && txn.amount > 0) {
        const dateKey = (txn.timestamp || '').slice(0, 10);
        const failedDates = failedAmounts.get(txn.amount);
        if (failedDates && failedDates.has(dateKey)) {
          console.log(`[Database] Removing failed debit: ₹${txn.amount} on ${dateKey} (${txn.merchant})`);
          changed += 1;
          continue; // Remove this — it matches a failed/rejected transaction
        }
      }

      // Re-parse through updated parser
      if (rawText) {
        const reparsed = SMSParser.parse(
          rawText,
          txn.rawSender || txn.bank || txn.sourceApp || '',
        );

        // Parser now rejects it (failed txn, promo, etc.) → remove
        if (!reparsed) {
          changed += 1;
          continue;
        }

        // Update merchant if parser found a better name
        const oldMerchant = txn.merchant || 'Unknown';
        const newMerchant = reparsed.merchant || oldMerchant;
        const merchantImproved =
          (oldMerchant === 'Unknown' || /^\d{5,}/.test(oldMerchant)) &&
          newMerchant !== 'Unknown' &&
          !/^\d{5,}/.test(newMerchant);

        if (merchantImproved || reparsed.flow !== txn.flow) {
          kept.push(
            normalizeTxn({
              ...txn,
              merchant: merchantImproved ? newMerchant : txn.merchant,
              flow: reparsed.flow || txn.flow,
              category:
                txn.category && txn.category !== 'misc'
                  ? txn.category
                  : reparsed.category || txn.category,
              parserVersion: 'v5',
            }),
          );
          changed += 1;
        } else {
          kept.push(txn);
        }
      } else {
        kept.push(txn);
      }
    }

    if (changed > 0) {
      await this._saveTxns(kept);
    }
    return changed;
  }

  /**
   * Batch import transactions efficiently:
   * Loads existing transactions ONCE, deduplicates all candidates in memory,
   * then writes all new ones in a single save. Far faster than calling
   * saveTxn() in a loop (which does N×2 DB reads).
   */
  static async batchImportTxns(rawTxns) {
    if (!rawTxns || rawTxns.length === 0) {
      console.log('[Database] batchImportTxns: 0 candidates passed');
      return 0;
    }

    console.log(`[Database] batchImportTxns: ${rawTxns.length} candidates`);
    const existing = await this._loadTxns();
    console.log(`[Database] batchImportTxns: ${existing.length} existing in DB`);
    const existingIds = new Set(existing.map(t => t.id));
    const existingUpiRefs = new Set(
      existing.filter(t => t.upiRef).map(t => t.upiRef),
    );
    const existingFingerprints = new Set(
      existing.map(t => t.fingerprint).filter(Boolean),
    );
    const existingRawHashes = new Set(
      existing.filter(t => t.rawSMS).map(t => simpleHash(t.rawSMS)),
    );

    const toAdd = [];

    for (const raw of rawTxns) {
      const norm = normalizeTxn(raw);

      // Check against existing stored transactions
      if (existingIds.has(norm.id)) {
        continue;
      }
      if (norm.upiRef && existingUpiRefs.has(norm.upiRef)) {
        continue;
      }
      if (norm.fingerprint && existingFingerprints.has(norm.fingerprint)) {
        continue;
      }
      if (norm.rawSMS && existingRawHashes.has(simpleHash(norm.rawSMS))) {
        continue;
      }

      // Check against already-queued batch (intra-batch dedup)
      const normTs = new Date(norm.timestamp).getTime();
      const batchDup = toAdd.find(queued => {
        if (!queued.amount || queued.amount !== norm.amount) {
          return false;
        }
        if (queued.flow !== norm.flow) {
          return false;
        }
        if (queued.upiRef && norm.upiRef && queued.upiRef === norm.upiRef) {
          return true;
        }
        if (queued.fingerprint && queued.fingerprint === norm.fingerprint) {
          return true;
        }
        const timeDiff = Math.abs(
          new Date(queued.timestamp).getTime() - normTs,
        );
        return timeDiff < 10 * 60 * 1000; // same amount within 10 min = same payment
      });
      if (batchDup) {
        continue;
      }

      // Track in sets so subsequent iterations also dedup against this one
      existingIds.add(norm.id);
      if (norm.upiRef) {
        existingUpiRefs.add(norm.upiRef);
      }
      if (norm.fingerprint) {
        existingFingerprints.add(norm.fingerprint);
      }
      if (norm.rawSMS) {
        existingRawHashes.add(simpleHash(norm.rawSMS));
      }

      toAdd.push(norm);
    }

    if (toAdd.length > 0) {
      const merged = this.sortTransactions([...toAdd, ...existing]);
      await this._saveTxns(merged);
    }

    console.log(`[Database] batchImportTxns: ${toAdd.length} new saved, ${rawTxns.length - toAdd.length} skipped as dupes`);
    return toAdd.length;
  }

  static async clearAll() {
    await AsyncStorage.multiRemove(Object.values(KEYS));
    this.initialized = false;
    await this.init();
  }
}
