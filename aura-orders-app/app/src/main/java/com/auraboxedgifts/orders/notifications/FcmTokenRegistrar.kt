package com.auraboxedgifts.orders.notifications

import android.content.Context
import android.util.Log
import com.auraboxedgifts.orders.data.ApiClient
import com.auraboxedgifts.orders.data.AuraRepository
import com.auraboxedgifts.orders.data.TokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

object FcmTokenRegistrar {
    private const val TAG = "AuraFCM"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun register(context: Context, fcmToken: String) {
        scope.launch {
            try {
                val store = TokenStore(context)
                store.saveFcmToken(fcmToken)
                val repository = AuraRepository(ApiClient.create())
                val adminToken = store.getAdminToken()
                val customerToken = store.getCustomerToken()
                when {
                    !adminToken.isNullOrBlank() -> {
                        repository.registerFcmToken(
                            adminToken,
                            "admin",
                            store.getAdminEmail(),
                            fcmToken
                        )
                        Log.i(TAG, "Admin FCM token registered on server")
                    }
                    !customerToken.isNullOrBlank() -> {
                        repository.registerFcmToken(
                            customerToken,
                            "customer",
                            store.getCustomerEmail(),
                            fcmToken
                        )
                        Log.i(TAG, "Customer FCM token registered on server")
                    }
                    else -> Log.d(TAG, "FCM token cached — will register after sign-in")
                }
            } catch (e: Exception) {
                Log.w(TAG, "FCM token registration failed: ${e.message}")
            }
        }
    }
}
