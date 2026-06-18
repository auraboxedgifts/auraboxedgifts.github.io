package com.auraboxedgifts.orders.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

data class LocalCartItem(
    val productId: String,
    val qty: Int = 1
)

class CartStore(context: Context) {
    private val dataStore = context.dataStore
    private val cartKey = stringPreferencesKey("local_cart")
    private val gson = Gson()

    val cartFlow: Flow<List<LocalCartItem>> = dataStore.data.map { prefs ->
        parseCart(prefs[cartKey])
    }

    suspend fun getCart(): List<LocalCartItem> = parseCart(dataStore.data.first()[cartKey])

    suspend fun saveCart(items: List<LocalCartItem>) {
        dataStore.edit { prefs ->
            prefs[cartKey] = gson.toJson(items)
        }
    }

    suspend fun clear() {
        dataStore.edit { prefs -> prefs.remove(cartKey) }
    }

    private fun parseCart(json: String?): List<LocalCartItem> {
        if (json.isNullOrBlank()) return emptyList()
        return try {
            val type = object : TypeToken<List<LocalCartItem>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (_: Exception) {
            emptyList()
        }
    }
}
