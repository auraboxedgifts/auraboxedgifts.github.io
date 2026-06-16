package com.auraboxedgifts.orders

import android.app.Application
import com.auraboxedgifts.orders.notifications.OrderPollWorker

class AuraOrdersApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        OrderPollWorker.schedule(this)
    }
}
