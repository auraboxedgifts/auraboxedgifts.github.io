package com.auraboxedgifts.orders.notifications

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class AuraFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed")
        FcmTokenRegistrar.register(applicationContext, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.notification?.title ?: message.data["title"] ?: "Aura Boxed Gifts"
        val body = message.notification?.body ?: message.data["body"] ?: return
        Log.i(TAG, "FCM received type=${message.data["type"]} orderId=${message.data["orderId"]}")
        OrderNotificationManager.ensureChannel(this)
        OrderNotificationManager.showGenericNotification(
            context = this,
            title = title,
            body = body,
            orderId = message.data["orderId"]
        )
    }

    companion object {
        private const val TAG = "AuraFCM"
    }
}
