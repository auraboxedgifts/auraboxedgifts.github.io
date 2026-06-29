package com.auraboxedgifts.orders.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import coil.ImageLoader
import coil.request.ImageRequest
import com.auraboxedgifts.orders.MainActivity
import com.auraboxedgifts.orders.R
import com.auraboxedgifts.orders.data.CustomerRequest
import com.auraboxedgifts.orders.data.Order
import com.auraboxedgifts.orders.data.TokenStore
import com.auraboxedgifts.orders.data.displayContact
import com.auraboxedgifts.orders.data.displayName
import com.auraboxedgifts.orders.data.formatRupee
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object OrderNotificationManager {
    const val CHANNEL_ADMIN_ORDERS = "aura_new_orders"
    const val CHANNEL_ADMIN_REQUESTS = "aura_new_requests"
    const val CHANNEL_CUSTOMER_UPDATES = "aura_customer_updates"
    const val CHANNEL_PROMOTIONS = "aura_promotions"
    private var notificationId = 2000

    fun ensureChannel(context: Context, channelId: String = CHANNEL_ADMIN_ORDERS) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        val existing = manager.getNotificationChannel(channelId)
        if (existing != null) return

        val (name, description) = when (channelId) {
            CHANNEL_CUSTOMER_UPDATES -> "Order updates" to "Status updates for your Aura orders"
            CHANNEL_PROMOTIONS -> "Offers & new products" to "New products, offers, and announcements"
            CHANNEL_ADMIN_REQUESTS -> "Customer requests" to "Alerts when someone sends a gift or hamper inquiry (not paid)"
            else -> "New orders" to "Alerts when a customer places a new order"
        }
        val channel = NotificationChannel(channelId, name, NotificationManager.IMPORTANCE_HIGH).apply {
            this.description = description
        }
        manager.createNotificationChannel(channel)
    }

    fun ensureAllChannels(context: Context) {
        ensureChannel(context, CHANNEL_ADMIN_ORDERS)
        ensureChannel(context, CHANNEL_ADMIN_REQUESTS)
        ensureChannel(context, CHANNEL_CUSTOMER_UPDATES)
        ensureChannel(context, CHANNEL_PROMOTIONS)
    }

    fun channelForType(type: String?): String = when (type) {
        "new_request" -> CHANNEL_ADMIN_REQUESTS
        "order_status", "order_confirmed", "cart_reminder" -> CHANNEL_CUSTOMER_UPDATES
        "broadcast", "product_digest", "product_announcement", "app_version", "promotion" -> CHANNEL_PROMOTIONS
        else -> CHANNEL_ADMIN_ORDERS
    }

    fun canNotify(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled()
    }

    suspend fun processOrders(context: Context, orders: List<Order>): List<Order> {
        val store = TokenStore(context)
        val currentIds = orders.map { it.id }.toSet()
        if (!store.areNotificationsSeeded()) {
            store.seedKnownOrderIds(currentIds)
            return emptyList()
        }
        val known = store.getKnownOrderIds()
        val newOrders = orders.filter { it.id !in known }
        if (newOrders.isNotEmpty()) {
            store.addKnownOrderIds(newOrders.map { it.id })
        }
        return newOrders
    }

    suspend fun processRequests(context: Context, requests: List<CustomerRequest>): List<CustomerRequest> {
        val store = TokenStore(context)
        val currentIds = requests.map { it.id }.toSet()
        if (!store.areRequestsSeeded()) {
            store.seedKnownRequestIds(currentIds)
            return emptyList()
        }
        val known = store.getKnownRequestIds()
        val newRequests = requests.filter { it.id !in known }
        if (newRequests.isNotEmpty()) {
            store.addKnownRequestIds(newRequests.map { it.id })
        }
        return newRequests
    }

    fun showNewOrderNotifications(context: Context, newOrders: List<Order>) {
        if (newOrders.isEmpty() || !canNotify(context)) return
        ensureChannel(context, CHANNEL_ADMIN_ORDERS)
        val manager = NotificationManagerCompat.from(context)
        newOrders.forEach { order ->
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("order_id", order.id)
            }
            val pending = PendingIntent.getActivity(
                context,
                order.id.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val total = formatRupee(order.cart?.grandTotal ?: 0.0)
            val notification = NotificationCompat.Builder(context, CHANNEL_ADMIN_ORDERS)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("New order from ${order.displayName()}")
                .setContentText("$total · ${order.cart?.lines?.size ?: 0} item(s)")
                .setStyle(
                    NotificationCompat.BigTextStyle().bigText(
                        "${order.displayName()} placed a new order ($total). Tap to view details."
                    )
                )
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pending)
                .build()
            manager.notify(notificationId++, notification)
        }
    }

    fun showNewRequestNotifications(context: Context, newRequests: List<CustomerRequest>) {
        if (newRequests.isEmpty() || !canNotify(context)) return
        ensureChannel(context, CHANNEL_ADMIN_REQUESTS)
        val manager = NotificationManagerCompat.from(context)
        newRequests.forEach { request ->
            val intent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                putExtra("request_id", request.id)
            }
            val pending = PendingIntent.getActivity(
                context,
                request.id.hashCode(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            val inquiryType = request.inquiryType ?: "Inquiry"
            val notification = NotificationCompat.Builder(context, CHANNEL_ADMIN_REQUESTS)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle("New request — $inquiryType")
                .setContentText("${request.displayName()} · ${request.displayContact()}")
                .setStyle(
                    NotificationCompat.BigTextStyle().bigText(
                        "${request.displayName()} sent a $inquiryType via Aura AI. Tap to view details."
                    )
                )
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pending)
                .build()
            manager.notify(notificationId++, notification)
        }
    }

    suspend fun showGenericNotification(
        context: Context,
        title: String,
        body: String,
        orderId: String? = null,
        requestId: String? = null,
        imageUrl: String? = null,
        type: String? = null,
        openCustomerOrders: Boolean = false
    ) {
        if (!canNotify(context)) return
        val channelId = channelForType(type)
        ensureChannel(context, channelId)
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (!orderId.isNullOrBlank()) putExtra("order_id", orderId)
            if (!requestId.isNullOrBlank()) putExtra("request_id", requestId)
            if (openCustomerOrders) putExtra("open_customer_orders", true)
        }
        val pending = PendingIntent.getActivity(
            context,
            (requestId ?: orderId ?: title).hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val builder = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pending)

        val bitmap = loadBitmap(context, imageUrl)
        if (bitmap != null) {
            builder.setLargeIcon(bitmap)
            builder.setStyle(
                NotificationCompat.BigPictureStyle()
                    .bigPicture(bitmap)
                    .bigLargeIcon(null as Bitmap?)
            )
        }

        NotificationManagerCompat.from(context).notify(notificationId++, builder.build())
    }

    private suspend fun loadBitmap(context: Context, imageUrl: String?): Bitmap? {
        val url = imageUrl?.trim().orEmpty()
        if (url.isBlank()) return null
        return withContext(Dispatchers.IO) {
            try {
                val loader = ImageLoader(context)
                val request = ImageRequest.Builder(context)
                    .data(url)
                    .allowHardware(false)
                    .build()
                val result = loader.execute(request)
                (result.drawable as? BitmapDrawable)?.bitmap
            } catch (_: Exception) {
                null
            }
        }
    }
}
