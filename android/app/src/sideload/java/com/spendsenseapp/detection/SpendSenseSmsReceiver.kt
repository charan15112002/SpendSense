package com.spendsenseapp.detection

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

/**
 * SMS BroadcastReceiver — sideload flavor ONLY (Lock ID: S4-M2)
 *
 * Section 7 C3: Custom Kotlin, NOT npm package.
 * Section 6 System 1 Sideload Pipeline step 1: "SMS arrives via BroadcastReceiver (real-time)"
 *
 * Native side only captures and forwards raw SMS data.
 * All filtering/parsing happens in JS.
 */
class SpendSenseSmsReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "SpendSenseSmsReceiver"
    }

    override fun onReceive(context: Context?, intent: Intent?) {
        if (intent?.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return

        val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
        if (messages.isNullOrEmpty()) return

        for (message in messages) {
            val sender = message.originatingAddress ?: continue
            val body = message.messageBody ?: continue
            val timestamp = message.timestampMillis

            Log.d(TAG, "SMS received from: $sender")

            // Forward raw SMS to bridge → JS layer
            SpendSenseDetectionBridge.onSmsReceived(
                sender = sender,
                body = body,
                timestamp = timestamp
            )
        }
    }
}
