package com.auraboxedgifts.orders

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.auraboxedgifts.orders.data.ApiClient
import com.auraboxedgifts.orders.data.ApiException
import com.auraboxedgifts.orders.data.AuraRepository
import com.auraboxedgifts.orders.data.Collection
import com.auraboxedgifts.orders.data.Order
import com.auraboxedgifts.orders.data.OrderStatus
import com.auraboxedgifts.orders.data.Product
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

data class CatalogUiState(
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val products: List<Product> = emptyList(),
    val collections: List<Collection> = emptyList(),
    val selectedCollection: String? = null,
    val searchQuery: String = "",
    val error: String? = null
)

data class ProductDetailUiState(
    val isLoading: Boolean = false,
    val product: Product? = null,
    val error: String? = null
)

enum class MainTab(val label: String) {
    HOME("Home"),
    ORDERS("Orders"),
    CATALOG("Catalog"),
    PROFILE("Profile")
}

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

    private val _catalogState = MutableStateFlow(CatalogUiState())
    val catalogState: StateFlow<CatalogUiState> = _catalogState.asStateFlow()

    private val _productDetailState = MutableStateFlow(ProductDetailUiState())
    val productDetailState: StateFlow<ProductDetailUiState> = _productDetailState.asStateFlow()

    private val _selectedTab = MutableStateFlow(MainTab.HOME)
    val selectedTab: StateFlow<MainTab> = _selectedTab.asStateFlow()

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
                loadCatalog(refreshing = false)
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
            _catalogState.value = CatalogUiState()
            _productDetailState.value = ProductDetailUiState()
            _selectedTab.value = MainTab.HOME
        }
    }

    fun selectTab(tab: MainTab) {
        _selectedTab.value = tab
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

    fun loadCatalog(refreshing: Boolean = false) {
        viewModelScope.launch {
            _catalogState.value = _catalogState.value.copy(
                isLoading = !refreshing && _catalogState.value.products.isEmpty(),
                isRefreshing = refreshing,
                error = null
            )
            try {
                val products = repository.fetchProducts()
                val collections = repository.fetchCollections()
                _catalogState.value = _catalogState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    products = products,
                    collections = collections
                )
            } catch (e: ApiException) {
                _catalogState.value = _catalogState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    error = e.message
                )
            } catch (_: Exception) {
                _catalogState.value = _catalogState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    error = "Could not load catalog"
                )
            }
        }
    }

    fun setCatalogCollection(slug: String?) {
        _catalogState.value = _catalogState.value.copy(selectedCollection = slug)
    }

    fun setCatalogSearch(query: String) {
        _catalogState.value = _catalogState.value.copy(searchQuery = query)
    }

    fun filteredProducts(): List<Product> {
        val state = _catalogState.value
        var list = state.products
        state.selectedCollection?.let { slug ->
            list = list.filter { it.collection == slug }
        }
        val query = state.searchQuery.trim()
        if (query.isNotBlank()) {
            list = list.filter {
                it.name.contains(query, ignoreCase = true) ||
                    it.description.orEmpty().contains(query, ignoreCase = true) ||
                    it.tags.orEmpty().any { tag -> tag.contains(query, ignoreCase = true) }
            }
        }
        return list
    }

    fun loadProductDetail(productId: String) {
        viewModelScope.launch {
            val cached = _catalogState.value.products.find { it.id == productId }
            if (cached != null) {
                _productDetailState.value = ProductDetailUiState(product = cached)
                return@launch
            }
            _productDetailState.value = ProductDetailUiState(isLoading = true)
            try {
                if (_catalogState.value.products.isEmpty()) {
                    val products = repository.fetchProducts()
                    val collections = repository.fetchCollections()
                    _catalogState.value = _catalogState.value.copy(
                        products = products,
                        collections = collections
                    )
                }
                val product = _catalogState.value.products.find { it.id == productId }
                _productDetailState.value = if (product != null) {
                    ProductDetailUiState(product = product)
                } else {
                    ProductDetailUiState(error = "Product not found")
                }
            } catch (e: ApiException) {
                _productDetailState.value = ProductDetailUiState(error = e.message)
            } catch (_: Exception) {
                _productDetailState.value = ProductDetailUiState(error = "Could not load product")
            }
        }
    }

    fun collectionName(slug: String): String =
        _catalogState.value.collections.find { it.slug == slug }?.name ?: slug.replaceFirstChar {
            if (it.isLowerCase()) it.titlecase(Locale.ENGLISH) else it.toString()
        }

    fun dashboardStats(): DashboardStats {
        val orders = _ordersState.value.orders
        val products = _catalogState.value.products
        return DashboardStats(
            totalOrders = orders.size,
            paidOrders = orders.count { it.isPaid() },
            pendingOrders = orders.count { !it.isPaid() },
            totalProducts = products.size,
            totalCollections = _catalogState.value.collections.size,
            recentOrders = orders.take(5)
        )
    }
}

data class DashboardStats(
    val totalOrders: Int,
    val paidOrders: Int,
    val pendingOrders: Int,
    val totalProducts: Int,
    val totalCollections: Int,
    val recentOrders: List<Order>
)

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
