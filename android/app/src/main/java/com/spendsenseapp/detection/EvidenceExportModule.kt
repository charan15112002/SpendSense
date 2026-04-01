package com.spendsenseapp.detection

import android.content.Intent
import android.os.Environment
import com.facebook.react.bridge.*
import java.io.File
import java.io.FileWriter

/**
 * Native module for exporting diagnostic evidence bundles.
 * (Lock IDs: evidence-bundle-contract, test-evidence-capture-plan)
 *
 * Saves evidence files to Downloads/SpendSense-Evidence/<build_id>/
 * Also supports Android share sheet for sending to Guardian.
 *
 * No background upload — evidence stays local until user exports.
 */
class EvidenceExportModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "EvidenceExport"

    /**
     * Save evidence bundle files to Downloads folder.
     * Creates: manifest.json, event-timeline.jsonl, decision-trace.jsonl, platform-trace.jsonl
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
            val downloadsDir = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS
            )
            val evidenceDir = File(downloadsDir, "SpendSense-Evidence/$buildId")
            evidenceDir.mkdirs()

            writeFile(File(evidenceDir, "manifest.json"), manifestJson)
            writeFile(File(evidenceDir, "event-timeline.jsonl"), eventTimelineJsonl)
            writeFile(File(evidenceDir, "decision-trace.jsonl"), decisionTraceJsonl)
            writeFile(File(evidenceDir, "platform-trace.jsonl"), platformTraceJsonl)

            val result = Arguments.createMap().apply {
                putString("path", evidenceDir.absolutePath)
                putInt("fileCount", 4)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("EXPORT_ERROR", "Failed to save evidence: ${e.message}")
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
            // First save to a temp location
            val cacheDir = File(reactContext.cacheDir, "evidence-export/$buildId")
            cacheDir.mkdirs()

            val manifestFile = writeFile(File(cacheDir, "manifest.json"), manifestJson)
            val timelineFile = writeFile(File(cacheDir, "event-timeline.jsonl"), eventTimelineJsonl)
            val decisionFile = writeFile(File(cacheDir, "decision-trace.jsonl"), decisionTraceJsonl)
            val platformFile = writeFile(File(cacheDir, "platform-trace.jsonl"), platformTraceJsonl)

            val shareIntent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
                type = "application/json"
                val uris = arrayListOf(
                    androidx.core.content.FileProvider.getUriForFile(
                        reactContext, "${reactContext.packageName}.fileprovider", manifestFile
                    ),
                    androidx.core.content.FileProvider.getUriForFile(
                        reactContext, "${reactContext.packageName}.fileprovider", timelineFile
                    ),
                    androidx.core.content.FileProvider.getUriForFile(
                        reactContext, "${reactContext.packageName}.fileprovider", decisionFile
                    ),
                    androidx.core.content.FileProvider.getUriForFile(
                        reactContext, "${reactContext.packageName}.fileprovider", platformFile
                    ),
                )
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

    /**
     * Get device info for build manifest.
     */
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
