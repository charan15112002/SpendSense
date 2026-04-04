package com.spendsenseapp.detection

import android.content.ContentValues
import android.content.Intent
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileWriter

/**
 * Native module for exporting diagnostic evidence bundles.
 * (Lock IDs: evidence-bundle-contract, test-evidence-capture-plan)
 *
 * Bug 4 fix: Uses MediaStore API for Android 10+ (Scoped Storage).
 * Falls back to legacy file API for older versions.
 */
class EvidenceExportModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "EvidenceExport"

    /**
     * Save evidence bundle files to Downloads folder via MediaStore (Android 10+).
     */
    @ReactMethod
    fun saveToDownloads(
        buildId: String,
        manifestJson: String,
        eventTimelineJsonl: String,
        decisionTraceJsonl: String,
        platformTraceJsonl: String,
        promise: Promise
    ) {
        try {
            val subDir = "SpendSense-Evidence/$buildId"

            saveFileViaMediaStore("manifest.json", subDir, manifestJson, "application/json")
            saveFileViaMediaStore("event-timeline.jsonl", subDir, eventTimelineJsonl, "application/x-ndjson")
            saveFileViaMediaStore("decision-trace.jsonl", subDir, decisionTraceJsonl, "application/x-ndjson")
            saveFileViaMediaStore("platform-trace.jsonl", subDir, platformTraceJsonl, "application/x-ndjson")

            val result = Arguments.createMap().apply {
                putString("path", "Downloads/$subDir")
                putInt("fileCount", 4)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("EXPORT_ERROR", "Failed to save evidence: ${e.message}")
        }
    }

    private fun saveFileViaMediaStore(fileName: String, subDir: String, content: String, mimeType: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            // Android 10+ : MediaStore API (Bug 4 fix)
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, fileName)
                put(MediaStore.Downloads.MIME_TYPE, mimeType)
                put(MediaStore.Downloads.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/$subDir")
            }
            val resolver = reactContext.contentResolver
            val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: throw Exception("Failed to create MediaStore entry for $fileName")
            resolver.openOutputStream(uri)?.use { outputStream ->
                outputStream.write(content.toByteArray(Charsets.UTF_8))
            } ?: throw Exception("Failed to open output stream for $fileName")
        } else {
            // Legacy fallback
            val downloadsDir = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS
            )
            val evidenceDir = File(downloadsDir, subDir)
            evidenceDir.mkdirs()
            FileWriter(File(evidenceDir, fileName)).use { it.write(content) }
        }
    }

    /**
     * Share evidence folder via Android share sheet.
     */
    @ReactMethod
    fun shareEvidence(
        buildId: String,
        manifestJson: String,
        eventTimelineJsonl: String,
        decisionTraceJsonl: String,
        platformTraceJsonl: String,
        promise: Promise
    ) {
        try {
            val cacheDir = File(reactContext.cacheDir, "evidence-export/$buildId")
            cacheDir.mkdirs()

            val files = listOf(
                writeFile(File(cacheDir, "manifest.json"), manifestJson),
                writeFile(File(cacheDir, "event-timeline.jsonl"), eventTimelineJsonl),
                writeFile(File(cacheDir, "decision-trace.jsonl"), decisionTraceJsonl),
                writeFile(File(cacheDir, "platform-trace.jsonl"), platformTraceJsonl),
            )

            val uris = ArrayList(files.map { file ->
                androidx.core.content.FileProvider.getUriForFile(
                    reactContext, "${reactContext.packageName}.fileprovider", file
                )
            })

            val shareIntent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                type = "application/json"
                putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
                putExtra(Intent.EXTRA_SUBJECT, "SpendSense Evidence Bundle — $buildId")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            reactContext.startActivity(
                Intent.createChooser(shareIntent, "Share Evidence Bundle").apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
            )

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SHARE_ERROR", "Failed to share evidence: ${e.message}")
        }
    }

    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        try {
            val result = Arguments.createMap().apply {
                putString("model", android.os.Build.MODEL)
                putString("manufacturer", android.os.Build.MANUFACTURER)
                putString("androidVersion", android.os.Build.VERSION.RELEASE)
                putInt("sdkInt", android.os.Build.VERSION.SDK_INT)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("DEVICE_INFO_ERROR", e.message)
        }
    }

    private fun writeFile(file: File, content: String): File {
        FileWriter(file).use { it.write(content) }
        return file
    }
}
