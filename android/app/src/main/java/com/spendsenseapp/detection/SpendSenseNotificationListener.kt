package com.spendsenseapp.detection

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

/**
 * Custom NotificationListenerService (Lock IDs: S4-M1, Section 7 C3)
 *
 * Section 7 C3: "own the native layer, don't depend on community packages"
 * Section 6 System 1: onNotificationPosted → filter → parse → forward to JS
 *
 * Native side ONLY captures and forwards raw data.
 * All parsing/classification happens in JS (React Native side) per Section 7 C3.
 */
class SpendSenseNotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "SpendSenseListener"
        var isListenerConnected: Boolean = false
            private set
        var lastEventTimestamp: Long = 0L
            private set
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        isListenerConnected = true
        Log.d(TAG, "NotificationListenerService connected")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        isListenerConnected = false
        Log.d(TAG, "NotificationListenerService disconnected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return

        val packageName = sbn.packageName ?: return
        val extras = sbn.notification?.extras ?: return

        // Extract raw text from notification
        val title = extras.getCharSequence("android.title")?.toString() ?: ""
        val text = extras.getCharSequence("android.text")?.toString() ?: ""
        val bigText = extras.getCharSequence("android.bigText")?.toString() ?: ""

        // Use bigText if available (more complete), fall back to text
        val rawText = if (bigText.isNotBlank()) bigText else text

        if (rawText.isBlank()) return

        val timestamp = sbn.postTime

        lastEventTimestamp = timestamp

        // Forward raw data to the RN bridge
        // The bridge handles: whitelist filtering, template matching, parsing, scoring
        // Native side does NOT filter — that's the JS layer's job per architecture
        SpendSenseDetectionBridge.onNotificationReceived(
            packageName = packageName,
            rawText = rawText,
            title = title,
            timestamp = timestamp
        )
    }
}
