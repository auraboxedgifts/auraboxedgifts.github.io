package com.auraboxedgifts.orders.ui.components

import com.auraboxedgifts.orders.BuildConfig

object ImageUrl {
    private val apiBase = BuildConfig.API_BASE_URL.trimEnd('/')

    fun resolve(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http://", ignoreCase = true) ||
            path.startsWith("https://", ignoreCase = true) ||
            path.startsWith("data:")
        ) {
            return path
        }
        if (path.startsWith("/")) return "$apiBase$path"
        return path
    }
}
