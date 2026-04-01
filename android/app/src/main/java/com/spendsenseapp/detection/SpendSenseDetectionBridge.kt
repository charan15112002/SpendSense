package com.spendsenseapp.detection

import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Bridge between native detection and React Native JS layer.
 * (Lock ID: Section 7 C3 — Bridge Contract)
 *
 * Native → JS: onTransactionDetected({ raw, source, package, timestamp })
 * JS → Native: getListenerStatus(), rebindListener()
 *
 * Keep the bridge surface small — few methods, well-defined payloads.
 * All parsing/classification happens in JS.
 * Native side only captures and forwards raw data.
 */
object SpendSenseDetectionBridge {

    private const val TAG = "DetectionBridge"
    private const val EVENT_NOTIFICATION = "onNotificationReceived"
    private const val EVENT_SMS = "onSmsReceived"

    private var reactModule: SpendSenseDetectionModule? = null

    fun setReactModule(module: SpendSenseDetectionModule) {
        reactModule = module
    }

    /**
     * Called by NotificationListenerService when a notification arrives.
     * Forwards raw data to JS. Does NOT filter or parse.
     */
    fun onNotificationReceived(
        packageName: String,
        rawText: String,
        title: String,
        timestamp: Long
    ) {
        val params = Arguments.createMap().apply {
            putString("packageName", packageName)
            putString("rawText", rawText)
            putString("title", title)
            putDouble("timestamp", timestamp.toDouble())
            putString("source", "notification")
        }

        emitEvent(EVENT_NOTIFICATION, params)
    }

    /**
     * Called by SMS BroadcastReceiver (sideload only) when an SMS arrives.
     * Forwards raw data to JS. Does NOT filter or parse.
     */
    fun onSmsReceived(
        sender: String,
        body: String,
        timestamp: Long
    ) {
        val params = Arguments.createMap().apply {
            putString("sender", sender)
            putString("rawText", body)
            putDouble("timestamp", timestamp.toDouble())
            putString("source", "sms")
        }

        emitEvent(EVENT_SMS, params)
    }

    private fun emitEvent(eventName: String, params: WritableMap) {
        try {
            reactModule?.sendEvent(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit event $eventName: ${e.message}")
        }
    }
}
