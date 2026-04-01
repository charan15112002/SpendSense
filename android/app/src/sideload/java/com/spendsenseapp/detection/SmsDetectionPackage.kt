package com.spendsenseapp.detection

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Native Package for sideload-only SMS modules.
 * (Lock ID: S4-M2 — sideload uses READ_SMS primary)
 */
class SmsDetectionPackage : ReactPackage {

    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> {
        return listOf(SmsBackfillModule(reactContext))
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> {
        return emptyList()
    }
}
