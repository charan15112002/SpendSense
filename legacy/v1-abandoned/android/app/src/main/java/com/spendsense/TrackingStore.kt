package com.spendsense

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object TrackingStore {
  private const val PREFS_NAME = "spendsense_tracking_store"
  private const val KEY_SMS_EVENTS = "pending_sms_events"
  private const val KEY_NOTIFICATION_EVENTS = "pending_notification_events"
  private const val MAX_EVENTS = 300

  fun appendSmsEvent(context: Context, event: JSONObject) {
    appendEvent(context, KEY_SMS_EVENTS, event)
  }

  fun appendNotificationEvent(context: Context, event: JSONObject) {
    appendEvent(context, KEY_NOTIFICATION_EVENTS, event)
  }

  fun consumeSmsEvents(context: Context): JSONArray {
    return consumeEvents(context, KEY_SMS_EVENTS)
  }

  fun consumeNotificationEvents(context: Context): JSONArray {
    return consumeEvents(context, KEY_NOTIFICATION_EVENTS)
  }

  private fun appendEvent(context: Context, key: String, event: JSONObject) {
    synchronized(this) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val existing = prefs.getString(key, "[]") ?: "[]"
      val incoming = try {
        JSONArray(existing)
      } catch (_: Exception) {
        JSONArray()
      }

      incoming.put(event)

      val trimmed = JSONArray()
      val start = kotlin.math.max(0, incoming.length() - MAX_EVENTS)
      for (index in start until incoming.length()) {
        trimmed.put(incoming.get(index))
      }

      prefs.edit().putString(key, trimmed.toString()).apply()
    }
  }

  private fun consumeEvents(context: Context, key: String): JSONArray {
    synchronized(this) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      val existing = prefs.getString(key, "[]") ?: "[]"
      val events = try {
        JSONArray(existing)
      } catch (_: Exception) {
        JSONArray()
      }

      prefs.edit().putString(key, "[]").apply()
      return events
    }
  }
}
