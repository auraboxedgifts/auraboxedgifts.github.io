package com.auraboxedgifts.orders.notifications

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.auraboxedgifts.orders.data.ApiClient
import com.auraboxedgifts.orders.data.AuraRepository
import com.auraboxedgifts.orders.data.TokenStore
import java.util.concurrent.TimeUnit

class OrderPollWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val token = TokenStore(applicationContext).getAdminToken() ?: return Result.success()
            val orders = AuraRepository(ApiClient.create()).fetchOrders(token)
            val newOrders = OrderNotificationManager.processOrders(applicationContext, orders)
            OrderNotificationManager.showNewOrderNotifications(applicationContext, newOrders)
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val WORK_NAME = "aura_order_poll"

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = PeriodicWorkRequestBuilder<OrderPollWorker>(15, TimeUnit.MINUTES)
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.UPDATE,
                request
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }
    }
}
