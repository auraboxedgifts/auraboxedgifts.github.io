package com.auraboxedgifts.orders

import android.app.Application
import com.auraboxedgifts.orders.notifications.FcmTokenRegistrar
import com.auraboxedgifts.orders.notifications.OrderPollWorker
import com.google.firebase.messaging.FirebaseMessaging

class AuraOrdersApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        OrderPollWorker.schedule(this)
        FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
            if (task.isSuccessful) {
                task.result?.let { FcmTokenRegistrar.register(this, it) }
            }
        }
    }
}
