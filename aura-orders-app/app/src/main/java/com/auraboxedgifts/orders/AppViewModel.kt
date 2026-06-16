package com.auraboxedgifts.orders

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.auraboxedgifts.orders.data.ApiClient
import com.auraboxedgifts.orders.data.ApiException
import com.auraboxedgifts.orders.data.AuraRepository
import com.auraboxedgifts.orders.data.Order
import com.auraboxedgifts.orders.data.OrderStatus
import com.auraboxedgifts.orders.data.TokenStore
import com.auraboxedgifts.orders.data.isPaid
import com.auraboxedgifts.orders.notifications.OrderNotificationManager
import com.auraboxedgifts.orders.notifications.OrderPollWorker
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

data class OrdersUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val orders: List<Order> = emptyList(),
    val error: String? = null,
    val filter: OrderFilter = OrderFilter.ALL
)

enum class OrderFilter(val label: String) {
    ALL("All"),
    PAID("Paid"),
    PENDING("Pending")
}

data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val isLoading: Boolean = false,
    val error: String? = null
)

data class OrderDetailUiState(
    val isLoading: Boolean = true,
    val order: Order? = null,
    val error: String? = null,
    val isUpdating: Boolean = false
)

class AppViewModel(application: Application) : AndroidViewModel(application) {

    private val tokenStore = TokenStore(application)
    private val repository = AuraRepository(ApiClient.create())
    private var foregroundPollJob: Job? = null

    val token = tokenStore.tokenFlow.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        null
    )

    val adminEmail = tokenStore.emailFlow.stateIn(
        viewModelScope,
        SharingStarted.WhileSubscribed(5_000),
        null
    )

    private val _loginState = MutableStateFlow(LoginUiState())
    val loginState: StateFlow<LoginUiState> = _loginState.asStateFlow()

    private val _ordersState = MutableStateFlow(OrdersUiState())
    val ordersState: StateFlow<OrdersUiState> = _ordersState.asStateFlow()

    private val _detailState = MutableStateFlow(OrderDetailUiState())
    val detailState: StateFlow<OrderDetailUiState> = _detailState.asStateFlow()

    fun updateLoginEmail(value: String) {
        _loginState.value = _loginState.value.copy(email = value, error = null)
    }

    fun updateLoginPassword(value: String) {
        _loginState.value = _loginState.value.copy(password = value, error = null)
    }

    fun login(onSuccess: () -> Unit) {
        val current = _loginState.value
        if (current.email.isBlank() || current.password.isBlank()) {
            _loginState.value = current.copy(error = "Enter email and password")
            return
        }
        viewModelScope.launch {
            _loginState.value = current.copy(isLoading = true, error = null)
            try {
                val result = repository.login(current.email, current.password)
                tokenStore.saveSession(result.token, result.email)
                OrderPollWorker.schedule(getApplication())
                _loginState.value = LoginUiState()
                loadOrders(result.token, refreshing = false, checkNotifications = true)
                onSuccess()
            } catch (e: ApiException) {
                _loginState.value = current.copy(isLoading = false, error = e.message)
            } catch (e: Exception) {
                _loginState.value = current.copy(
                    isLoading = false,
                    error = "Could not connect. Check your internet."
                )
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            stopForegroundOrderPolling()
            OrderPollWorker.cancel(getApplication())
            tokenStore.clear()
            _ordersState.value = OrdersUiState()
            _detailState.value = OrderDetailUiState()
        }
    }

    fun setOrderFilter(filter: OrderFilter) {
        _ordersState.value = _ordersState.value.copy(filter = filter)
    }

    fun loadOrders(
        authToken: String? = token.value,
        refreshing: Boolean = false,
        checkNotifications: Boolean = true
    ) {
        if (authToken.isNullOrBlank()) return
        viewModelScope.launch {
            _ordersState.value = _ordersState.value.copy(
                isLoading = !refreshing,
                isRefreshing = refreshing,
                error = null
            )
            try {
                val orders = repository.fetchOrders(authToken)
                if (checkNotifications) {
                    notifyIfNewOrders(orders)
                }
                _ordersState.value = _ordersState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    orders = orders
                )
            } catch (e: ApiException) {
                _ordersState.value = _ordersState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    error = e.message
                )
            } catch (e: Exception) {
                _ordersState.value = _ordersState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    error = "Could not load orders"
                )
            }
        }
    }

    fun startForegroundOrderPolling() {
        if (foregroundPollJob?.isActive == true) return
        foregroundPollJob = viewModelScope.launch {
            while (isActive) {
                delay(45_000)
                val authToken = token.value ?: continue
                try {
                    val orders = repository.fetchOrders(authToken)
                    notifyIfNewOrders(orders)
                    _ordersState.value = _ordersState.value.copy(orders = orders)
                } catch (_: Exception) {
                    // Ignore transient polling errors
                }
            }
        }
    }

    fun stopForegroundOrderPolling() {
        foregroundPollJob?.cancel()
        foregroundPollJob = null
    }

    private suspend fun notifyIfNewOrders(orders: List<Order>) {
        val ctx = getApplication<Application>()
        val newOrders = OrderNotificationManager.processOrders(ctx, orders)
        OrderNotificationManager.showNewOrderNotifications(ctx, newOrders)
    }

    fun loadOrderDetail(orderId: String, authToken: String? = token.value) {
        if (authToken.isNullOrBlank()) return
        viewModelScope.launch {
            _detailState.value = OrderDetailUiState(isLoading = true)
            try {
                val order = repository.fetchOrder(authToken, orderId)
                _detailState.value = OrderDetailUiState(isLoading = false, order = order)
            } catch (e: ApiException) {
                _detailState.value = OrderDetailUiState(isLoading = false, error = e.message)
            } catch (e: Exception) {
                _detailState.value = OrderDetailUiState(
                    isLoading = false,
                    error = "Could not load order details"
                )
            }
        }
    }

    fun updateOrderStatus(orderId: String, status: OrderStatus, authToken: String? = token.value) {
        if (authToken.isNullOrBlank()) return
        viewModelScope.launch {
            _detailState.value = _detailState.value.copy(isUpdating = true, error = null)
            try {
                val updated = repository.updateOrderStatus(authToken, orderId, status.apiValue)
                _detailState.value = OrderDetailUiState(isLoading = false, order = updated)
                val currentOrders = _ordersState.value.orders
                _ordersState.value = _ordersState.value.copy(
                    orders = currentOrders.map { if (it.id == orderId) updated else it }
                )
            } catch (e: ApiException) {
                _detailState.value = _detailState.value.copy(isUpdating = false, error = e.message)
            } catch (e: Exception) {
                _detailState.value = _detailState.value.copy(
                    isUpdating = false,
                    error = "Could not update status"
                )
            }
        }
    }

    fun filteredOrders(): List<Order> {
        val state = _ordersState.value
        return when (state.filter) {
            OrderFilter.ALL -> state.orders
            OrderFilter.PAID -> state.orders.filter { it.isPaid() }
            OrderFilter.PENDING -> state.orders.filter { !it.isPaid() }
        }
    }
}

private val displayFormatter = DateTimeFormatter.ofPattern("d MMM yyyy, h:mm a", Locale.ENGLISH)
    .withZone(ZoneId.of("Asia/Kolkata"))

fun formatOrderDate(iso: String?): String {
    if (iso.isNullOrBlank()) return "—"
    return try {
        displayFormatter.format(Instant.parse(iso))
    } catch (_: Exception) {
        iso
    }
}

fun orderItemCount(order: Order): Int =
    order.cart?.lines?.sumOf { it.qty } ?: 0
