package com.auraboxedgifts.orders

import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.auraboxedgifts.orders.notifications.OrderNotificationManager
import com.auraboxedgifts.orders.ui.screens.AdminProductFormScreen
import com.auraboxedgifts.orders.ui.screens.CheckoutScreen
import com.auraboxedgifts.orders.ui.screens.CustomerAuthScreen
import com.auraboxedgifts.orders.ui.screens.CustomerShell
import com.auraboxedgifts.orders.ui.screens.LoginScreen
import com.auraboxedgifts.orders.ui.screens.MainShell
import com.auraboxedgifts.orders.ui.screens.OrderDetailScreen
import com.auraboxedgifts.orders.ui.screens.ProductDetailScreen
import com.auraboxedgifts.orders.ui.theme.AuraOrdersTheme
import com.razorpay.Checkout
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
import org.json.JSONObject

class MainActivity : ComponentActivity(), PaymentResultWithDataListener {

    private lateinit var viewModel: AppViewModel
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Checkout.preload(applicationContext)
        OrderNotificationManager.ensureChannel(this)
        requestNotificationPermissionIfNeeded()

        val deepLinkOrderId = intent?.getStringExtra("order_id")

        setContent {
            AuraOrdersTheme {
                val navController = rememberNavController()
                val vm: AppViewModel = viewModel()
                viewModel = vm
                val appMode by vm.appMode.collectAsState()
                val adminToken by vm.adminToken.collectAsState()
                val adminEmail by vm.adminEmail.collectAsState()
                val customerToken by vm.customerToken.collectAsState()
                val customerEmail by vm.customerEmail.collectAsState()
                val customerName by vm.customerName.collectAsState()
                val loginState by vm.loginState.collectAsState()
                val customerAuthState by vm.customerAuthState.collectAsState()
                val ordersState by vm.ordersState.collectAsState()
                val customerOrdersState by vm.customerOrdersState.collectAsState()
                val detailState by vm.detailState.collectAsState()
                val catalogState by vm.catalogState.collectAsState()
                val productDetailState by vm.productDetailState.collectAsState()
                val productFormState by vm.productFormState.collectAsState()
                val cartState by vm.cartState.collectAsState()
                val checkoutState by vm.checkoutState.collectAsState()
                val selectedTab by vm.selectedTab.collectAsState()
                val customerTab by vm.customerTab.collectAsState()

                LaunchedEffect(appMode) {
                    if (appMode == AppMode.ADMIN) {
                        navController.navigate("admin") {
                            popUpTo("shop") { inclusive = true }
                            launchSingleTop = true
                        }
                    }
                }

                LaunchedEffect(vm) {
                    vm.paymentEvent.collect { data ->
                        launchRazorpay(data)
                    }
                }

                val imagePicker = rememberLauncherForActivityResult(
                    ActivityResultContracts.GetContent()
                ) { uri: Uri? ->
                    if (uri != null) vm.uploadProductImage(uri)
                }

                LaunchedEffect(deepLinkOrderId, adminToken) {
                    val orderId = deepLinkOrderId
                    if (!orderId.isNullOrBlank() && !adminToken.isNullOrBlank()) {
                        viewModel.loadOrderDetail(orderId, adminToken)
                        viewModel.selectTab(MainTab.ORDERS)
                        navController.navigate("admin/order/$orderId")
                    }
                }

                LaunchedEffect(customerToken) {
                    if (!customerToken.isNullOrBlank()) {
                        viewModel.loadCustomerOrders()
                    }
                }

                NavHost(
                    navController = navController,
                    startDestination = if (appMode == AppMode.ADMIN) "admin" else "shop"
                ) {
                    composable("shop") {
                        CustomerShell(
                            selectedTab = customerTab,
                            onTabSelected = viewModel::selectCustomerTab,
                            catalogState = catalogState,
                            cartState = cartState,
                            cartItemCount = viewModel.cartItemCount(),
                            filteredProducts = viewModel.filteredProducts(),
                            collectionName = viewModel::collectionName,
                            isCustomerLoggedIn = !customerToken.isNullOrBlank(),
                            customerEmail = customerEmail,
                            customerName = customerName,
                            customerOrdersState = customerOrdersState,
                            onRefreshCatalog = { viewModel.loadCatalog(refreshing = true) },
                            onCollectionChange = viewModel::setCatalogCollection,
                            onSearchChange = viewModel::setCatalogSearch,
                            onProductClick = { productId ->
                                viewModel.loadProductDetail(productId)
                                navController.navigate("product/$productId")
                            },
                            onAddToCart = viewModel::addToCart,
                            onUpdateCartQty = viewModel::updateCartQty,
                            onCheckout = {
                                if (customerToken.isNullOrBlank()) {
                                    navController.navigate("customer_auth?redirect=checkout")
                                } else {
                                    viewModel.prepareCheckout()
                                    navController.navigate("checkout")
                                }
                            },
                            onSignIn = { navController.navigate("customer_auth?redirect=") },
                            onAdminSignIn = { navController.navigate("admin_login") },
                            onCustomerLogout = viewModel::logoutCustomer,
                            productForCartItem = viewModel::productForCartItem
                        )
                    }

                    composable("admin") {
                        if (adminToken.isNullOrBlank()) {
                            LaunchedEffect(Unit) {
                                navController.navigate("shop") {
                                    popUpTo("admin") { inclusive = true }
                                }
                            }
                            return@composable
                        }

                        LaunchedEffect(adminToken) {
                            viewModel.loadOrders(adminToken)
                            viewModel.loadCatalog()
                        }

                        DisposableEffect(Unit) {
                            viewModel.startForegroundOrderPolling()
                            onDispose { viewModel.stopForegroundOrderPolling() }
                        }

                        MainShell(
                            selectedTab = selectedTab,
                            onTabSelected = viewModel::selectTab,
                            ordersState = ordersState,
                            catalogState = catalogState,
                            adminEmail = adminEmail,
                            dashboardStats = viewModel.dashboardStats(),
                            filteredOrders = viewModel.filteredOrders(),
                            filteredProducts = viewModel.filteredProducts(),
                            collectionName = viewModel::collectionName,
                            onRefreshOrders = { viewModel.loadOrders(refreshing = true) },
                            onRefreshCatalog = { viewModel.loadCatalog(refreshing = true) },
                            onOrderFilterChange = viewModel::setOrderFilter,
                            onOrderClick = { orderId ->
                                viewModel.loadOrderDetail(orderId)
                                navController.navigate("admin/order/$orderId")
                            },
                            onProductClick = { productId ->
                                viewModel.loadProductDetail(productId)
                                navController.navigate("admin/product/$productId")
                            },
                            onCollectionChange = viewModel::setCatalogCollection,
                            onSearchChange = viewModel::setCatalogSearch,
                            onNavigateToOrders = { viewModel.selectTab(MainTab.ORDERS) },
                            onNavigateToCatalog = { viewModel.selectTab(MainTab.CATALOG) },
                            onAddProduct = {
                                viewModel.loadProductForm(null)
                                navController.navigate("admin_product/new")
                            },
                            onLogout = {
                                viewModel.logoutAdmin()
                                navController.navigate("shop") {
                                    popUpTo("admin") { inclusive = true }
                                }
                            }
                        )
                    }

                    composable("admin_login") {
                        LoginScreen(
                            state = loginState,
                            onEmailChange = viewModel::updateLoginEmail,
                            onPasswordChange = viewModel::updateLoginPassword,
                            onLogin = {
                                requestNotificationPermissionIfNeeded()
                                viewModel.adminLogin {
                                    navController.navigate("admin") {
                                        popUpTo("shop")
                                    }
                                }
                            }
                        )
                    }

                    composable(
                        route = "customer_auth?redirect={redirect}",
                        arguments = listOf(
                            navArgument("redirect") {
                                type = NavType.StringType
                                defaultValue = ""
                            }
                        )
                    ) { entry ->
                        val redirect = entry.arguments?.getString("redirect").orEmpty()
                        CustomerAuthScreen(
                            state = customerAuthState,
                            onBack = { navController.popBackStack() },
                            onModeChange = viewModel::setCustomerAuthMode,
                            onEmailChange = viewModel::updateCustomerAuthEmail,
                            onPasswordChange = viewModel::updateCustomerAuthPassword,
                            onOtpChange = viewModel::updateCustomerAuthOtp,
                            onSendOtp = viewModel::sendCustomerOtp,
                            onSignIn = {
                                viewModel.customerSignIn {
                                    if (!adminToken.isNullOrBlank()) {
                                        navController.navigate("admin") { popUpTo("shop") }
                                    } else if (redirect == "checkout") {
                                        viewModel.prepareCheckout()
                                        navController.navigate("checkout") {
                                            popUpTo("shop")
                                        }
                                    } else {
                                        navController.popBackStack()
                                    }
                                }
                            },
                            onSignUp = {
                                viewModel.customerSignUp {
                                    if (redirect == "checkout") {
                                        viewModel.prepareCheckout()
                                        navController.navigate("checkout") {
                                            popUpTo("shop")
                                        }
                                    } else {
                                        navController.popBackStack()
                                    }
                                }
                            }
                        )
                    }

                    composable("checkout") {
                        CheckoutScreen(
                            state = checkoutState,
                            cartTotal = cartState.calculated?.grandTotal ?: 0.0,
                            onBack = { navController.popBackStack() },
                            onNameChange = { v -> viewModel.updateCheckoutInfo { it.copy(name = v) } },
                            onPhoneChange = { v -> viewModel.updateCheckoutInfo { it.copy(phone = v) } },
                            onAddressChange = { v -> viewModel.updateCheckoutInfo { it.copy(address = v) } },
                            onCityChange = { v -> viewModel.updateCheckoutInfo { it.copy(city = v) } },
                            onStateChange = { v -> viewModel.updateCheckoutInfo { it.copy(state = v) } },
                            onPincodeChange = { v -> viewModel.updateCheckoutInfo { it.copy(pincode = v) } },
                            onPay = {
                                viewModel.startCheckout {
                                    navController.navigate("customer_auth?redirect=checkout")
                                }
                            },
                            onDone = {
                                viewModel.resetCheckout()
                                viewModel.selectCustomerTab(CustomerTab.SHOP)
                                navController.navigate("shop") {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                        )
                    }

                    composable(
                        route = "product/{productId}",
                        arguments = listOf(navArgument("productId") { type = NavType.StringType })
                    ) { entry ->
                        val productId = entry.arguments?.getString("productId").orEmpty()
                        LaunchedEffect(productId) {
                            if (productId.isNotBlank()) viewModel.loadProductDetail(productId)
                        }
                        ProductDetailScreen(
                            state = productDetailState,
                            collectionName = viewModel::collectionName,
                            onBack = { navController.popBackStack() },
                            onAddToCart = {
                                viewModel.addToCart(productId)
                                navController.popBackStack()
                            }
                        )
                    }

                    composable(
                        route = "admin/product/{productId}",
                        arguments = listOf(navArgument("productId") { type = NavType.StringType })
                    ) { entry ->
                        val productId = entry.arguments?.getString("productId").orEmpty()
                        LaunchedEffect(productId) {
                            if (productId.isNotBlank()) viewModel.loadProductDetail(productId)
                        }
                        ProductDetailScreen(
                            state = productDetailState,
                            collectionName = viewModel::collectionName,
                            isAdminMode = true,
                            onBack = { navController.popBackStack() },
                            onEdit = {
                                viewModel.loadProductForm(productId)
                                navController.navigate("admin_product/edit/$productId")
                            },
                            onDelete = {
                                viewModel.deleteProduct(productId) {
                                    navController.popBackStack()
                                }
                            }
                        )
                    }

                    composable("admin_product/new") {
                        LaunchedEffect(Unit) { viewModel.loadProductForm(null) }
                        AdminProductFormScreen(
                            state = productFormState,
                            collections = catalogState.collections,
                            onBack = { navController.popBackStack() },
                            onNameChange = { v -> viewModel.updateProductForm { copy(name = v) } },
                            onCollectionChange = { v -> viewModel.updateProductForm { copy(collection = v) } },
                            onPriceChange = { v -> viewModel.updateProductForm { copy(price = v) } },
                            onImageChange = { v -> viewModel.updateProductForm { copy(image = v) } },
                            onDescriptionChange = { v -> viewModel.updateProductForm { copy(description = v) } },
                            onTagsChange = { v -> viewModel.updateProductForm { copy(tags = v) } },
                            onPickImage = { imagePicker.launch("image/*") },
                            onSave = { viewModel.saveProduct { navController.popBackStack() } }
                        )
                    }

                    composable(
                        route = "admin_product/edit/{productId}",
                        arguments = listOf(navArgument("productId") { type = NavType.StringType })
                    ) { entry ->
                        val productId = entry.arguments?.getString("productId").orEmpty()
                        LaunchedEffect(productId) {
                            if (productId.isNotBlank()) viewModel.loadProductForm(productId)
                        }
                        AdminProductFormScreen(
                            state = productFormState,
                            collections = catalogState.collections,
                            onBack = { navController.popBackStack() },
                            onNameChange = { v -> viewModel.updateProductForm { copy(name = v) } },
                            onCollectionChange = { v -> viewModel.updateProductForm { copy(collection = v) } },
                            onPriceChange = { v -> viewModel.updateProductForm { copy(price = v) } },
                            onImageChange = { v -> viewModel.updateProductForm { copy(image = v) } },
                            onDescriptionChange = { v -> viewModel.updateProductForm { copy(description = v) } },
                            onTagsChange = { v -> viewModel.updateProductForm { copy(tags = v) } },
                            onPickImage = { imagePicker.launch("image/*") },
                            onSave = { viewModel.saveProduct { navController.popBackStack() } }
                        )
                    }

                    composable(
                        route = "admin/order/{orderId}",
                        arguments = listOf(navArgument("orderId") { type = NavType.StringType })
                    ) { entry ->
                        val orderId = entry.arguments?.getString("orderId").orEmpty()
                        OrderDetailScreen(
                            state = detailState,
                            onBack = { navController.popBackStack() },
                            onStatusChange = { status ->
                                viewModel.updateOrderStatus(orderId, status)
                            }
                        )
                    }
                }
            }
        }
    }

    private fun launchRazorpay(data: PaymentLaunchData) {
        val checkout = Checkout()
        checkout.setKeyID(data.keyId)
        try {
            val options = JSONObject().apply {
                put("name", "Aura Boxed Gift")
                put("description", "Order payment")
                put("currency", "INR")
                put("order_id", data.orderId)
                put("amount", data.amountPaise)
                put("prefill", JSONObject().apply {
                    put("name", data.customerName)
                    put("email", data.customerEmail)
                    put("contact", data.customerPhone)
                })
                put("theme", JSONObject().apply { put("color", "#B76E79") })
            }
            checkout.open(this, options)
        } catch (e: Exception) {
            viewModel.onPaymentError(e.message ?: "Could not open payment")
        }
    }

    override fun onPaymentSuccess(razorpayPaymentId: String, paymentData: PaymentData) {
        viewModel.onPaymentSuccess(
            paymentId = razorpayPaymentId,
            orderId = paymentData.orderId,
            signature = paymentData.signature
        )
    }

    override fun onPaymentError(code: Int, response: String, paymentData: PaymentData?) {
        viewModel.onPaymentError(response.ifBlank { "Payment cancelled" })
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
            == PackageManager.PERMISSION_GRANTED
        ) {
            return
        }
        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
}
