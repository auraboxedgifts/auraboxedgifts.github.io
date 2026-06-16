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

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "aura_orders")

class TokenStore(private val context: Context) {

    private val tokenKey = stringPreferencesKey("admin_token")
    private val emailKey = stringPreferencesKey("admin_email")
    private val knownOrderIdsKey = stringSetPreferencesKey("known_order_ids")
    private val notificationsSeededKey = booleanPreferencesKey("notifications_seeded")

    val tokenFlow: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[tokenKey]
    }

    val emailFlow: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[emailKey]
    }

    suspend fun getToken(): String? = context.dataStore.data.first()[tokenKey]

    suspend fun saveSession(token: String, email: String) {
        context.dataStore.edit { prefs ->
            prefs[tokenKey] = token
            prefs[emailKey] = email
        }
    }

    suspend fun clear() {
        context.dataStore.edit { prefs ->
            prefs.remove(tokenKey)
            prefs.remove(emailKey)
            prefs.remove(knownOrderIdsKey)
            prefs.remove(notificationsSeededKey)
        }
    }

    suspend fun areNotificationsSeeded(): Boolean =
        context.dataStore.data.first()[notificationsSeededKey] == true

    suspend fun getKnownOrderIds(): Set<String> =
        context.dataStore.data.first()[knownOrderIdsKey] ?: emptySet()

    suspend fun seedKnownOrderIds(orderIds: Collection<String>) {
        context.dataStore.edit { prefs ->
            prefs[knownOrderIdsKey] = orderIds.toSet()
            prefs[notificationsSeededKey] = true
        }
    }

    suspend fun addKnownOrderIds(orderIds: Collection<String>) {
        context.dataStore.edit { prefs ->
            val current = prefs[knownOrderIdsKey] ?: emptySet()
            prefs[knownOrderIdsKey] = current + orderIds
            prefs[notificationsSeededKey] = true
        }
    }
}
