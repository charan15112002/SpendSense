package com.spendsenseapp.detection

import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * React Native Native Module for detection (Lock ID: Section 7 C3 Bridge Contract)
 *
 * JS → Native interface:
 *   getListenerStatus() → { isConnected, isEnabled, lastEventTimestamp }
 *   rebindListener() → attempts to rebind the notification listener
 *
 * Native → JS interface (via events):
 *   onNotificationReceived → raw notification data
 *   onSmsReceived → raw SMS data (sideload only)
 */
class SpendSenseDetectionModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SpendSenseDetection"

    override fun initialize() {
        super.initialize()
        SpendSenseDetectionBridge.setReactModule(this)
    }

    /**
     * JS calls this to check listener health.
     * Section 7 C1 Layer 3: gap detection on app open.
     */
    @ReactMethod
    fun getListenerStatus(promise: Promise) {
        try {
            val result = Arguments.createMap().apply {
                putBoolean("isConnected", SpendSenseNotificationListener.isListenerConnected)
                putBoolean("isEnabled", isNotificationListenerEnabled())
                putDouble(
                    "lastEventTimestamp",
                    SpendSenseNotificationListener.lastEventTimestamp.toDouble()
                )
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("LISTENER_STATUS_ERROR", e.message)
        }
    }

    /**
     * JS calls this to attempt rebinding the listener.
     * Section 7 C1 Layer 3: attempt rebind if unbound.
     */
    @ReactMethod
    fun rebindListener(promise: Promise) {
        try {
            // Toggle the notification listener component to force a rebind
            val componentName = ComponentName(
                reactContext,
                SpendSenseNotificationListener::class.java
            )
            val pm = reactContext.packageManager
            // Disable then re-enable to trigger rebind
            pm.setComponentEnabledSetting(
                componentName,
                android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                android.content.pm.PackageManager.DONT_KILL_APP
            )
            pm.setComponentEnabledSetting(
                componentName,
                android.content.pm.PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                android.content.pm.PackageManager.DONT_KILL_APP
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REBIND_ERROR", e.message)
        }
    }

    /**
     * Check if SpendSense is in the enabled notification listeners list.
     */
    private fun isNotificationListenerEnabled(): Boolean {
        val flat = Settings.Secure.getString(
            reactContext.contentResolver,
            "enabled_notification_listeners"
        ) ?: return false
        val componentName = ComponentName(
            reactContext,
            SpendSenseNotificationListener::class.java
        ).flattenToString()
        return flat.contains(componentName)
    }

    /**
     * Emit an event to JS.
     */
    fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
