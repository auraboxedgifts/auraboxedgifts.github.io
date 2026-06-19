package com.auraboxedgifts.orders.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "aura_orders")

class TokenStore(private val context: Context) {

    private val adminTokenKey = stringPreferencesKey("admin_token")
    private val adminEmailKey = stringPreferencesKey("admin_email")
    private val customerTokenKey = stringPreferencesKey("customer_token")
    private val customerEmailKey = stringPreferencesKey("customer_email")
    private val customerNameKey = stringPreferencesKey("customer_name")
    private val knownOrderIdsKey = stringSetPreferencesKey("known_order_ids")
    private val notificationsSeededKey = booleanPreferencesKey("notifications_seeded")

    val adminTokenFlow: Flow<String?> = context.dataStore.data.map { it[adminTokenKey] }
    val adminEmailFlow: Flow<String?> = context.dataStore.data.map { it[adminEmailKey] }
    val customerTokenFlow: Flow<String?> = context.dataStore.data.map { it[customerTokenKey] }
    val customerEmailFlow: Flow<String?> = context.dataStore.data.map { it[customerEmailKey] }
    val customerNameFlow: Flow<String?> = context.dataStore.data.map { it[customerNameKey] }

    /** @deprecated use adminTokenFlow */
    val tokenFlow: Flow<String?> = adminTokenFlow
    val emailFlow: Flow<String?> = adminEmailFlow

    suspend fun getAdminToken(): String? = context.dataStore.data.first()[adminTokenKey]
    suspend fun getCustomerToken(): String? = context.dataStore.data.first()[customerTokenKey]
    suspend fun getAdminEmail(): String? = context.dataStore.data.first()[adminEmailKey]
    suspend fun getCustomerEmail(): String? = context.dataStore.data.first()[customerEmailKey]

    suspend fun saveAdminSession(token: String, email: String) {
        context.dataStore.edit { prefs ->
            prefs[adminTokenKey] = token
            prefs[adminEmailKey] = email
        }
    }

    suspend fun saveCustomerSession(token: String, email: String, name: String = "") {
        context.dataStore.edit { prefs ->
            prefs[customerTokenKey] = token
            prefs[customerEmailKey] = email
            prefs[customerNameKey] = name
        }
    }

    suspend fun clearAdmin() {
        context.dataStore.edit { prefs ->
            prefs.remove(adminTokenKey)
            prefs.remove(adminEmailKey)
            prefs.remove(knownOrderIdsKey)
            prefs.remove(notificationsSeededKey)
        }
    }

    suspend fun clearCustomer() {
        context.dataStore.edit { prefs ->
            prefs.remove(customerTokenKey)
            prefs.remove(customerEmailKey)
            prefs.remove(customerNameKey)
        }
    }

    suspend fun clear() = clearAdmin()

    suspend fun areNotificationsSeeded(): Boolean =
        context.dataStore.data.first()[notificationsSeededKey] == true

    suspend fun getKnownOrderIds(): Set<String> =
        context.dataStore.data.first()[knownOrderIdsKey] ?: emptySet()

    suspend fun seedKnownOrderIds(orderIds: Iterable<String>) {
        context.dataStore.edit { prefs ->
            prefs[knownOrderIdsKey] = orderIds.toSet()
            prefs[notificationsSeededKey] = true
        }
    }

    suspend fun addKnownOrderIds(orderIds: Iterable<String>) {
        context.dataStore.edit { prefs ->
            val current = prefs[knownOrderIdsKey] ?: emptySet()
            prefs[knownOrderIdsKey] = current + orderIds.toSet()
            prefs[notificationsSeededKey] = true
        }
    }
}
