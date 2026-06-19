package com.auraboxedgifts.orders.notifications

import android.content.Context
import com.auraboxedgifts.orders.data.ApiClient
import com.auraboxedgifts.orders.data.AuraRepository
import com.auraboxedgifts.orders.data.TokenStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

object FcmTokenRegistrar {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    fun register(context: Context, fcmToken: String) {
        scope.launch {
            try {
                val store = TokenStore(context)
                val repository = AuraRepository(ApiClient.create())
                val adminToken = store.getAdminToken()
                val customerToken = store.getCustomerToken()
                when {
                    !adminToken.isNullOrBlank() -> repository.registerFcmToken(
                        adminToken,
                        "admin",
                        store.getAdminEmail(),
                        fcmToken
                    )
                    !customerToken.isNullOrBlank() -> repository.registerFcmToken(
                        customerToken,
                        "customer",
                        store.getCustomerEmail(),
                        fcmToken
                    )
                }
            } catch (_: Exception) { }
        }
    }
}
