import {
  AppState,
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {Database} from './Database';
import {NativeTracking} from './NativeTracking';
import {SMSReader} from './SMSReader';
import {SMSParser} from './SMSParser_v2';
import {TransactionIntelligence} from './TransactionIntelligence';

const UPI_NOTIFICATION_PACKAGES = {
  'com.google.android.apps.nbu.paisa.user': 'GPay',
  'com.phonepe.app': 'PhonePe',
  'net.one97.paytm': 'Paytm',
  'in.org.npci.upiapp': 'BHIM',
  'com.amazon.mShop.android.shopping': 'Amazon Pay',
  'com.whatsapp': 'WhatsApp Pay',
  'com.sbi.lotusintouch': 'SBI YONO',
  'com.hdfcbank.hdfcbankservices': 'HDFC Bank',
  'com.csam.icici.bank.imobile': 'ICICI iMobile',
  'com.icicibank.mobilebanking': 'ICICI Bank',
  'com.axisbank.axismobile': 'Axis Bank',
};

let initialized = false;
let appStateSubscription = null;
let syncInFlight = null;
let nativeEventSyncInFlight = null;
let nativePollingInterval = null;
const NATIVE_POLL_INTERVAL_MS = 8000;

function notificationToText(event) {
  return [event.title, event.text, event.bigText, event.subText]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export class TransactionTracker {
  static async initialize() {
    if (initialized || Platform.OS !== 'android') {
      return;
    }

    await Database.init();
    initialized = true;

    SMSReader.startListening();
    appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        this.startNativeEventPolling();
        this.flushPendingNativeEvents({reason: 'resume_native'});
        this.syncAll({daysBack: 7, reason: 'resume'});
      } else {
        this.stopNativeEventPolling();
      }
    });

    const syncState = await Database.loadSyncState();
    const startupWindow = syncState.lastFullScanAt
      ? Math.min(await this.getDefaultScanWindow(), 30)
      : await this.getDefaultScanWindow();
    await this.syncAll({daysBack: startupWindow, reason: 'startup'});
    this.startNativeEventPolling();
  }

  static stop() {
    SMSReader.stopListening();
    appStateSubscription?.remove?.();
    appStateSubscription = null;
    this.stopNativeEventPolling();
    initialized = false;
  }

  static async getDefaultScanWindow() {
    const profile = await Database.loadProfile();
    return Number(profile.trackingWindowDays) || 365;
  }

  static async requestPermissions() {
    if (Platform.OS !== 'android') {
      return {
        smsPermissionGranted: false,
        notificationPermissionGranted: false,
      };
    }

    const requestedPermissions = [
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ];

    if (PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
      requestedPermissions.push(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
    }

    const results = await PermissionsAndroid.requestMultiple(
      requestedPermissions,
    );
    const smsPermissionGranted =
      results[PermissionsAndroid.PERMISSIONS.READ_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] ===
        PermissionsAndroid.RESULTS.GRANTED;

    const notificationPermissionGranted = PermissionsAndroid.PERMISSIONS
      .POST_NOTIFICATIONS
      ? results[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] ===
        PermissionsAndroid.RESULTS.GRANTED
      : true;

    await Database.saveSyncState({
      smsPermissionGranted,
      lastError: smsPermissionGranted ? null : 'SMS permission not granted',
    });

    return {smsPermissionGranted, notificationPermissionGranted};
  }

  static async syncAll({daysBack = 365, reason = 'manual'} = {}) {
    if (syncInFlight) {
      return syncInFlight;
    }

    syncInFlight = this.runSync({daysBack, reason}).finally(() => {
      syncInFlight = null;
    });

    return syncInFlight;
  }

  static async runSync({daysBack, reason}) {
    const syncStateBefore = await Database.loadSyncState();
    let addedCount = 0;

    try {
      const nativeSync = await this.drainPendingNativeEvents(reason);
      addedCount += nativeSync.addedCount;

      if (syncStateBefore.smsPermissionGranted !== false) {
        const savedTransactions = await SMSReader.readExistingSMS(daysBack, {
          maxMessages: reason === 'startup' ? 2500 : 1200,
        });
        addedCount += savedTransactions.length;
      }

      const nextSyncState = await Database.saveSyncState({
        lastFullScanAt: new Date().toISOString(),
        lastSmsSyncAt: new Date().toISOString(),
        notificationAccessEnabled: nativeSync.notificationAccessEnabled,
        lastError: null,
      });

      if (addedCount > 0 || reason === 'manual' || reason === 'startup') {
        DeviceEventEmitter.emit('transactions:updated', {
          reason,
          addedCount,
          syncState: nextSyncState,
        });
      }

      await Database.log('sync_completed', 'TransactionTracker', {
        reason,
        addedCount,
        daysBack,
      });

      return {addedCount, syncState: nextSyncState};
    } catch (error) {
      const nextSyncState = await Database.saveSyncState({
        lastError: error?.message || 'Unknown sync error',
      });
      await Database.log(
        'sync_failed',
        'TransactionTracker',
        nextSyncState.lastError,
      );
      throw error;
    }
  }

  static startNativeEventPolling() {
    if (Platform.OS !== 'android' || nativePollingInterval) {
      return;
    }

    nativePollingInterval = setInterval(() => {
      this.flushPendingNativeEvents({reason: 'live_poll'});
    }, NATIVE_POLL_INTERVAL_MS);
  }

  static stopNativeEventPolling() {
    if (nativePollingInterval) {
      clearInterval(nativePollingInterval);
      nativePollingInterval = null;
    }
  }

  static async flushPendingNativeEvents({reason = 'manual_native'} = {}) {
    if (nativeEventSyncInFlight) {
      return nativeEventSyncInFlight;
    }

    nativeEventSyncInFlight = this.drainPendingNativeEvents(reason).finally(
      () => {
        nativeEventSyncInFlight = null;
      },
    );

    return nativeEventSyncInFlight;
  }

  static async drainPendingNativeEvents(reason = 'native_poll') {
    const notificationAccessEnabled =
      await NativeTracking.isNotificationAccessEnabled();
    const pendingNativeEvents = await NativeTracking.consumePendingEvents();
    const smsEvents = pendingNativeEvents.smsEvents || [];
    const notificationEvents = pendingNativeEvents.notificationEvents || [];
    let addedCount = 0;
    const shouldPersistSyncState =
      notificationAccessEnabled !==
        (await Database.loadSyncState()).notificationAccessEnabled ||
      smsEvents.length > 0 ||
      notificationEvents.length > 0 ||
      reason !== 'live_poll';

    if (shouldPersistSyncState) {
      await Database.saveSyncState({
        notificationAccessEnabled,
        lastSyncSource: reason,
        lastError: null,
      });
    }

    addedCount += await this.processNativeSmsEvents(smsEvents);
    addedCount += await this.processNotificationEvents(notificationEvents);

    if (smsEvents.length > 0 || notificationEvents.length > 0) {
      await Database.log('native_events_consumed', 'TransactionTracker', {
        reason,
        smsEvents: smsEvents.length,
        notificationEvents: notificationEvents.length,
        addedCount,
      });
    }

    if (addedCount > 0) {
      DeviceEventEmitter.emit('transactions:updated', {
        reason,
        addedCount,
      });
    }

    return {
      addedCount,
      notificationAccessEnabled,
      smsEventCount: smsEvents.length,
      notificationEventCount: notificationEvents.length,
    };
  }

  static async processNativeSmsEvents(events = []) {
    let addedCount = 0;

    for (const event of events) {
      const txn = await SMSReader.processMessage(
        event.body || '',
        event.sender || '',
        event.timestamp || Date.now(),
        false,
        {
          sourceType: 'sms',
          sourceId: event.id || null,
          historical: false,
        },
      );

      if (txn) {
        addedCount += 1;
      }
    }

    return addedCount;
  }

  static async processNotificationEvents(events = []) {
    let addedCount = 0;

    for (const event of events) {
      const combinedText = notificationToText(event);
      if (!combinedText) {
        continue;
      }

      // Only process notifications from known UPI/bank apps.
      // Skipping Gmail, WhatsApp general, and any unknown packages prevents
      // email receipts and unrelated notifications from being parsed as transactions.
      const knownSourceApp = UPI_NOTIFICATION_PACKAGES[event.packageName];
      if (!knownSourceApp) {
        continue;
      }

      const sender = knownSourceApp;
      let txn = null;

      try {
        txn = SMSParser.parse(combinedText, sender);
      } catch (_) {
        txn = null;
      }

      if (!txn) {
        continue;
      }

      const candidateBase = {
        ...txn,
        timestamp: new Date(event.timestamp || Date.now()).toISOString(),
        rawNotificationText: combinedText,
        sourceApp: sender,
        sourceType: 'notification',
        sourceId: event.id || null,
        rawSender: event.packageName || sender,
      };

      const candidate = await TransactionIntelligence.enrichTransaction(
        candidateBase,
        {
          historical: false,
        },
      );

      if (!candidate) {
        continue;
      }

      const duplicate = await Database.findDuplicate(candidate);
      if (duplicate) {
        continue;
      }

      const savedId = await Database.saveTxn(candidate);

      if (savedId) {
        addedCount += 1;
        const savedTxn = await Database.getTxnById(savedId);
        if (savedTxn?.status === 'pending') {
          await Database.saveAppState({
            promptTxnId: savedTxn.id,
            promptRequestedAt: new Date().toISOString(),
          });
          DeviceEventEmitter.emit('transactions:prompt', savedTxn);
          // Send a push notification so user is alerted even when app is in background
          await this.sendPaymentNotification(savedTxn);
        }
      }
    }

    if (events.length > 0) {
      await Database.saveSyncState({
        lastNotificationSyncAt: new Date().toISOString(),
      });
    }

    return addedCount;
  }

  static async sendPaymentNotification(txn) {
    if (!txn || txn.flow !== 'debit') {
      return;
    }

    try {
      const mod = NativeModules.SpendSenseTracking;
      if (mod && typeof mod.showTransactionNotification === 'function') {
        const amount = Math.round(txn.amount || 0).toString();
        const merchant = txn.merchant || 'Unknown';
        const sourceApp = txn.sourceApp || 'UPI';
        await mod.showTransactionNotification(txn.id, amount, merchant, sourceApp);
      }
    } catch (_) {
      // Notification failure is non-critical
    }
  }

  static async getStatus() {
    const [profile, syncState, txns] = await Promise.all([
      Database.loadProfile(),
      Database.loadSyncState(),
      Database.getTxns({limit: 5000}),
    ]);

    return {
      profile,
      syncState,
      transactionCount: txns.length,
      pendingCount: txns.filter(txn => txn.status === 'pending').length,
      notificationAccessEnabled:
        await NativeTracking.isNotificationAccessEnabled(),
    };
  }
}
