package com.spendsense

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import org.json.JSONArray
import org.json.JSONObject

class SpendSenseTrackingModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  private val appContext: ReactApplicationContext = reactContext

  override fun getName(): String = "SpendSenseTracking"

  // ── Read historical SMS from device inbox ──────────────────────────────────

  @ReactMethod
  fun readHistoricalSms(daysBack: Int, maxCount: Int, promise: Promise) {
    try {
      val minDate = System.currentTimeMillis() - (daysBack.toLong() * 24L * 60L * 60L * 1000L)
      val results = JSONArray()

      val uri = android.net.Uri.parse("content://sms/inbox")
      val projection = arrayOf("_id", "address", "body", "date")
      val selection = "date >= ?"
      val selectionArgs = arrayOf(minDate.toString())

      val cursor = appContext.contentResolver.query(
        uri, projection, selection, selectionArgs, "date DESC"
      )

      cursor?.use { c ->
        val idIdx = c.getColumnIndex("_id")
        val addressIdx = c.getColumnIndex("address")
        val bodyIdx = c.getColumnIndex("body")
        val dateIdx = c.getColumnIndex("date")

        var count = 0
        while (c.moveToNext() && count < maxCount) {
          val body = if (bodyIdx >= 0) c.getString(bodyIdx) ?: "" else ""
          if (body.isNotBlank()) {
            val sms = JSONObject()
            sms.put("_id", if (idIdx >= 0) c.getString(idIdx) ?: "" else "")
            sms.put("address", if (addressIdx >= 0) c.getString(addressIdx) ?: "" else "")
            sms.put("body", body)
            sms.put("date", if (dateIdx >= 0) c.getLong(dateIdx) else System.currentTimeMillis())
            results.put(sms)
            count++
          }
        }
      }

      promise.resolve(results.toString())
    } catch (error: Exception) {
      promise.reject("SMS_READ_FAILED", error.message ?: "Failed to read SMS", error)
    }
  }

  // ── Show a push notification for a new transaction ─────────────────────────

  @ReactMethod
  fun showTransactionNotification(
    txnId: String,
    amount: String,
    merchant: String,
    sourceApp: String,
    promise: Promise,
  ) {
    try {
      val context = appContext
      val channelId = "spendsense_payments"
      val notifManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

      // Create notification channel (required for Android 8+)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        if (notifManager.getNotificationChannel(channelId) == null) {
          val channel = NotificationChannel(
            channelId,
            "SpendSense Payments",
            NotificationManager.IMPORTANCE_HIGH,
          ).apply {
            description = "Payment detection prompts"
            enableVibration(true)
          }
          notifManager.createNotificationChannel(channel)
        }
      }

      // Intent to open app and show classification modal
      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      val pendingIntent = if (launchIntent != null) {
        launchIntent.apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
          putExtra("promptTxnId", txnId)
        }
        PendingIntent.getActivity(
          context,
          Math.abs(txnId.hashCode() % 100000),
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
      } else null

      val notifId = Math.abs(txnId.hashCode() % 100000)

      val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        android.app.Notification.Builder(context, channelId)
      } else {
        @Suppress("DEPRECATION")
        android.app.Notification.Builder(context).apply {
          setPriority(android.app.Notification.PRIORITY_HIGH)
        }
      }

      builder
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle("₹$amount paid via $sourceApp")
        .setContentText("To: $merchant — tap to tag this payment")
        .setAutoCancel(true)

      if (pendingIntent != null) {
        builder.setContentIntent(pendingIntent)
      }

      notifManager.notify(notifId, builder.build())
      promise.resolve(notifId)
    } catch (error: Exception) {
      promise.reject("NOTIF_FAILED", error.message ?: "Failed to show notification", error)
    }
  }

  // ── Consume buffered native events (SMS + notifications) ──────────────────

  @ReactMethod
  fun consumePendingEvents(promise: Promise) {
    try {
      val result = WritableNativeMap()
      result.putString("smsEventsJson", TrackingStore.consumeSmsEvents(appContext).toString())
      result.putString(
        "notificationEventsJson",
        TrackingStore.consumeNotificationEvents(appContext).toString(),
      )
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("TRACKING_CONSUME_FAILED", error)
    }
  }

  // ── Notification access helpers ────────────────────────────────────────────

  @ReactMethod
  fun isNotificationAccessEnabled(promise: Promise) {
    try {
      promise.resolve(isNotificationServiceEnabled())
    } catch (error: Exception) {
      promise.reject("TRACKING_NOTIFICATION_STATUS_FAILED", error)
    }
  }

  @ReactMethod
  fun openNotificationAccessSettings(promise: Promise) {
    try {
      val intent = Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      val activity = currentActivity
      if (activity != null) {
        activity.startActivity(intent)
      } else {
        appContext.startActivity(intent)
      }
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("TRACKING_OPEN_NOTIFICATION_SETTINGS_FAILED", error)
    }
  }

  private fun isNotificationServiceEnabled(): Boolean {
    val enabledListeners = Settings.Secure.getString(
      appContext.contentResolver,
      "enabled_notification_listeners",
    ) ?: return false
    val componentName = ComponentName(appContext, SpendSenseNotificationListenerService::class.java)
    return enabledListeners.contains(componentName.flattenToString())
  }
}
