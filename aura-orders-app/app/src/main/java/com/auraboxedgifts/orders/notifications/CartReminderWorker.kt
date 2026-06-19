package com.auraboxedgifts.orders.notifications

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.auraboxedgifts.orders.data.ApiClient
import com.auraboxedgifts.orders.data.AuraRepository
import com.auraboxedgifts.orders.data.CartStore
import com.auraboxedgifts.orders.data.TokenStore
import java.util.concurrent.TimeUnit

class CartReminderWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            val token = TokenStore(applicationContext).getCustomerToken() ?: return Result.success()
            val items = CartStore(applicationContext).getCart()
            val count = items.sumOf { it.qty }
            if (count <= 0) return Result.success()
            AuraRepository(ApiClient.create()).requestCartReminder(token, count)
            Result.success()
        } catch (_: Exception) {
            Result.retry()
        }
    }

    companion object {
        private const val WORK_NAME = "aura_cart_reminder"

        fun schedule(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<CartReminderWorker>()
                .setInitialDelay(6, TimeUnit.HOURS)
                .setConstraints(constraints)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                request
            )
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
        }
    }
}
