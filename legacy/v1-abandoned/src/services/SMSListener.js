/**
 * SMSListener.js
 * 
 * Background SMS listener for Android.
 * Uses: react-native-sms-retriever + react-native-android-sms-listener
 * 
 * Install: npm install react-native-android-sms-listener
 */

import SmsListener from 'react-native-android-sms-listener';
import { Platform } from 'react-native';
import { SMSParser } from './SMSParser';
import { DatabaseService } from './DatabaseService';
import { NotificationService } from './NotificationService';
import { AIService } from './AIService';

export class SMSListener {
  static subscription = null;

  static start() {
    if (Platform.OS !== 'android') return;

    console.log('[SMSListener] Starting...');

    this.subscription = SmsListener.addListener(async (message) => {
      console.log('[SMSListener] Received SMS from:', message.originatingAddress);
      await this.handleSMS(message.body, message.originatingAddress);
    });
  }

  static stop() {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }

  static async handleSMS(body, sender) {
    try {
      // 1. Parse the SMS
      const transaction = SMSParser.parse(body, sender);
      if (!transaction) {
        console.log('[SMSListener] Not a debit SMS, skipping.');
        return;
      }

      // 2. Check for duplicates
      const recent = await DatabaseService.getRecentTransactions(5);
      if (SMSParser.isDuplicate(transaction, recent)) {
        console.log('[SMSListener] Duplicate transaction, skipping.');
        return;
      }

      // 3. Try AI category suggestion
      try {
        const aiCategory = await AIService.suggestCategory(
          transaction.merchant,
          transaction.rawSMSText,
          transaction.amount
        );
        if (aiCategory) {
          transaction.category = aiCategory.category;
          transaction.suggestedCategory = aiCategory.category;
          transaction.aiConfidence = aiCategory.confidence;
        }
      } catch (aiErr) {
        console.log('[SMSListener] AI suggestion failed, using rule-based:', aiErr.message);
      }

      // 4. Save to database
      const savedId = await DatabaseService.saveTransaction(transaction);
      console.log('[SMSListener] Saved transaction:', savedId);

      // 5. Trigger push notification asking user the purpose
      await NotificationService.askTransactionPurpose(transaction);

    } catch (err) {
      console.error('[SMSListener] Error handling SMS:', err);
    }
  }
}
