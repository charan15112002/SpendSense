/**
 * NotificationListener.js
 * 
 * Reads notifications from UPI apps (GPay, PhonePe, Paytm, etc.)
 * Uses: @voximplant/react-native-foreground-service + 
 *       react-native-notification-listener
 * 
 * IMPORTANT: Requires user to grant "Notification Access" in
 * Android Settings → Apps → Special App Access → Notification Access
 * 
 * Install: npm install react-native-notification-listener
 */

import RNNotificationListener from 'react-native-notification-listener';
import { Platform, AppState } from 'react-native';
import { SMSParser } from './SMSParser';
import { DatabaseService } from './DatabaseService';
import { NotificationService } from './NotificationService';
import { AIService } from './AIService';

// UPI app package names to watch
const UPI_PACKAGES = [
  'com.google.android.apps.nbu.paisa.user',    // Google Pay
  'com.phonepe.app',                            // PhonePe
  'net.one97.paytm',                            // Paytm
  'in.org.npci.upiapp',                         // BHIM
  'com.amazon.mShop.android.shopping',          // Amazon Pay
  'com.whatsapp',                               // WhatsApp Pay
  'com.mobikwik_new',                           // MobiKwik
  'com.freecharge.android',                     // Freecharge
  // Bank apps
  'com.sbi.lotusintouch',                       // SBI YONO
  'com.hdfcbank.hdfcbankservices',              // HDFC
  'com.icicibank.mobilebanking',                // ICICI iMobile
  'com.axisbank.axismobile',                    // Axis Mobile
  'com.csam.icici.bank.imobile',                // ICICI
];

// Known notification keywords that signal a payment
const PAYMENT_NOTIFICATION_KEYWORDS = [
  'paid', 'payment', 'sent', 'debited', 'transaction', 'successful',
  'transferred', 'spent', '₹', 'rs.', 'inr',
];

export class NotificationListener {
  static isRunning = false;

  static async start() {
    if (Platform.OS !== 'android') return;

    const hasPermission = await RNNotificationListener.getPermissionStatus();

    if (hasPermission !== 'authorized') {
      console.log('[NotificationListener] Permission not granted. User must enable in settings.');
      return;
    }

    RNNotificationListener.startListening();
    this.isRunning = true;
    console.log('[NotificationListener] Started.');

    // Register notification handler
    RNNotificationListener.on('notification', async (notification) => {
      await this.handleNotification(notification);
    });
  }

  static stop() {
    if (this.isRunning) {
      RNNotificationListener.stopListening();
      this.isRunning = false;
    }
  }

  static async handleNotification(notification) {
    try {
      const { packageName, title, text, bigText } = notification;

      // 1. Check if it's from a UPI app we care about
      const isUPIApp = UPI_PACKAGES.includes(packageName);
      const notifText = `${title || ''} ${text || ''} ${bigText || ''}`;

      // 2. Check if it contains payment keywords
      const lowerText = notifText.toLowerCase();
      const isPayment = PAYMENT_NOTIFICATION_KEYWORDS.some(k => lowerText.includes(k));

      if (!isUPIApp && !isPayment) return;

      console.log('[NotificationListener] Potential payment notification:', packageName);

      // 3. Parse as transaction
      const sourceApp = this.packageToApp(packageName);
      const transaction = SMSParser.parse(notifText, sourceApp);

      if (!transaction) {
        // If parsing fails but it's from a UPI app, create a minimal transaction
        if (isUPIApp && isPayment) {
          await this.handleUnparsedPayment(notifText, sourceApp, notification);
        }
        return;
      }

      // 4. Deduplicate
      const recent = await DatabaseService.getRecentTransactions(5);
      if (SMSParser.isDuplicate(transaction, recent)) return;

      // 5. Mark source
      transaction.sourceApp = sourceApp;

      // 6. AI category suggestion
      try {
        const aiCategory = await AIService.suggestCategory(
          transaction.merchant,
          notifText,
          transaction.amount
        );
        if (aiCategory) {
          transaction.category = aiCategory.category;
          transaction.aiConfidence = aiCategory.confidence;
        }
      } catch (_) {}

      // 7. Save + notify user
      await DatabaseService.saveTransaction(transaction);
      await NotificationService.askTransactionPurpose(transaction);

    } catch (err) {
      console.error('[NotificationListener] Error:', err);
    }
  }

  static async handleUnparsedPayment(text, sourceApp, rawNotification) {
    // Create a "possible payment" entry for user to classify
    const transaction = {
      id: `notif_${Date.now()}`,
      timestamp: new Date().toISOString(),
      amount: null,          // Unknown — ask user
      merchant: 'Unknown',
      sourceApp: sourceApp,
      category: 'misc',
      rawNotificationText: text,
      status: 'missingInfo',
      needsAmountInput: true,
    };

    await DatabaseService.saveTransaction(transaction);
    await NotificationService.askAboutUnknownPayment(transaction, text);
  }

  static packageToApp(packageName) {
    const map = {
      'com.google.android.apps.nbu.paisa.user': 'GPay',
      'com.phonepe.app': 'PhonePe',
      'net.one97.paytm': 'Paytm',
      'in.org.npci.upiapp': 'BHIM',
      'com.amazon.mShop.android.shopping': 'Amazon Pay',
      'com.whatsapp': 'WhatsApp Pay',
      'com.mobikwik_new': 'MobiKwik',
    };
    return map[packageName] || 'UPI App';
  }
}
