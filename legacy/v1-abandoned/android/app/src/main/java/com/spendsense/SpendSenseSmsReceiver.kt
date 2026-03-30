package com.spendsense

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import org.json.JSONObject
import java.util.UUID

class SpendSenseSmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION != intent.action) {
      return
    }

    val messages = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    if (messages.isNullOrEmpty()) {
      return
    }

    val groupedBySender = messages.groupBy { message ->
      message.displayOriginatingAddress ?: message.originatingAddress ?: "unknown"
    }

    groupedBySender.forEach { (sender, senderMessages) ->
      val body = senderMessages.joinToString(separator = "") { it.displayMessageBody ?: "" }.trim()
      if (body.isBlank()) {
        return@forEach
      }

      val timestamp = senderMessages.maxOfOrNull { it.timestampMillis } ?: System.currentTimeMillis()
      val payload = JSONObject()
        .put("id", UUID.randomUUID().toString())
        .put("sender", sender)
        .put("body", body)
        .put("timestamp", timestamp)
        .put("capturedAt", System.currentTimeMillis())

      TrackingStore.appendSmsEvent(context, payload)
    }
  }
}
