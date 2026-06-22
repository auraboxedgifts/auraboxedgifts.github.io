package com.auraboxedgifts.orders.notifications

import android.util.Log
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class AuraFirebaseMessagingService : FirebaseMessagingService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "FCM token refreshed")
        FcmTokenRegistrar.register(applicationContext, token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val data = message.data
        val type = data["type"].orEmpty()
        val title = message.notification?.title ?: data["title"] ?: "Aura Boxed Gifts"
        val body = message.notification?.body ?: data["body"] ?: return
        val orderId = data["orderId"]
        val imageUrl = data["imageUrl"]
        val openCustomerOrders = type == "order_status" || type == "order_confirmed"

        Log.i(TAG, "FCM received type=$type orderId=${orderId ?: "-"}")
        OrderNotificationManager.ensureAllChannels(this)
        scope.launch {
            OrderNotificationManager.showGenericNotification(
                context = this@AuraFirebaseMessagingService,
                title = title,
                body = body,
                orderId = orderId,
                imageUrl = imageUrl,
                type = type,
                openCustomerOrders = openCustomerOrders
            )
        }
    }

    companion object {
        private const val TAG = "AuraFCM"
    }
}
