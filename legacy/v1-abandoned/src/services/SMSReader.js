import {DeviceEventEmitter, NativeModules, Platform} from 'react-native';

async function sendNativeNotification(txn) {
  if (!txn || txn.flow !== 'debit') return;
  try {
    const mod = NativeModules.SpendSenseTracking;
    if (mod && typeof mod.showTransactionNotification === 'function') {
      await mod.showTransactionNotification(
        txn.id,
        Math.round(txn.amount || 0).toString(),
        txn.merchant || 'Unknown',
        txn.sourceApp || 'Bank SMS',
      );
    }
  } catch (_) {}
}
import {Database} from './Database';
import {SMSParser} from './SMSParser_v2';
import {TransactionIntelligence} from './TransactionIntelligence';

let onNewTransaction = null;

// Use our own SpendSenseTracking native module for SMS reading.
// This bypasses react-native-get-sms-android which has linking issues.
function getNativeTrackingModule() {
  return NativeModules.SpendSenseTracking || null;
}

export class SMSReader {
  static setTransactionCallback(callback) {
    onNewTransaction = callback;
  }

  // Reads historical SMS from device inbox using our native Kotlin module.
  static async fetchMessages({daysBack = 365, maxMessages = 2000} = {}) {
    if (Platform.OS !== 'android') {
      return [];
    }

    const mod = getNativeTrackingModule();
    if (!mod || typeof mod.readHistoricalSms !== 'function') {
      console.warn('[SMSReader] Native readHistoricalSms not available');
      return [];
    }

    try {
      const json = await mod.readHistoricalSms(daysBack, Math.min(maxMessages, 3000));
      const parsed = JSON.parse(json || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('[SMSReader] readHistoricalSms failed:', err?.message);
      return [];
    }
  }

  static async readExistingSMS(daysBack = 365, options = {}) {
    const messages = await this.fetchMessages({daysBack, ...options});
    console.log(`[SMSReader] readExistingSMS: ${messages.length} raw messages fetched for ${daysBack} days`);
    if (!messages.length) {
      return [];
    }

    // Phase 1: parse + enrich all messages (no DB reads inside this loop)
    // This replaces the old one-by-one approach which did 3 DB reads per message.
    const candidates = [];
    for (const message of messages) {
      const normalized = String(message.body || '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!normalized) {
        continue;
      }

      let txn = null;
      try {
        txn = SMSParser.parse(normalized, message.address || '');
      } catch (_) {
        continue;
      }
      if (!txn) {
        continue;
      }

      const enrichedBase = {
        ...txn,
        timestamp: new Date(
          Number(message.date) || Date.now(),
        ).toISOString(),
        rawSMS: normalized,
        rawSender: message.address || null,
        sourceType: 'sms',
        sourceId: message._id ? `sms_${message._id}` : null,
      };

      let enriched = null;
      try {
        enriched = await TransactionIntelligence.enrichTransaction(
          enrichedBase,
          {historical: true},
        );
      } catch (_) {
        continue;
      }
      if (!enriched) {
        continue;
      }

      candidates.push(enriched);
    }

    console.log(`[SMSReader] readExistingSMS: ${candidates.length} parsed as transactions from ${messages.length} total SMS`);
    if (!candidates.length) {
      return [];
    }

    // Phase 2: single batch write — 1 DB read + 1 DB write total
    const addedCount = await Database.batchImportTxns(candidates);

    if (addedCount > 0) {
      DeviceEventEmitter.emit('transactions:updated', {
        reason: 'sms_sync',
        addedCount,
      });
      await Database.log('sms_batch_import', 'SMSReader', {
        addedCount,
        parsed: candidates.length,
        total: messages.length,
      });
    }

    return candidates.slice(0, addedCount);
  }

  // Live SMS listening is handled natively by SpendSenseSmsReceiver.kt
  // which stores events in TrackingStore. TransactionTracker polls these
  // every 8 seconds via drainPendingNativeEvents(). No JS-layer listener needed.
  static startListening() {
    // No-op: live SMS handled by native SpendSenseSmsReceiver → TrackingStore
  }

  static stopListening() {
    // No-op
  }

  static async processMessage(
    body,
    sender,
    timestamp,
    notifyUser = true,
    meta = {},
  ) {
    const normalized = String(body || '').replace(/\s+/g, ' ').trim();
    if (!normalized) {
      return null;
    }

    let txn = null;
    try {
      txn = SMSParser.parse(normalized, sender || '');
    } catch (_) {
      return null;
    }

    if (!txn) {
      return null;
    }

    const enrichedBase = {
      ...txn,
      timestamp: new Date(
        Number(timestamp) || timestamp || Date.now(),
      ).toISOString(),
      rawSMS: normalized,
      rawSender: sender || null,
      sourceType: meta.sourceType || 'sms',
      sourceId: meta.sourceId || null,
    };

    const enriched = await TransactionIntelligence.enrichTransaction(
      enrichedBase,
      {historical: Boolean(meta.historical)},
    );

    if (!enriched) {
      return null;
    }

    const duplicate = await Database.findDuplicate(enriched);
    if (duplicate) {
      return null;
    }

    const id = await Database.saveTxn(enriched);
    const saved = await Database.getTxnById(id);

    if (saved) {
      await Database.log('transaction_detected', 'SMSReader', {
        flow: saved.flow,
        amount: saved.amount,
        sender: saved.rawSender,
      });
      DeviceEventEmitter.emit('transactions:updated', {
        reason: notifyUser ? 'sms_live' : 'sms_sync',
        addedCount: 1,
      });
    }

    if (saved?.status === 'pending' && onNewTransaction) {
      onNewTransaction(saved);
    }

    // Send push notification for live (non-historical) payments
    if (notifyUser && saved?.status === 'pending') {
      await sendNativeNotification(saved);
    }

    return saved;
  }

  static getMerchantKey(txn) {
    return TransactionIntelligence.getPatternKey(txn);
  }
}
