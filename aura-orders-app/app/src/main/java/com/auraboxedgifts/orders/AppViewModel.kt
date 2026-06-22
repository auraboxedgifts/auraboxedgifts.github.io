package com.auraboxedgifts.orders

import android.app.Application
import android.content.Context
import android.media.AudioManager
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.auraboxedgifts.orders.data.ApiClient
import com.auraboxedgifts.orders.data.ApiException
import com.auraboxedgifts.orders.data.AppConfig
import com.auraboxedgifts.orders.data.IndianLocations
import com.auraboxedgifts.orders.data.AuraRepository
import com.auraboxedgifts.orders.data.AuraShowcaseItem
import com.auraboxedgifts.orders.data.AuraShowcaseSection
import com.auraboxedgifts.orders.data.Cart
import com.auraboxedgifts.orders.data.CartItemRequest
import com.auraboxedgifts.orders.data.CartStore
import com.auraboxedgifts.orders.data.CheckoutInfo
import com.auraboxedgifts.orders.data.Collection
import com.auraboxedgifts.orders.data.Customer
import com.auraboxedgifts.orders.data.LocalCartItem
import com.auraboxedgifts.orders.data.Order
import com.auraboxedgifts.orders.data.OrderStatus
import com.auraboxedgifts.orders.data.Product
import com.auraboxedgifts.orders.data.ProductPayload
import com.auraboxedgifts.orders.data.TokenStore
import com.auraboxedgifts.orders.data.Hamper
import com.auraboxedgifts.orders.BuildConfig
import com.auraboxedgifts.orders.voice.AuraLiveAudioPlayer
import com.auraboxedgifts.orders.voice.AuraLiveAudioRecorder
import com.auraboxedgifts.orders.voice.AuraLiveVoiceClient
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.auraboxedgifts.orders.data.StoreSettings
import com.auraboxedgifts.orders.data.VerifyPaymentRequest
import com.auraboxedgifts.orders.data.isPaid
import com.auraboxedgifts.orders.data.toProduct
import com.auraboxedgifts.orders.notifications.CartReminderWorker
import com.auraboxedgifts.orders.notifications.OrderNotificationManager
import com.auraboxedgifts.orders.notifications.OrderPollWorker
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

enum class AppMode { CUSTOMER, ADMIN }

enum class MainTab(val label: String) {
    HOME("Home"),
    ORDERS("Orders"),
    CATALOG("Catalog"),
    PROFILE("Profile")
}

enum class CustomerTab(val label: String) {
    SHOP("Shop"),
    ACCOUNT("Account")
}

enum class AuthMode { SIGN_IN, SIGN_UP, FORGOT_PASSWORD }

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

data class CustomerAuthUiState(
    val mode: AuthMode = AuthMode.SIGN_IN,
    val signInWithOtp: Boolean = false,
    val name: String = "",
    val email: String = "",
    val password: String = "",
    val otp: String = "",
    val otpSent: Boolean = false,
    val isOtpVerified: Boolean = false,
    val tempToken: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val successMessage: String? = null
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
    val hampers: List<Hamper> = emptyList(),
    val collections: List<Collection> = emptyList(),
    val selectedCollection: String? = null,
    val searchQuery: String = "",
    val error: String? = null
)

data class ProductDetailUiState(
    val isLoading: Boolean = false,
    val product: Product? = null,
    val error: String? = null,
    val isDeleting: Boolean = false
)

data class ProductFormUiState(
    val productId: String? = null,
    val name: String = "",
    val collection: String = "",
    val price: String = "",
    val image: String = "",
    val description: String = "",
    val tags: String = "",
    val isLoading: Boolean = false,
    val isUploading: Boolean = false,
    val error: String? = null,
    val saved: Boolean = false
)

data class CartUiState(
    val items: List<LocalCartItem> = emptyList(),
    val calculated: Cart? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

data class CheckoutUiState(
    val info: CheckoutInfo = CheckoutInfo(),
    val isProcessing: Boolean = false,
    val error: String? = null,
    val orderComplete: Order? = null
)

data class CustomerOrdersUiState(
    val isLoading: Boolean = false,
    val orders: List<Order> = emptyList(),
    val error: String? = null
)

data class DashboardStats(
    val totalOrders: Int,
    val paidOrders: Int,
    val pendingOrders: Int,
    val totalProducts: Int,
    val totalCollections: Int,
    val recentOrders: List<Order>
)

data class PaymentLaunchData(
    val keyId: String,
    val orderId: String,
    val amountPaise: Long,
    val customerName: String,
    val customerEmail: String,
    val customerPhone: String
)

enum class AuraVoicePhase {
    Idle, Connecting, Ready, Listening, Speaking, Error
}

data class AuraVoiceUiState(
    val phase: AuraVoicePhase = AuraVoicePhase.Idle,
    val statusText: String = "Talk to Aura AI",
    val isSessionActive: Boolean = false,
    val isMicMuted: Boolean = false,
    val isSpeakerphoneOn: Boolean = true,
    val audioLevel: Float = 0f,
    val error: String? = null,
    val showcaseTitle: String? = null,
    val showcaseItems: List<AuraShowcaseItem> = emptyList(),
    val showcaseSections: List<AuraShowcaseSection> = emptyList(),
    val cartSubtotal: Double? = null,
    val cartShipping: Double? = null,
    val cartGrandTotal: Double? = null
)

sealed class AiNavigationEvent {
    data object Shop : AiNavigationEvent()
    data object Cart : AiNavigationEvent()
    data object Account : AiNavigationEvent()
    data object Checkout : AiNavigationEvent()
    data class CustomerAuth(val mode: AuthMode) : AiNavigationEvent()
    data class Product(val productId: String) : AiNavigationEvent()
    data class AddToCart(val productId: String) : AiNavigationEvent()
    data class Search(val query: String) : AiNavigationEvent()
}

class AppViewModel(application: Application) : AndroidViewModel(application) {

    private val tokenStore = TokenStore(application)
    private val cartStore = CartStore(application)
    private val repository = AuraRepository(ApiClient.create())
    private var foregroundPollJob: Job? = null
    private var pendingCartItems: List<LocalCartItem> = emptyList()
    private var pendingCheckoutInfo: CheckoutInfo = CheckoutInfo()
    private var pendingFcmToken: String? = null

    val adminToken = tokenStore.adminTokenFlow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
    val adminEmail = tokenStore.adminEmailFlow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
    val customerToken = tokenStore.customerTokenFlow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
    val customerEmail = tokenStore.customerEmailFlow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)
    val customerName = tokenStore.customerNameFlow.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), null)

    val token = adminToken
    val isAdminLoggedIn: Boolean get() = !adminToken.value.isNullOrBlank()
    val isCustomerLoggedIn: Boolean get() = !customerToken.value.isNullOrBlank()

    val appMode: StateFlow<AppMode> = adminToken
        .map { token ->
            if (token.isNullOrBlank()) AppMode.CUSTOMER else AppMode.ADMIN
        }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), AppMode.CUSTOMER)

    private val _loginState = MutableStateFlow(LoginUiState())
    val loginState: StateFlow<LoginUiState> = _loginState.asStateFlow()

    private val _customerAuthState = MutableStateFlow(CustomerAuthUiState())
    val customerAuthState: StateFlow<CustomerAuthUiState> = _customerAuthState.asStateFlow()

    private val _ordersState = MutableStateFlow(OrdersUiState())
    val ordersState: StateFlow<OrdersUiState> = _ordersState.asStateFlow()

    private val _customerOrdersState = MutableStateFlow(CustomerOrdersUiState())
    val customerOrdersState: StateFlow<CustomerOrdersUiState> = _customerOrdersState.asStateFlow()

    private val _detailState = MutableStateFlow(OrderDetailUiState())
    val detailState: StateFlow<OrderDetailUiState> = _detailState.asStateFlow()

    private val _catalogState = MutableStateFlow(CatalogUiState())
    val catalogState: StateFlow<CatalogUiState> = _catalogState.asStateFlow()

    private val _productDetailState = MutableStateFlow(ProductDetailUiState())
    val productDetailState: StateFlow<ProductDetailUiState> = _productDetailState.asStateFlow()

    private val _productFormState = MutableStateFlow(ProductFormUiState())
    val productFormState: StateFlow<ProductFormUiState> = _productFormState.asStateFlow()

    private val _cartState = MutableStateFlow(CartUiState())
    val cartState: StateFlow<CartUiState> = _cartState.asStateFlow()

    private val _checkoutState = MutableStateFlow(CheckoutUiState())
    val checkoutState: StateFlow<CheckoutUiState> = _checkoutState.asStateFlow()

    private val _selectedTab = MutableStateFlow(MainTab.HOME)
    val selectedTab: StateFlow<MainTab> = _selectedTab.asStateFlow()

    private val _customerTab = MutableStateFlow(CustomerTab.SHOP)
    val customerTab: StateFlow<CustomerTab> = _customerTab.asStateFlow()

    private val _snackbarMessage = MutableStateFlow<String?>(null)
    val snackbarMessage: StateFlow<String?> = _snackbarMessage.asStateFlow()

    private val _paymentEvent = MutableSharedFlow<PaymentLaunchData>()
    val paymentEvent: SharedFlow<PaymentLaunchData> = _paymentEvent.asSharedFlow()

    private val _storeSettings = MutableStateFlow(StoreSettings())
    val storeSettings: StateFlow<StoreSettings> = _storeSettings.asStateFlow()

    private val _mapsConfig = MutableStateFlow(AppConfig())
    val mapsConfig: StateFlow<AppConfig> = _mapsConfig.asStateFlow()

    private val _aiState = MutableStateFlow(AuraVoiceUiState())
    val aiState: StateFlow<AuraVoiceUiState> = _aiState.asStateFlow()

    private val gson = Gson()
    private var liveVoiceClient: AuraLiveVoiceClient? = null
    private var liveAudioRecorder: AuraLiveAudioRecorder? = null
    private var liveAudioPlayer: AuraLiveAudioPlayer? = null
    private var liveMicSending = true
    private var previousAudioMode = AudioManager.MODE_NORMAL
    @Suppress("DEPRECATION")
    private var wasSpeakerphoneOn = false

    private val _aiNavigation = MutableSharedFlow<AiNavigationEvent>()
    val aiNavigation: SharedFlow<AiNavigationEvent> = _aiNavigation.asSharedFlow()

    init {
        viewModelScope.launch {
            cartStore.cartFlow.collect { items ->
                _cartState.value = _cartState.value.copy(items = items)
                refreshCartTotals(items)
                if (items.isNotEmpty() && isCustomerLoggedIn) {
                    CartReminderWorker.schedule(getApplication())
                } else if (items.isEmpty()) {
                    CartReminderWorker.cancel(getApplication())
                }
            }
        }
        viewModelScope.launch {
            try {
                _storeSettings.value = repository.fetchSettings()
            } catch (_: Exception) { }
        }
        viewModelScope.launch { loadCatalog() }
    }

    fun selectTab(tab: MainTab) { _selectedTab.value = tab }
    fun selectCustomerTab(tab: CustomerTab) { _customerTab.value = tab }

    fun updateLoginEmail(value: String) {
        _loginState.value = _loginState.value.copy(email = value, error = null)
    }

    fun updateLoginPassword(value: String) {
        _loginState.value = _loginState.value.copy(password = value, error = null)
    }

    fun adminLogin(onSuccess: () -> Unit) {
        val current = _loginState.value
        if (current.email.isBlank() || current.password.isBlank()) {
            _loginState.value = current.copy(error = "Enter email and password")
            return
        }
        viewModelScope.launch {
            _loginState.value = current.copy(isLoading = true, error = null)
            try {
                val result = repository.login(current.email, current.password)
                tokenStore.saveAdminSession(result.token, result.email)
                OrderPollWorker.schedule(getApplication())
                registerPushTokenIfAvailable()
                _loginState.value = LoginUiState()
                loadOrders(result.token, checkNotifications = true)
                loadCatalog()
                onSuccess()
            } catch (e: ApiException) {
                _loginState.value = current.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _loginState.value = current.copy(isLoading = false, error = "Could not connect")
            }
        }
    }

    fun logoutAdmin() {
        viewModelScope.launch {
            stopForegroundOrderPolling()
            OrderPollWorker.cancel(getApplication())
            tokenStore.clearAdmin()
            _ordersState.value = OrdersUiState()
            _detailState.value = OrderDetailUiState()
            _selectedTab.value = MainTab.HOME
            refreshStoreSettings()
        }
    }

    fun logoutCustomer() {
        viewModelScope.launch {
            tokenStore.clearCustomer()
            _customerOrdersState.value = CustomerOrdersUiState()
        }
    }

    fun deleteCustomerAccount(onSuccess: () -> Unit) {
        val token = customerToken.value ?: return
        viewModelScope.launch {
            try {
                repository.deleteCustomerAccount(token)
                tokenStore.clearCustomer()
                cartStore.clear()
                _customerOrdersState.value = CustomerOrdersUiState()
                _checkoutState.value = CheckoutUiState()
                _snackbarMessage.value = "Your account has been deleted"
                onSuccess()
            } catch (e: ApiException) {
                _snackbarMessage.value = e.message ?: "Could not delete account"
            } catch (_: Exception) {
                _snackbarMessage.value = "Could not delete account"
            }
        }
    }

    fun updateCustomerAuthEmail(v: String) {
        _customerAuthState.value = _customerAuthState.value.copy(email = v, error = null)
    }

    fun updateCustomerAuthPassword(v: String) {
        _customerAuthState.value = _customerAuthState.value.copy(password = v, error = null)
    }

    fun updateCustomerAuthOtp(v: String) {
        _customerAuthState.value = _customerAuthState.value.copy(otp = v, error = null)
    }

    fun updateCustomerAuthName(v: String) {
        _customerAuthState.value = _customerAuthState.value.copy(name = v, error = null)
    }

    fun setCustomerAuthMode(mode: AuthMode) {
        _customerAuthState.value = CustomerAuthUiState(mode = mode)
    }

    fun setSignInWithOtp(useOtp: Boolean) {
        val email = _customerAuthState.value.email
        _customerAuthState.value = CustomerAuthUiState(
            mode = AuthMode.SIGN_IN,
            email = email,
            signInWithOtp = useOtp
        )
    }

    private fun openCustomerAuthFromAi(mode: AuthMode, email: String?) {
        val normalizedEmail = email?.trim().orEmpty()
        _customerAuthState.value = CustomerAuthUiState(
            mode = mode,
            email = normalizedEmail
        )
        viewModelScope.launch {
            _aiNavigation.emit(AiNavigationEvent.CustomerAuth(mode))
        }
    }

    private fun verifyOtpFromAi(email: String, otp: String) {
        viewModelScope.launch {
            try {
                val (token, user) = repository.verifyOtp(email, otp)
                val normalizedEmail = email.trim().lowercase()
                tokenStore.saveCustomerSession(token, normalizedEmail, user?.name.orEmpty())
                _customerAuthState.value = CustomerAuthUiState()
                registerPushTokenIfAvailable()
                loadCustomerOrders()
                _snackbarMessage.value = "Signed in with OTP as $normalizedEmail"
            } catch (e: ApiException) {
                _snackbarMessage.value = e.message ?: "Invalid OTP"
            } catch (_: Exception) {
                _snackbarMessage.value = "Could not verify OTP"
            }
        }
    }

    fun sendCustomerOtp() {
        val email = _customerAuthState.value.email.trim()
        if (email.isBlank()) {
            _customerAuthState.value = _customerAuthState.value.copy(error = "Enter your email")
            return
        }
        val isSignUp = _customerAuthState.value.mode == AuthMode.SIGN_UP
        viewModelScope.launch {
            _customerAuthState.value = _customerAuthState.value.copy(isLoading = true, error = null)
            try {
                repository.sendOtp(email, signUp = isSignUp)
                _customerAuthState.value = _customerAuthState.value.copy(
                    isLoading = false,
                    otpSent = true,
                    successMessage = "OTP sent to $email"
                )
            } catch (e: ApiException) {
                _customerAuthState.value = _customerAuthState.value.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _customerAuthState.value = _customerAuthState.value.copy(isLoading = false, error = "Could not send OTP")
            }
        }
    }

    fun customerSignInWithOtp(onSuccess: () -> Unit) {
        val s = _customerAuthState.value
        if (!s.otpSent) {
            sendCustomerOtp()
            return
        }
        if (s.email.isBlank() || s.otp.isBlank()) {
            _customerAuthState.value = s.copy(error = "Enter email and OTP")
            return
        }
        viewModelScope.launch {
            _customerAuthState.value = s.copy(isLoading = true, error = null)
            try {
                val (token, user) = repository.verifyOtp(s.email, s.otp)
                tokenStore.saveCustomerSession(token, s.email.trim().lowercase(), user?.name.orEmpty())
                _customerAuthState.value = CustomerAuthUiState()
                registerPushTokenIfAvailable()
                loadCustomerOrders()
                onSuccess()
            } catch (e: ApiException) {
                _customerAuthState.value = s.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _customerAuthState.value = s.copy(isLoading = false, error = "Could not verify OTP")
            }
        }
    }

    fun customerSignIn(onSuccess: () -> Unit) {
        val s = _customerAuthState.value
        if (s.email.isBlank() || s.password.isBlank()) {
            _customerAuthState.value = s.copy(error = "Enter email and password")
            return
        }
        viewModelScope.launch {
            _customerAuthState.value = s.copy(isLoading = true, error = null)
            try {
                val (token, user) = repository.customerLogin(s.email, s.password)
                if (user?.isAdmin == true) {
                    tokenStore.saveAdminSession(token, s.email.trim().lowercase())
                    OrderPollWorker.schedule(getApplication())
                    registerPushTokenIfAvailable()
                    loadOrders(token)
                    _customerAuthState.value = CustomerAuthUiState()
                    onSuccess()
                    return@launch
                }
                tokenStore.saveCustomerSession(token, s.email.trim().lowercase(), user?.name.orEmpty())
                _customerAuthState.value = CustomerAuthUiState()
                registerPushTokenIfAvailable()
                loadCustomerOrders()
                onSuccess()
            } catch (e: ApiException) {
                _customerAuthState.value = s.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _customerAuthState.value = s.copy(isLoading = false, error = "Could not sign in")
            }
        }
    }

    fun customerSignUp(onSuccess: () -> Unit) {
        val s = _customerAuthState.value
        if (!s.isOtpVerified) {
            if (s.email.isBlank() || s.otp.isBlank()) {
                _customerAuthState.value = s.copy(error = "Enter email and OTP")
                return
            }
            viewModelScope.launch {
                _customerAuthState.value = s.copy(isLoading = true, error = null)
                try {
                    val (token, _) = repository.verifyOtp(s.email, s.otp)
                    _customerAuthState.value = s.copy(
                        isLoading = false,
                        isOtpVerified = true,
                        tempToken = token,
                        successMessage = "OTP verified! Enter your name and set a password."
                    )
                } catch (e: ApiException) {
                    _customerAuthState.value = s.copy(isLoading = false, error = e.message)
                } catch (_: Exception) {
                    _customerAuthState.value = s.copy(isLoading = false, error = "Could not verify OTP")
                }
            }
        } else {
            if (s.name.isBlank() || s.password.length < 6) {
                _customerAuthState.value = s.copy(error = "Enter a name and choosing a password of at least 6 characters")
                return
            }
            viewModelScope.launch {
                _customerAuthState.value = s.copy(isLoading = true, error = null)
                try {
                    val user = repository.setPassword(s.tempToken, s.password, s.name)
                    tokenStore.saveCustomerSession(s.tempToken, s.email.trim().lowercase(), user?.name ?: s.name)
                    _customerAuthState.value = CustomerAuthUiState()
                    registerPushTokenIfAvailable()
                    onSuccess()
                } catch (e: ApiException) {
                    _customerAuthState.value = s.copy(isLoading = false, error = e.message)
                } catch (_: Exception) {
                    _customerAuthState.value = s.copy(isLoading = false, error = "Could not complete registration")
                }
            }
        }
    }

    fun resetCustomerPassword(onSuccess: () -> Unit) {
        val s = _customerAuthState.value
        if (s.email.isBlank() || s.otp.isBlank() || s.password.length < 6) {
            _customerAuthState.value = s.copy(error = "Enter email, OTP, and a new password (min 6 chars)")
            return
        }
        viewModelScope.launch {
            _customerAuthState.value = s.copy(isLoading = true, error = null)
            try {
                val (token, user) = repository.resetPassword(s.email, s.otp, s.password)
                tokenStore.saveCustomerSession(token, s.email.trim().lowercase(), user?.name.orEmpty())
                _customerAuthState.value = CustomerAuthUiState()
                registerPushTokenIfAvailable()
                loadCustomerOrders()
                onSuccess()
            } catch (e: ApiException) {
                _customerAuthState.value = s.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _customerAuthState.value = s.copy(isLoading = false, error = "Could not reset password")
            }
        }
    }

    fun loadCustomerOrders() {
        val token = customerToken.value ?: return
        viewModelScope.launch {
            _customerOrdersState.value = _customerOrdersState.value.copy(isLoading = true, error = null)
            try {
                val orders = repository.fetchCustomerOrders(token)
                _customerOrdersState.value = CustomerOrdersUiState(isLoading = false, orders = orders)
            } catch (e: ApiException) {
                _customerOrdersState.value = CustomerOrdersUiState(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _customerOrdersState.value = CustomerOrdersUiState(isLoading = false, error = "Could not load orders")
            }
        }
    }

    fun clearSnackbar() {
        _snackbarMessage.value = null
    }

    fun addToCart(productId: String, qty: Int = 1) {
        viewModelScope.launch {
            val name = sellableName(productId)
            val current = cartStore.getCart().toMutableList()
            val idx = current.indexOfFirst { it.productId == productId }
            val addQty = qty.coerceAtLeast(1)
            if (idx >= 0) {
                current[idx] = current[idx].copy(qty = current[idx].qty + addQty)
            } else {
                current.add(LocalCartItem(productId, addQty))
            }
            cartStore.saveCart(current)
            scheduleCartReminderIfNeeded(current)
            _snackbarMessage.value = "$name added to cart"
        }
    }

    fun updateCartQty(productId: String, qty: Int) {
        viewModelScope.launch {
            val current = cartStore.getCart().toMutableList()
            if (qty <= 0) {
                current.removeAll { it.productId == productId }
            } else {
                val idx = current.indexOfFirst { it.productId == productId }
                if (idx >= 0) current[idx] = current[idx].copy(qty = qty)
            }
            cartStore.saveCart(current)
            scheduleCartReminderIfNeeded(current)
        }
    }

    fun clearCart() {
        viewModelScope.launch {
            cartStore.clear()
            CartReminderWorker.cancel(getApplication())
        }
    }

    private fun scheduleCartReminderIfNeeded(items: List<LocalCartItem>) {
        val count = items.sumOf { it.qty }
        if (count > 0 && isCustomerLoggedIn) {
            CartReminderWorker.schedule(getApplication())
        } else {
            CartReminderWorker.cancel(getApplication())
        }
    }

    private fun sellableName(productId: String): String =
        productForCartItem(productId)?.name
            ?: _catalogState.value.hampers.find { it.id == productId }?.title
            ?: "Item"

    private fun refreshCartTotals(items: List<LocalCartItem>) {
        if (items.isEmpty()) {
            _cartState.value = _cartState.value.copy(calculated = null, isLoading = false, error = null)
            return
        }
        viewModelScope.launch {
            _cartState.value = _cartState.value.copy(isLoading = true, error = null)
            try {
                val cart = repository.calculateCart(items)
                _cartState.value = _cartState.value.copy(isLoading = false, calculated = cart)
            } catch (e: ApiException) {
                _cartState.value = _cartState.value.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _cartState.value = _cartState.value.copy(isLoading = false, error = "Could not update cart")
            }
        }
    }

    fun cartItemCount(): Int = _cartState.value.items.sumOf { it.qty }

    fun cartGrandTotal(): Double {
        val state = _cartState.value
        state.calculated?.grandTotal?.takeIf { it > 0 }?.let { return it }
        if (state.items.isEmpty()) return 0.0
        val subtotal = state.items.sumOf { item ->
            val product = productForCartItem(item.productId)
            (product?.price ?: 0.0) * item.qty
        }
        val shipping = if (state.items.isNotEmpty()) _storeSettings.value.shippingFlatRate else 0.0
        return subtotal + shipping
    }

    fun cartSubtotal(): Double {
        val state = _cartState.value
        state.calculated?.subtotal?.takeIf { it > 0 }?.let { return it }
        return state.items.sumOf { item ->
            val product = productForCartItem(item.productId)
            (product?.price ?: 0.0) * item.qty
        }
    }

    fun shippingRate(): Double = _storeSettings.value.shippingFlatRate

    fun refreshStoreSettings() {
        viewModelScope.launch {
            try {
                _storeSettings.value = repository.fetchSettings()
                refreshCartTotals(_cartState.value.items)
            } catch (_: Exception) { }
        }
    }

    fun updateCheckoutInfo(transform: (CheckoutInfo) -> CheckoutInfo) {
        _checkoutState.value = _checkoutState.value.copy(info = transform(_checkoutState.value.info))
    }

    fun prepareCheckout() {
        viewModelScope.launch {
            try {
                _mapsConfig.value = repository.fetchConfig()
            } catch (_: Exception) { }
            try {
                val cart = if (_cartState.value.items.isNotEmpty()) {
                    repository.calculateCart(_cartState.value.items)
                } else null
                if (cart != null) {
                    _cartState.value = _cartState.value.copy(calculated = cart)
                }
            } catch (_: Exception) { }
            val name = customerName.value.orEmpty()
            val token = customerToken.value
            var info = _checkoutState.value.info
            if (name.isNotBlank()) {
                info = info.copy(name = name)
            }
            if (!token.isNullOrBlank()) {
                repository.fetchCheckoutInfo(token)?.let { saved ->
                    info = info.copy(
                        name = saved.name.ifBlank { info.name },
                        phone = normalizePhoneDigits(saved.phone).ifBlank { info.phone },
                        address = saved.address.ifBlank { info.address },
                        city = saved.city.ifBlank { info.city },
                        state = IndianLocations.normalizeState(saved.state) ?: saved.state.ifBlank { info.state },
                        pincode = saved.pincode.ifBlank { info.pincode }
                    )
                }
            }
            _checkoutState.value = _checkoutState.value.copy(info = info, error = null)
        }
    }

    fun applyCheckoutAddress(address: String, city: String, state: String, pincode: String) {
        updateCheckoutInfo { info ->
            info.copy(
                address = address.ifBlank { info.address },
                city = city.ifBlank { info.city },
                state = IndianLocations.normalizeState(state) ?: state.ifBlank { info.state },
                pincode = pincode.ifBlank { info.pincode }
            )
        }
    }

    private fun normalizePhoneDigits(raw: String): String {
        val digits = raw.filter { it.isDigit() }
        return when {
            digits.length == 10 -> digits
            digits.length >= 12 && digits.startsWith("91") -> digits.takeLast(10)
            else -> digits.take(10)
        }
    }

    fun startCheckout(onNeedAuth: () -> Unit) {
        if (!isCustomerLoggedIn) {
            onNeedAuth()
            return
        }
        val items = _cartState.value.items
        if (items.isEmpty()) return
        val info = _checkoutState.value.info
        if (info.name.isBlank() || info.phone.isBlank() || info.address.isBlank()) {
            _checkoutState.value = _checkoutState.value.copy(error = "Fill in name, phone and address")
            return
        }
        if (info.phone.length != 10) {
            _checkoutState.value = _checkoutState.value.copy(error = "Enter a valid 10-digit mobile number")
            return
        }
        if (info.state.isBlank() || info.city.isBlank()) {
            _checkoutState.value = _checkoutState.value.copy(error = "Select state and city")
            return
        }
        if (info.pincode.length != 6) {
            _checkoutState.value = _checkoutState.value.copy(error = "Enter a valid 6-digit pincode")
            return
        }
        val total = cartGrandTotal()
        if (total <= 0) {
            _checkoutState.value = _checkoutState.value.copy(error = "Cart total is invalid. Refresh and try again.")
            return
        }
        viewModelScope.launch {
            _checkoutState.value = _checkoutState.value.copy(isProcessing = true, error = null)
            try {
                val cart = repository.calculateCart(items)
                _cartState.value = _cartState.value.copy(calculated = cart, isLoading = false)
                val amount = cart.grandTotal.takeIf { it > 0 } ?: total
                val (order, keyId) = repository.createPaymentOrder(items, amount)
                pendingCartItems = items
                pendingCheckoutInfo = info
                _paymentEvent.emit(
                    PaymentLaunchData(
                        keyId = keyId,
                        orderId = order.id,
                        amountPaise = order.amount,
                        customerName = info.name,
                        customerEmail = customerEmail.value.orEmpty(),
                        customerPhone = "91${info.phone}"
                    )
                )
                _checkoutState.value = _checkoutState.value.copy(isProcessing = false)
            } catch (e: ApiException) {
                _checkoutState.value = _checkoutState.value.copy(isProcessing = false, error = e.message)
            } catch (e: Exception) {
                _checkoutState.value = _checkoutState.value.copy(
                    isProcessing = false,
                    error = e.message ?: "Could not start payment"
                )
            }
        }
    }

    fun onPaymentSuccess(paymentId: String, orderId: String, signature: String) {
        viewModelScope.launch {
            _checkoutState.value = _checkoutState.value.copy(isProcessing = true, error = null)
            try {
                val info = pendingCheckoutInfo
                val order = repository.verifyPayment(
                    VerifyPaymentRequest(
                        razorpay_order_id = orderId,
                        razorpay_payment_id = paymentId,
                        razorpay_signature = signature,
                        cartItems = pendingCartItems.map { CartItemRequest(it.productId, it.qty) },
                        customer = Customer(
                            name = info.name,
                            email = customerEmail.value,
                            phone = info.phone,
                            address = info.address,
                            city = info.city,
                            state = info.state,
                            pincode = info.pincode
                        )
                    )
                )
                cartStore.clear()
                CartReminderWorker.cancel(getApplication())
                _checkoutState.value = CheckoutUiState(orderComplete = order)
                loadCustomerOrders()
            } catch (e: ApiException) {
                _checkoutState.value = _checkoutState.value.copy(isProcessing = false, error = e.message)
            } catch (_: Exception) {
                _checkoutState.value = _checkoutState.value.copy(isProcessing = false, error = "Payment verification failed")
            }
        }
    }

    fun onPaymentError(message: String) {
        _checkoutState.value = _checkoutState.value.copy(isProcessing = false, error = message)
    }

    fun resetCheckout() {
        _checkoutState.value = CheckoutUiState()
        pendingCartItems = emptyList()
    }

    fun loadProductForm(productId: String?) {
        if (productId == null) {
            val defaultCollection = _catalogState.value.collections.firstOrNull()?.slug.orEmpty()
            _productFormState.value = ProductFormUiState(collection = defaultCollection)
            return
        }
        val product = _catalogState.value.products.find { it.id == productId }
        _productFormState.value = if (product != null) {
            ProductFormUiState(
                productId = product.id,
                name = product.name,
                collection = product.collection,
                price = product.price.toInt().toString(),
                image = product.image.orEmpty(),
                description = product.description.orEmpty(),
                tags = product.tags.orEmpty().joinToString(", ")
            )
        } else {
            ProductFormUiState(error = "Product not found")
        }
    }

    fun updateProductForm(update: ProductFormUiState.() -> ProductFormUiState) {
        _productFormState.value = _productFormState.value.update()
    }

    fun uploadProductImage(uri: Uri) {
        val token = adminToken.value ?: return
        viewModelScope.launch {
            _productFormState.value = _productFormState.value.copy(isUploading = true, error = null)
            try {
                val file = uriToTempFile(uri)
                val result = repository.uploadImage(token, file, "image/jpeg")
                file.delete()
                _productFormState.value = _productFormState.value.copy(
                    isUploading = false,
                    image = result.absoluteUrl ?: result.url
                )
            } catch (e: ApiException) {
                _productFormState.value = _productFormState.value.copy(isUploading = false, error = e.message)
            } catch (_: Exception) {
                _productFormState.value = _productFormState.value.copy(isUploading = false, error = "Upload failed")
            }
        }
    }

    fun saveProduct(onSuccess: () -> Unit) {
        val token = adminToken.value ?: return
        val form = _productFormState.value
        if (form.name.isBlank() || form.collection.isBlank() || form.image.isBlank() || form.price.isBlank()) {
            _productFormState.value = form.copy(error = "Name, collection, image and price are required")
            return
        }
        val price = form.price.toDoubleOrNull()
        if (price == null || price < 0) {
            _productFormState.value = form.copy(error = "Enter a valid price")
            return
        }
        val tags = form.tags.split(",").map { it.trim() }.filter { it.isNotBlank() }
        val payload = ProductPayload(
            name = form.name.trim(),
            collection = form.collection.trim(),
            price = price,
            image = form.image.trim(),
            description = form.description.trim(),
            tags = tags.ifEmpty { null }
        )
        viewModelScope.launch {
            _productFormState.value = form.copy(isLoading = true, error = null)
            try {
                if (form.productId == null) {
                    repository.createProduct(token, payload)
                } else {
                    repository.updateProduct(token, form.productId, payload)
                }
                loadCatalog(refreshing = true)
                _productFormState.value = ProductFormUiState(saved = true)
                onSuccess()
            } catch (e: ApiException) {
                _productFormState.value = form.copy(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _productFormState.value = form.copy(isLoading = false, error = "Could not save product")
            }
        }
    }

    fun deleteProduct(productId: String, onSuccess: () -> Unit) {
        val token = adminToken.value ?: return
        viewModelScope.launch {
            _productDetailState.value = _productDetailState.value.copy(isDeleting = true, error = null)
            try {
                repository.deleteProduct(token, productId)
                loadCatalog(refreshing = true)
                _productDetailState.value = ProductDetailUiState()
                onSuccess()
            } catch (e: ApiException) {
                _productDetailState.value = _productDetailState.value.copy(isDeleting = false, error = e.message)
            } catch (_: Exception) {
                _productDetailState.value = _productDetailState.value.copy(isDeleting = false, error = "Could not delete")
            }
        }
    }

    private fun uriToTempFile(uri: Uri): File {
        val ctx = getApplication<Application>()
        val file = File.createTempFile("upload_", ".jpg", ctx.cacheDir)
        ctx.contentResolver.openInputStream(uri)?.use { input ->
            FileOutputStream(file).use { output -> input.copyTo(output) }
        }
        return file
    }

    fun setOrderFilter(filter: OrderFilter) {
        _ordersState.value = _ordersState.value.copy(filter = filter)
    }

    fun loadOrders(
        authToken: String? = adminToken.value,
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
                if (checkNotifications) notifyIfNewOrders(orders)
                _ordersState.value = _ordersState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    orders = orders
                )
            } catch (e: ApiException) {
                _ordersState.value = _ordersState.value.copy(isLoading = false, isRefreshing = false, error = e.message)
            } catch (_: Exception) {
                _ordersState.value = _ordersState.value.copy(isLoading = false, isRefreshing = false, error = "Could not load orders")
            }
        }
    }

    fun startForegroundOrderPolling() {
        if (foregroundPollJob?.isActive == true) return
        foregroundPollJob = viewModelScope.launch {
            while (isActive) {
                delay(45_000)
                val authToken = adminToken.value ?: continue
                try {
                    val orders = repository.fetchOrders(authToken)
                    notifyIfNewOrders(orders)
                    _ordersState.value = _ordersState.value.copy(orders = orders)
                } catch (_: Exception) { }
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

    fun loadOrderDetail(orderId: String, authToken: String? = adminToken.value) {
        if (authToken.isNullOrBlank()) return
        viewModelScope.launch {
            _detailState.value = OrderDetailUiState(isLoading = true)
            try {
                val order = repository.fetchOrder(authToken, orderId)
                _detailState.value = OrderDetailUiState(isLoading = false, order = order)
            } catch (e: ApiException) {
                _detailState.value = OrderDetailUiState(isLoading = false, error = e.message)
            } catch (_: Exception) {
                _detailState.value = OrderDetailUiState(isLoading = false, error = "Could not load order details")
            }
        }
    }

    fun updateOrderStatus(orderId: String, status: OrderStatus, authToken: String? = adminToken.value) {
        if (authToken.isNullOrBlank()) return
        viewModelScope.launch {
            _detailState.value = _detailState.value.copy(isUpdating = true, error = null)
            try {
                val updated = repository.updateOrderStatus(authToken, orderId, status.apiValue)
                _detailState.value = OrderDetailUiState(isLoading = false, order = updated)
                _ordersState.value = _ordersState.value.copy(
                    orders = _ordersState.value.orders.map { if (it.id == orderId) updated else it }
                )
            } catch (e: ApiException) {
                _detailState.value = _detailState.value.copy(isUpdating = false, error = e.message)
            } catch (_: Exception) {
                _detailState.value = _detailState.value.copy(isUpdating = false, error = "Could not update status")
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
                val hampers = repository.fetchHampers()
                _catalogState.value = _catalogState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    products = products,
                    hampers = hampers,
                    collections = collections
                )
            } catch (e: ApiException) {
                _catalogState.value = _catalogState.value.copy(isLoading = false, isRefreshing = false, error = e.message)
            } catch (_: Exception) {
                _catalogState.value = _catalogState.value.copy(isLoading = false, isRefreshing = false, error = "Could not load catalog")
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
        state.selectedCollection?.let { slug -> list = list.filter { it.collection == slug } }
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

    fun filteredHampers(): List<Hamper> {
        val state = _catalogState.value
        val query = state.searchQuery.trim()
        var list = state.hampers
        if (query.isNotBlank()) {
            list = list.filter {
                it.title.contains(query, ignoreCase = true) ||
                    it.subtitle.orEmpty().contains(query, ignoreCase = true)
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
            val hamper = _catalogState.value.hampers.find { it.id == productId }
            if (hamper != null) {
                _productDetailState.value = ProductDetailUiState(product = hamper.toProduct())
                return@launch
            }
            _productDetailState.value = ProductDetailUiState(isLoading = true)
            try {
                if (_catalogState.value.products.isEmpty() || _catalogState.value.hampers.isEmpty()) {
                    loadCatalog()
                }
                val product = _catalogState.value.products.find { it.id == productId }
                val resolvedHamper = _catalogState.value.hampers.find { it.id == productId }
                _productDetailState.value = when {
                    product != null -> ProductDetailUiState(product = product)
                    resolvedHamper != null -> ProductDetailUiState(product = resolvedHamper.toProduct())
                    else -> ProductDetailUiState(error = "Item not found")
                }
            } catch (e: ApiException) {
                _productDetailState.value = ProductDetailUiState(error = e.message)
            } catch (_: Exception) {
                _productDetailState.value = ProductDetailUiState(error = "Could not load item")
            }
        }
    }

    fun collectionName(slug: String): String =
        if (slug == "hampers") "Gift hamper"
        else _catalogState.value.collections.find { it.slug == slug }?.name ?: slug.replaceFirstChar {
            if (it.isLowerCase()) it.titlecase(Locale.ENGLISH) else it.toString()
        }

    fun dashboardStats() = DashboardStats(
        totalOrders = _ordersState.value.orders.size,
        paidOrders = _ordersState.value.orders.count { it.isPaid() },
        pendingOrders = _ordersState.value.orders.count { !it.isPaid() },
        totalProducts = _catalogState.value.products.size,
        totalCollections = _catalogState.value.collections.size,
        recentOrders = _ordersState.value.orders.take(5)
    )

    fun productForCartItem(productId: String): Product? {
        _catalogState.value.products.find { it.id == productId }?.let { return it }
        return _catalogState.value.hampers.find { it.id == productId }?.toProduct()
    }

    fun updateShippingRate(rate: Double, onDone: () -> Unit = {}, onError: (String) -> Unit = {}) {
        val token = adminToken.value ?: return
        viewModelScope.launch {
            try {
                _storeSettings.value = repository.updateShippingRate(token, rate)
                onDone()
            } catch (e: ApiException) {
                onError(e.message ?: "Could not save")
            } catch (_: Exception) {
                onError("Could not save shipping rate")
            }
        }
    }

    fun registerPushToken(fcmToken: String) {
        viewModelScope.launch {
            try {
                TokenStore(getApplication()).saveFcmToken(fcmToken)
                when {
                    !adminToken.value.isNullOrBlank() -> repository.registerFcmToken(
                        adminToken.value,
                        "admin",
                        adminEmail.value,
                        fcmToken
                    )
                    !customerToken.value.isNullOrBlank() -> repository.registerFcmToken(
                        customerToken.value,
                        "customer",
                        customerEmail.value,
                        fcmToken
                    )
                    else -> return@launch
                }
            } catch (_: Exception) { }
        }
    }

    fun registerPushTokenIfAvailable() {
        viewModelScope.launch {
            val token = pendingFcmToken ?: TokenStore(getApplication()).getFcmToken()
            if (!token.isNullOrBlank()) registerPushToken(token)
        }
    }

    fun setPendingFcmToken(token: String) {
        pendingFcmToken = token
        registerPushTokenIfAvailable()
    }

    fun sendCustomerFcmBroadcast(
        title: String,
        body: String,
        imageUrl: String?,
        onDone: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val token = adminToken.value
        if (token.isNullOrBlank()) {
            onError("Admin sign-in required")
            return
        }
        viewModelScope.launch {
            try {
                val result = repository.sendCustomerFcmBroadcast(token, title.trim(), body.trim(), imageUrl)
                val sent = (result["sent"] as? Number)?.toInt() ?: 0
                val skipped = result["skipped"] == true
                val reason = result["reason"]?.toString()
                val message = when {
                    skipped -> reason ?: "No customer devices registered"
                    sent > 0 -> "Push sent to $sent device(s)"
                    else -> "No devices received the push"
                }
                onDone(message)
            } catch (e: ApiException) {
                onError(e.message ?: "Could not send push")
            } catch (_: Exception) {
                onError("Could not send push")
            }
        }
    }

    fun startAuraVoiceSession() {
        if (_aiState.value.isSessionActive) return
        liveMicSending = true
        configureVoiceAudioRouting(active = true)
        _aiState.value = AuraVoiceUiState(
            phase = AuraVoicePhase.Connecting,
            statusText = "Connecting to Aura AI…",
            isSessionActive = true
        )
        var wsUrl = BuildConfig.API_BASE_URL.trimEnd('/')
            .replace("https://", "wss://")
            .replace("http://", "ws://") + "?platform=android"

        val name = customerName.value
        val email = customerEmail.value
        if (!name.isNullOrBlank()) {
            try {
                wsUrl += "&name=" + java.net.URLEncoder.encode(name, "UTF-8")
            } catch (_: Exception) {}
        }
        if (!email.isNullOrBlank()) {
            try {
                wsUrl += "&email=" + java.net.URLEncoder.encode(email, "UTF-8")
            } catch (_: Exception) {}
        }

        liveAudioPlayer = AuraLiveAudioPlayer().also { it.startPlayback() }
        liveVoiceClient = AuraLiveVoiceClient(wsUrl, voiceListener()).also { it.connect() }
    }

    fun stopAuraVoiceSession() {
        liveAudioRecorder?.stop()
        liveAudioRecorder = null
        liveAudioPlayer?.release()
        liveAudioPlayer = null
        liveVoiceClient?.disconnect()
        liveVoiceClient = null
        liveMicSending = true
        configureVoiceAudioRouting(active = false)
        _aiState.value = AuraVoiceUiState()
    }

    @Suppress("DEPRECATION")
    private fun configureVoiceAudioRouting(active: Boolean) {
        val am = getApplication<Application>().getSystemService(Context.AUDIO_SERVICE) as AudioManager
        if (active) {
            previousAudioMode = am.mode
            wasSpeakerphoneOn = am.isSpeakerphoneOn
            am.mode = AudioManager.MODE_IN_COMMUNICATION
            am.isSpeakerphoneOn = true
        } else {
            am.isSpeakerphoneOn = wasSpeakerphoneOn
            am.mode = previousAudioMode
        }
    }

    fun toggleAuraVoiceMute() {
        liveMicSending = !liveMicSending
        _aiState.value = _aiState.value.copy(
            isMicMuted = !liveMicSending,
            statusText = if (liveMicSending) {
                if (_aiState.value.phase == AuraVoicePhase.Speaking) "Speaking…" else "Listening…"
            } else {
                "Mic muted"
            }
        )
    }

    fun toggleAuraVoiceSpeaker() {
        val am = getApplication<Application>().getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val newSpeakerState = !_aiState.value.isSpeakerphoneOn
        am.isSpeakerphoneOn = newSpeakerState
        _aiState.value = _aiState.value.copy(isSpeakerphoneOn = newSpeakerState)
    }

    private fun voiceListener() = object : AuraLiveVoiceClient.Listener {
        override fun onStatus(status: String, connected: Boolean) {
            val phase = when {
                connected -> AuraVoicePhase.Ready
                status.contains("disconnect", ignoreCase = true) -> AuraVoicePhase.Idle
                status.contains("connect", ignoreCase = true) -> AuraVoicePhase.Connecting
                else -> AuraVoicePhase.Connecting
            }
            val statusText = when {
                connected -> "Aura is ready — start talking"
                phase == AuraVoicePhase.Connecting -> "Connecting to Aura AI…"
                else -> status
            }
            _aiState.value = _aiState.value.copy(
                statusText = statusText,
                phase = phase,
                error = null,
                isSessionActive = connected || _aiState.value.isSessionActive
            )
            if (connected) beginAuraListening()
        }

        override fun onError(message: String) {
            _aiState.value = _aiState.value.copy(
                phase = AuraVoicePhase.Error,
                error = message,
                statusText = "Error"
            )
        }

        override fun onAudioChunk(base64Pcm: String) {
            liveAudioPlayer?.enqueueBase64Pcm(base64Pcm)
            _aiState.value = _aiState.value.copy(
                phase = AuraVoicePhase.Speaking,
                statusText = "Speaking…"
            )
        }

        override fun onInterrupted() {
            liveAudioPlayer?.stopAll()
            beginAuraListening()
        }

        override fun onTurnComplete() {
            _aiState.value = _aiState.value.copy(
                phase = AuraVoicePhase.Listening,
                statusText = if (liveMicSending) "Listening…" else "Mic muted"
            )
        }

        override fun onMobileAction(action: JsonObject) {
            viewModelScope.launch { dispatchMobileAction(action) }
        }

        override fun onCalculateCartTotal(requestId: String) {
            sendCartTotalsToVoice(requestId)
        }
    }

    private fun beginAuraListening() {
        if (liveAudioRecorder?.isRunning() == true) {
            _aiState.value = _aiState.value.copy(
                phase = AuraVoicePhase.Listening,
                statusText = if (liveMicSending) "Listening…" else "Mic muted"
            )
            return
        }
        liveAudioRecorder?.stop()
        var recorderRef: AuraLiveAudioRecorder? = null
        recorderRef = AuraLiveAudioRecorder(
            onPcmChunk = { pcm ->
                if (!liveMicSending) return@AuraLiveAudioRecorder
                val encoded = recorderRef?.encodeBase64(pcm) ?: return@AuraLiveAudioRecorder
                liveVoiceClient?.sendAudio(encoded)
            },
            onLevel = { level ->
                if (_aiState.value.phase == AuraVoicePhase.Listening) {
                    _aiState.value = _aiState.value.copy(audioLevel = level)
                }
            }
        )
        liveAudioRecorder = recorderRef
        if (recorderRef.start()) {
            liveAudioPlayer?.setPlaybackSessionId(recorderRef.audioSessionId)
            _aiState.value = _aiState.value.copy(
                phase = AuraVoicePhase.Listening,
                statusText = if (liveMicSending) "Listening…" else "Mic muted"
            )
        } else {
            _aiState.value = _aiState.value.copy(
                phase = AuraVoicePhase.Error,
                error = "Microphone unavailable",
                statusText = "Mic error"
            )
        }
    }

    private fun sendCartTotalsToVoice(requestId: String) {
        viewModelScope.launch {
            try {
                val items = _cartState.value.items
                val cart = if (items.isNotEmpty()) repository.calculateCart(items) else Cart()
                val itemsPayload = items.map { mapOf("productId" to it.productId, "qty" to it.qty) }
                liveVoiceClient?.sendCartTotalsResponse(
                    requestId,
                    gson.toJson(itemsPayload),
                    gson.toJson(cart)
                )
            } catch (_: Exception) {
                liveVoiceClient?.sendCartTotalsResponse(requestId, "[]", gson.toJson(Cart()))
            }
        }
    }

    private suspend fun dispatchMobileAction(action: JsonObject) {
        when (action.get("type")?.asString) {
            "showcase" -> {
                val showcase = parseShowcaseAction(action)
                applyShowcase(
                    title = showcase.title,
                    items = showcase.items,
                    append = showcase.append,
                    subtotal = showcase.subtotal,
                    shipping = showcase.shipping,
                    grandTotal = showcase.grandTotal
                )
            }
            "navigate_shop" -> _aiNavigation.emit(AiNavigationEvent.Shop)
            "navigate_cart" -> _aiNavigation.emit(AiNavigationEvent.Cart)
            "navigate_account" -> _aiNavigation.emit(AiNavigationEvent.Account)
            "navigate_auth" -> {
                val mode = when (action.get("mode")?.asString?.lowercase()) {
                    "signup" -> AuthMode.SIGN_UP
                    "forgot_password", "forgot" -> AuthMode.FORGOT_PASSWORD
                    else -> AuthMode.SIGN_IN
                }
                openCustomerAuthFromAi(mode, action.get("email")?.asString)
            }
            "verify_otp" -> {
                val email = action.get("email")?.asString.orEmpty()
                val otp = action.get("otp")?.asString.orEmpty()
                if (email.isNotBlank() && otp.isNotBlank()) {
                    verifyOtpFromAi(email, otp)
                }
            }
            "navigate_checkout" -> {
                prepareCheckout()
                _aiNavigation.emit(AiNavigationEvent.Checkout)
            }
            "add_to_cart" -> action.get("productId")?.asString?.takeIf { it.isNotBlank() }?.let { id ->
                addToCart(id, action.get("qty")?.asInt ?: 1)
            }
            "decrease_cart_qty" -> action.get("productId")?.asString?.takeIf { it.isNotBlank() }?.let { id ->
                val qtyToDecrease = action.get("qty")?.asInt ?: 1
                val current = cartStore.getCart().toMutableList()
                val idx = current.indexOfFirst { it.productId == id }
                if (idx >= 0) {
                    val newQty = current[idx].qty - qtyToDecrease
                    if (newQty <= 0) {
                        current.removeAt(idx)
                    } else {
                        current[idx] = current[idx].copy(qty = newQty)
                    }
                    cartStore.saveCart(current)
                    scheduleCartReminderIfNeeded(current)
                    val name = sellableName(id)
                    _snackbarMessage.value = "Decreased $name quantity in cart"
                }
            }
        }
    }

    fun clearAuraShowcase() {
        _aiState.value = _aiState.value.copy(
            showcaseTitle = null,
            showcaseItems = emptyList(),
            showcaseSections = emptyList(),
            cartSubtotal = null,
            cartShipping = null,
            cartGrandTotal = null
        )
    }

    private fun applyShowcase(
        title: String?,
        items: List<AuraShowcaseItem>,
        append: Boolean,
        subtotal: Double?,
        shipping: Double?,
        grandTotal: Double?
    ) {
        val sectionTitle = title?.takeIf { it.isNotBlank() } ?: "Picked for you"
        val newSection = AuraShowcaseSection(sectionTitle, items)
        val currentSections = _aiState.value.showcaseSections
        val updatedSections = if (append && currentSections.isNotEmpty()) {
            listOf(newSection) + currentSections.filterNot { it.title.equals(sectionTitle, ignoreCase = true) }
        } else {
            listOf(newSection)
        }
        val flattened = updatedSections.flatMap { it.items }
        _aiState.value = _aiState.value.copy(
            showcaseTitle = title,
            showcaseItems = flattened,
            showcaseSections = updatedSections,
            cartSubtotal = subtotal ?: _aiState.value.cartSubtotal,
            cartShipping = shipping ?: _aiState.value.cartShipping,
            cartGrandTotal = grandTotal ?: _aiState.value.cartGrandTotal
        )
    }

    private data class ParsedShowcaseAction(
        val title: String?,
        val items: List<AuraShowcaseItem>,
        val append: Boolean,
        val subtotal: Double?,
        val shipping: Double?,
        val grandTotal: Double?
    )

    private fun parseShowcaseAction(action: JsonObject): ParsedShowcaseAction {
        val title = action.get("title")?.asString
        val items = action.getAsJsonArray("items")?.mapNotNull { element ->
            if (!element.isJsonObject) return@mapNotNull null
            val obj = element.asJsonObject
            val id = obj.get("id")?.asString?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
            AuraShowcaseItem(
                id = id,
                title = obj.get("title")?.asString.orEmpty(),
                subtitle = obj.get("subtitle")?.asString.orEmpty(),
                price = obj.get("price")?.asDouble ?: 0.0,
                image = obj.get("image")?.asString.orEmpty(),
                isHamper = obj.get("isHamper")?.asBoolean ?: false
            )
        }.orEmpty()
        val append = action.get("append")?.asBoolean ?: false
        val subtotal = action.get("subtotal")?.asDouble
        val shipping = action.get("shipping")?.asDouble
        val grandTotal = action.get("grandTotal")?.asDouble
        return ParsedShowcaseAction(title, items, append, subtotal, shipping, grandTotal)
    }

    override fun onCleared() {
        stopAuraVoiceSession()
        super.onCleared()
    }

    fun sendAiMessage(message: String, screen: String = "shop") {
        // Text fallback — voice session is primary; kept for compatibility.
        if (message.isNotBlank()) {
            _snackbarMessage.value = "Use voice mode — tap the orb to talk to Aura"
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

fun orderItemCount(order: Order): Int = order.cart?.lines?.sumOf { it.qty } ?: 0
