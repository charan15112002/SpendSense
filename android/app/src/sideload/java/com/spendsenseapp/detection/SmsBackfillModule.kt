package com.spendsenseapp.detection

import android.content.ContentResolver
import android.net.Uri
import android.util.Log
import com.facebook.react.bridge.*

/**
 * SMS Backfill Module — sideload flavor ONLY (Lock ID: S4-M2)
 *
 * Section 6 System 1: "SMS read from inbox on first launch (backfill)"
 * Section 8 1.1: "SMS backfill on install: Yes — reads SMS history for last 30 days"
 *
 * Section 7 C3: Custom Kotlin, NOT npm package.
 */
class SmsBackfillModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "SmsBackfill"
        private const val THIRTY_DAYS_MS = 30L * 24 * 60 * 60 * 1000
    }

    override fun getName(): String = "SmsBackfill"

    /**
     * Read SMS inbox for last 30 days.
     * Returns array of { sender, body, timestamp } to JS for filtering/parsing.
     * Native side does NOT filter — JS handles shortcode matching per architecture.
     */
    @ReactMethod
    fun readSmsHistory(promise: Promise) {
        try {
            val cutoff = System.currentTimeMillis() - THIRTY_DAYS_MS
            val uri = Uri.parse("content://sms/inbox")
            val projection = arrayOf("address", "body", "date")
            val selection = "date >= ?"
            val selectionArgs = arrayOf(cutoff.toString())
            val sortOrder = "date DESC"

            val cursor = reactContext.contentResolver.query(
                uri, projection, selection, selectionArgs, sortOrder
            )

            val results = Arguments.createArray()

            cursor?.use {
                val addressIdx = it.getColumnIndex("address")
                val bodyIdx = it.getColumnIndex("body")
                val dateIdx = it.getColumnIndex("date")

                while (it.moveToNext()) {
                    val sender = it.getString(addressIdx) ?: continue
                    val body = it.getString(bodyIdx) ?: continue
                    val timestamp = it.getLong(dateIdx)

                    val sms = Arguments.createMap().apply {
                        putString("sender", sender)
                        putString("rawText", body)
                        putDouble("timestamp", timestamp.toDouble())
                        putString("source", "sms_backfill")
                    }
                    results.pushMap(sms)
                }
            }

            Log.d(TAG, "Backfill returned ${results.size()} SMS messages")
            promise.resolve(results)
        } catch (e: Exception) {
            Log.e(TAG, "SMS backfill failed: ${e.message}")
            promise.reject("SMS_BACKFILL_ERROR", e.message)
        }
    }
}
