package com.spendsense

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject

class SpendSenseNotificationListenerService : NotificationListenerService() {
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val notification = sbn.notification ?: return
    val extras = notification.extras ?: return

    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString() ?: ""
    val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString() ?: ""

    if (title.isBlank() && text.isBlank() && bigText.isBlank() && subText.isBlank()) {
      return
    }

    val payload = JSONObject()
      .put("id", sbn.key ?: "${sbn.packageName}_${System.currentTimeMillis()}")
      .put("packageName", sbn.packageName ?: "")
      .put("title", title)
      .put("text", text)
      .put("bigText", bigText)
      .put("subText", subText)
      .put("timestamp", sbn.postTime)
      .put("capturedAt", System.currentTimeMillis())

    TrackingStore.appendNotificationEvent(this, payload)
  }
}
