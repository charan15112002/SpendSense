/**
 * NotificationService.js
 * 
 * Handles outgoing push notifications that ask users about their transactions.
 * Uses: @notifee/react-native (best Android notification library)
 * Install: npm install @notifee/react-native
 */

import notifee, {
  AndroidImportance,
  AndroidStyle,
  EventType,
} from '@notifee/react-native';
import { DatabaseService } from './DatabaseService';

const CHANNEL_ID = 'spendsense_transactions';

export class NotificationService {

  // ── Channel Setup ─────────────────────────────────
  static async createChannel() {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'SpendSense Transactions',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });

    // Handle notification actions (when user taps reply)
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      await this.handleNotificationAction(type, detail);
    });

    notifee.onForegroundEvent(({ type, detail }) => {
      this.handleNotificationAction(type, detail);
    });
  }

  // ── Ask Transaction Purpose ───────────────────────
  static async askTransactionPurpose(transaction) {
    const amount = transaction.amount ? `₹${transaction.amount.toFixed(0)}` : 'Unknown amount';
    const merchant = transaction.merchant || 'Unknown merchant';
    const source = transaction.sourceApp || 'UPI';

    // Quick-reply categories
    const quickReplies = [
      { id: 'food',         title: '🍔 Food' },
      { id: 'travel',       title: '🚗 Travel' },
      { id: 'shopping',     title: '🛍 Shopping' },
      { id: 'groceries',    title: '🛒 Groceries' },
      { id: 'bills',        title: '💡 Bills' },
      { id: 'open_app',     title: '✏️ Add Note' },
    ];

    await notifee.displayNotification({
      id: transaction.id,
      title: `${amount} paid via ${source}`,
      body: `To: ${merchant}. What was this for?`,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        style: {
          type: AndroidStyle.BIGTEXT,
          text: `${amount} sent to ${merchant} via ${source}.\n\nTap a category or open app to add a note.`,
        },
        actions: quickReplies.map(r => ({
          title: r.title,
          pressAction: { id: r.id },
        })),
        pressAction: { id: 'open_app' },
        // Extra data for handling
        data: {
          transactionId: transaction.id,
          type: 'transaction_categorize',
        },
      },
    });
  }

  // ── Ask About Unknown Payment ─────────────────────
  static async askAboutUnknownPayment(transaction, rawText) {
    await notifee.displayNotification({
      id: transaction.id,
      title: '💸 Possible payment detected',
      body: 'A payment notification was received. Tap to review.',
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.HIGH,
        style: {
          type: AndroidStyle.BIGTEXT,
          text: `We detected what might be a payment:\n"${rawText.substring(0, 100)}..."\n\nTap to confirm or dismiss.`,
        },
        actions: [
          { title: '✓ Yes, it\'s a payment', pressAction: { id: 'confirm_payment' } },
          { title: '✗ Not a payment', pressAction: { id: 'dismiss_payment' } },
        ],
        data: {
          transactionId: transaction.id,
          type: 'confirm_unknown',
        },
      },
    });
  }

  // ── Budget Alert ──────────────────────────────────
  static async sendBudgetAlert(category, used, limit) {
    const pct = Math.round((used / limit) * 100);
    const remaining = limit - used;

    await notifee.displayNotification({
      id: `budget_${category}_${Date.now()}`,
      title: `⚠️ ${category} budget at ${pct}%`,
      body: `Only ₹${remaining.toFixed(0)} left in your ${category} budget.`,
      android: {
        channelId: CHANNEL_ID,
        importance: AndroidImportance.DEFAULT,
        pressAction: { id: 'open_budgets' },
        data: { type: 'budget_alert', category },
      },
    });
  }

  // ── Handle Actions ────────────────────────────────
  static async handleNotificationAction(type, detail) {
    const { notification, pressAction } = detail;
    if (!notification?.android?.data) return;

    const { transactionId, type: notifType } = notification.android.data;

    if (notifType === 'transaction_categorize') {
      const actionId = pressAction?.id;

      if (actionId === 'open_app') {
        // The app will handle this when it opens
        return;
      }

      if (actionId && actionId !== 'open_app') {
        // User selected a quick category
        await DatabaseService.updateTransaction(transactionId, {
          category: actionId,
          status: 'confirmed',
        });
        // Update budget usage
        const txn = await DatabaseService.getTransaction(transactionId);
        if (txn) {
          await DatabaseService.updateBudgetUsed(actionId, txn.amount);
        }
        // Dismiss the notification
        await notifee.cancelNotification(transactionId);
      }
    }

    if (notifType === 'confirm_unknown') {
      if (pressAction?.id === 'dismiss_payment') {
        await DatabaseService.deleteTransaction(transactionId);
        await notifee.cancelNotification(transactionId);
      }
      // If confirmed → app opens to let user fill in details
    }
  }

  // ── Cancel a notification ─────────────────────────
  static async cancel(id) {
    await notifee.cancelNotification(id);
  }
}
