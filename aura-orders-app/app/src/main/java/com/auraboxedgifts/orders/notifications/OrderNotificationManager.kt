package com.auraboxedgifts.orders.notifications

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.auraboxedgifts.orders.MainActivity
import com.auraboxedgifts.orders.R
import com.auraboxedgifts.orders.data.Order
import com.auraboxedgifts.orders.data.TokenStore
import com.auraboxedgifts.orders.data.displayName
import com.auraboxedgifts.orders.data.formatRupee

object OrderNotificationManager {
    private const val CHANNEL_ID = "aura_new_orders"
    private const val CHANNEL_NAME = "New orders"
    private var notificationId = 2000

    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Alerts when a customer places a new order"
        }
        val manager = context.getSystemService(NotificationManager::class.java)
        manager?.createNotificationChannel(channel)
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

    fun showNewOrderNotifications(context: Context, newOrders: List<Order>) {
        if (newOrders.isEmpty() || !canNotify(context)) return
        ensureChannel(context)
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
            val notification = NotificationCompat.Builder(context, CHANNEL_ID)
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

    fun showGenericNotification(
        context: Context,
        title: String,
        body: String,
        orderId: String? = null
    ) {
        if (!canNotify(context)) return
        ensureChannel(context)
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (!orderId.isNullOrBlank()) putExtra("order_id", orderId)
        }
        val pending = PendingIntent.getActivity(
            context,
            (orderId ?: title).hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .build()
        NotificationManagerCompat.from(context).notify(notificationId++, notification)
    }
}
