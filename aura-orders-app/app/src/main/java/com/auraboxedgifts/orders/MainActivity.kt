package com.auraboxedgifts.orders

import android.app.Activity
import android.content.Intent
import android.Manifest
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.auraboxedgifts.orders.ui.components.auraComposable
import com.auraboxedgifts.orders.ui.components.fadeEnter
import com.auraboxedgifts.orders.ui.components.fadeExit
import com.auraboxedgifts.orders.ui.components.popEnter
import com.auraboxedgifts.orders.ui.components.popExit
import com.auraboxedgifts.orders.ui.components.slideInFromBottom
import com.auraboxedgifts.orders.ui.components.slideOutToBottom
import com.auraboxedgifts.orders.notifications.OrderNotificationManager
import com.auraboxedgifts.orders.ui.screens.AdminProductFormScreen
import com.auraboxedgifts.orders.ui.screens.AuraAiScreen
import com.auraboxedgifts.orders.ui.screens.CartScreen
import com.auraboxedgifts.orders.ui.screens.CheckoutScreen
import com.auraboxedgifts.orders.ui.screens.CustomerAuthScreen
import com.auraboxedgifts.orders.ui.screens.CustomerOnboardingScreen
import com.auraboxedgifts.orders.ui.screens.CustomerShell
import com.auraboxedgifts.orders.ui.screens.LoginScreen
import com.auraboxedgifts.orders.ui.screens.MainShell
import com.auraboxedgifts.orders.ui.screens.OrderDetailScreen
import com.auraboxedgifts.orders.ui.screens.ProductDetailScreen
import com.auraboxedgifts.orders.ui.theme.AuraOrdersTheme
import com.razorpay.Checkout
import com.razorpay.PaymentData
import com.razorpay.PaymentResultWithDataListener
import android.speech.tts.TextToSpeech
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.Place
import com.google.android.libraries.places.widget.Autocomplete
import com.google.android.libraries.places.widget.model.AutocompleteActivityMode
import com.google.firebase.messaging.FirebaseMessaging
import org.json.JSONObject
import java.util.Locale

class MainActivity : ComponentActivity(), PaymentResultWithDataListener {

    private lateinit var viewModel: AppViewModel
    private var textToSpeech: TextToSpeech? = null
    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    private val placesLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode != Activity.RESULT_OK || result.data == null) return@registerForActivityResult
        if (!::viewModel.isInitialized) return@registerForActivityResult
        try {
            val place = Autocomplete.getPlaceFromIntent(result.data!!)
            var city = ""
            var state = ""
            var pincode = ""
            place.addressComponents?.asList()?.forEach { component ->
                component.types.forEach { type ->
                    when (type) {
                        "locality" -> if (city.isBlank()) city = component.name
                        "postal_town" -> if (city.isBlank()) city = component.name
                        "administrative_area_level_1" -> state = component.name
                        "postal_code" -> pincode = component.name
                    }
                }
            }
            viewModel.applyCheckoutAddress(
                address = place.address.orEmpty(),
                city = city,
                state = state,
                pincode = pincode
            )
        } catch (_: Exception) { }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        Checkout.preload(applicationContext)
        OrderNotificationManager.ensureChannel(this)
        requestNotificationPermissionIfNeeded()
        initTextToSpeech()

        val deepLinkOrderId = intent?.getStringExtra("order_id")
        val openCustomerOrders = intent?.getBooleanExtra("open_customer_orders", false) == true
        val appPrefs = getSharedPreferences("aura_orders_prefs", MODE_PRIVATE)

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
                val aiState by vm.aiState.collectAsState()
                val storeSettings by vm.storeSettings.collectAsState()
                val mapsConfig by vm.mapsConfig.collectAsState()
                val selectedTab by vm.selectedTab.collectAsState()
                val customerTab by vm.customerTab.collectAsState()
                val snackbarMessage by vm.snackbarMessage.collectAsState()
                var showOnboarding by remember {
                    mutableStateOf(!appPrefs.getBoolean("customer_onboarding_done", false))
                }

                LaunchedEffect(vm) {
                    FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                        if (task.isSuccessful) {
                            task.result?.let { viewModel.setPendingFcmToken(it) }
                        }
                    }
                }

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

                LaunchedEffect(openCustomerOrders, customerToken) {
                    if (openCustomerOrders) {
                        viewModel.selectCustomerTab(CustomerTab.ACCOUNT)
                        if (navController.currentDestination?.route != "shop") {
                            navController.navigate("shop") {
                                popUpTo("shop") { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    }
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

                LaunchedEffect(Unit) {
                    viewModel.aiNavigation.collect { event ->
                        when (event) {
                            AiNavigationEvent.Shop -> {
                                viewModel.selectCustomerTab(CustomerTab.SHOP)
                                if (navController.currentDestination?.route != "shop") {
                                    navController.navigate("shop") {
                                        popUpTo("shop") { inclusive = true }
                                        launchSingleTop = true
                                    }
                                }
                            }
                            AiNavigationEvent.Cart -> navController.navigate("cart")
                            AiNavigationEvent.Account -> {
                                viewModel.selectCustomerTab(CustomerTab.ACCOUNT)
                                navController.navigate("shop") {
                                    popUpTo("shop") { inclusive = true }
                                    launchSingleTop = true
                                }
                            }
                            AiNavigationEvent.Checkout -> {
                                if (customerToken.isNullOrBlank()) {
                                    navController.navigate("customer_auth?redirect=checkout&mode=signin")
                                } else {
                                    viewModel.prepareCheckout()
                                    navController.navigate("checkout")
                                }
                            }
                            is AiNavigationEvent.CustomerAuth -> {
                                val mode = when (event.mode) {
                                    AuthMode.SIGN_UP -> "signup"
                                    AuthMode.FORGOT_PASSWORD -> "forgot"
                                    else -> "signin"
                                }
                                navController.navigate("customer_auth?redirect=&mode=$mode")
                            }
                            is AiNavigationEvent.Product -> {
                                viewModel.loadProductDetail(event.productId)
                                navController.navigate("product/${event.productId}")
                            }
                            is AiNavigationEvent.AddToCart -> { /* snackbar from addToCart */ }
                            is AiNavigationEvent.Search -> {
                                viewModel.selectCustomerTab(CustomerTab.SHOP)
                                navController.navigate("shop") {
                                    popUpTo("shop") { inclusive = true }
                                    launchSingleTop = true
                                }
                            }
                        }
                    }
                }

                if (showOnboarding && appMode != AppMode.ADMIN) {
                    CustomerOnboardingScreen(
                        onFinish = {
                            appPrefs.edit().putBoolean("customer_onboarding_done", true).apply()
                            showOnboarding = false
                        }
                    )
                } else NavHost(
                    navController = navController,
                    startDestination = if (appMode == AppMode.ADMIN) "admin" else "shop"
                ) {
                    composable(
                        route = "shop",
                        enterTransition = { fadeEnter() },
                        exitTransition = { fadeExit() },
                        popEnterTransition = { fadeEnter() },
                        popExitTransition = { fadeExit() }
                    ) {
                        CustomerShell(
                            selectedTab = customerTab,
                            onTabSelected = viewModel::selectCustomerTab,
                            catalogState = catalogState,
                            cartItemCount = viewModel.cartItemCount(),
                            filteredProducts = viewModel.filteredProducts(),
                            hampers = viewModel.filteredHampers(),
                            collectionName = viewModel::collectionName,
                            isCustomerLoggedIn = !customerToken.isNullOrBlank(),
                            isAdminLoggedIn = !adminToken.isNullOrBlank(),
                            customerEmail = customerEmail ?: adminEmail,
                            customerName = customerName,
                            customerOrdersState = customerOrdersState,
                            snackbarMessage = snackbarMessage,
                            onSnackbarShown = viewModel::clearSnackbar,
                            onRefreshCatalog = { viewModel.loadCatalog(refreshing = true) },
                            onCollectionChange = viewModel::setCatalogCollection,
                            onSearchChange = viewModel::setCatalogSearch,
                            onProductClick = { productId ->
                                viewModel.loadProductDetail(productId)
                                navController.navigate("product/$productId")
                            },
                            onAddToCart = viewModel::addToCart,
                            onOpenCart = { navController.navigate("cart") },
                            onSignIn = { navController.navigate("customer_auth?redirect=") },
                            onAdminPanel = {
                                if (!adminToken.isNullOrBlank()) {
                                    navController.navigate("admin") { popUpTo("shop") }
                                } else {
                                    navController.navigate("admin_login")
                                }
                            },
                            onCustomerLogout = viewModel::logoutCustomer,
                            onDeleteAccount = {
                                viewModel.deleteCustomerAccount {
                                    navController.navigate("shop") {
                                        popUpTo("shop") { inclusive = true }
                                        launchSingleTop = true
                                    }
                                }
                            },
                            onOpenAuraAi = { navController.navigate("aura_ai") },
                        )
                    }

                    auraComposable("aura_ai") {
                        val micPermissionLauncher = rememberLauncherForActivityResult(
                            ActivityResultContracts.RequestPermission()
                        ) { granted ->
                            if (granted) {
                                viewModel.startAuraVoiceSession()
                            } else {
                                viewModel.stopAuraVoiceSession()
                            }
                        }

                        LaunchedEffect(Unit) {
                            if (ContextCompat.checkSelfPermission(
                                    this@MainActivity,
                                    Manifest.permission.RECORD_AUDIO
                                ) == PackageManager.PERMISSION_GRANTED
                            ) {
                                viewModel.startAuraVoiceSession()
                            } else {
                                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            }
                        }

                        BackHandler {
                            viewModel.stopAuraVoiceSession()
                            navController.popBackStack()
                        }

                        AuraAiScreen(
                            state = aiState,
                            onBack = {
                                viewModel.stopAuraVoiceSession()
                                navController.popBackStack()
                            },
                            onStartSession = {
                                if (ContextCompat.checkSelfPermission(
                                        this@MainActivity,
                                        Manifest.permission.RECORD_AUDIO
                                    ) == PackageManager.PERMISSION_GRANTED
                                ) {
                                    viewModel.startAuraVoiceSession()
                                } else {
                                    micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                }
                            },
                            onEndSession = {
                                viewModel.stopAuraVoiceSession()
                                navController.popBackStack()
                            },
                            onToggleMute = viewModel::toggleAuraVoiceMute,
                            onToggleSpeaker = viewModel::toggleAuraVoiceSpeaker,
                            onAddToCart = viewModel::addToCart,
                            onClearCart = viewModel::clearCart,
                            onRemoveFromCart = viewModel::removeFromCartInAura
                        )
                    }

                    auraComposable("cart") {
                        LaunchedEffect(Unit) {
                            viewModel.refreshStoreSettings()
                            if (catalogState.products.isEmpty()) {
                                viewModel.loadCatalog()
                            }
                        }
                        CartScreen(
                            state = cartState,
                            shippingRate = storeSettings.shippingFlatRate,
                            isLoggedIn = !customerToken.isNullOrBlank(),
                            productForId = viewModel::productForCartItem,
                            onBack = { navController.popBackStack() },
                            onUpdateQty = viewModel::updateCartQty,
                            onProceedToPay = {
                                if (customerToken.isNullOrBlank()) {
                                    navController.navigate("customer_auth?redirect=checkout")
                                } else {
                                    viewModel.prepareCheckout()
                                    navController.navigate("checkout")
                                }
                            },
                            onSignIn = { navController.navigate("customer_auth?redirect=checkout") },
                            onClearCart = viewModel::clearCart
                        )
                    }

                    composable(
                        route = "admin",
                        enterTransition = { fadeEnter() },
                        exitTransition = { fadeExit() },
                        popEnterTransition = { fadeEnter() },
                        popExitTransition = { fadeExit() }
                    ) {
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
                            viewModel.registerPushTokenIfAvailable()
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
                            },
                            shippingRate = storeSettings.shippingFlatRate,
                            onShippingRateChange = viewModel::updateShippingRate,
                            onSendCustomerPush = { title, body, image, onDone, onError ->
                                viewModel.sendCustomerFcmBroadcast(title, body, image, onDone, onError)
                            }
                        )
                    }

                    auraComposable("admin_login") {
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

                    auraComposable(
                        route = "customer_auth?redirect={redirect}&mode={mode}",
                        arguments = listOf(
                            navArgument("redirect") {
                                type = NavType.StringType
                                defaultValue = ""
                            },
                            navArgument("mode") {
                                type = NavType.StringType
                                defaultValue = "signin"
                            }
                        )
                    ) { entry ->
                        val redirect = entry.arguments?.getString("redirect").orEmpty()
                        val modeArg = entry.arguments?.getString("mode").orEmpty()
                        LaunchedEffect(modeArg) {
                            when (modeArg.lowercase()) {
                                "signup" -> viewModel.setCustomerAuthMode(AuthMode.SIGN_UP)
                                "forgot" -> viewModel.setCustomerAuthMode(AuthMode.FORGOT_PASSWORD)
                                else -> viewModel.setCustomerAuthMode(AuthMode.SIGN_IN)
                            }
                        }
                        CustomerAuthScreen(
                            state = customerAuthState,
                            onBack = { navController.popBackStack() },
                            onModeChange = viewModel::setCustomerAuthMode,
                            onEmailChange = viewModel::updateCustomerAuthEmail,
                            onPasswordChange = viewModel::updateCustomerAuthPassword,
                            onOtpChange = viewModel::updateCustomerAuthOtp,
                            onNameChange = viewModel::updateCustomerAuthName,
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
                            onSignInWithOtp = {
                                viewModel.customerSignInWithOtp {
                                    if (redirect == "checkout") {
                                        viewModel.prepareCheckout()
                                        navController.navigate("checkout") {
                                            popUpTo("shop")
                                        }
                                    } else {
                                        navController.popBackStack()
                                    }
                                }
                            },
                            onUseOtpSignIn = viewModel::setSignInWithOtp,
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
                            },
                            onResetPassword = {
                                viewModel.resetCustomerPassword {
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

                    auraComposable(
                        route = "checkout",
                        enterTransition = { slideInFromBottom() },
                        exitTransition = { slideOutToBottom() },
                        popEnterTransition = { popEnter() },
                        popExitTransition = { popExit() }
                    ) {
                        LaunchedEffect(Unit) {
                            viewModel.refreshStoreSettings()
                            viewModel.prepareCheckout()
                        }
                        CheckoutScreen(
                            state = checkoutState,
                            cartTotal = viewModel.cartGrandTotal(),
                            mapsEnabled = mapsConfig.mapsEnabled && !mapsConfig.googleMapsApiKey.isNullOrBlank(),
                            onBack = { navController.popBackStack() },
                            onNameChange = { v -> viewModel.updateCheckoutInfo { it.copy(name = v) } },
                            onPhoneChange = { v -> viewModel.updateCheckoutInfo { it.copy(phone = v) } },
                            onAddressChange = { v -> viewModel.updateCheckoutInfo { it.copy(address = v) } },
                            onCityChange = { v -> viewModel.updateCheckoutInfo { it.copy(city = v) } },
                            onStateChange = { v -> viewModel.updateCheckoutInfo { it.copy(state = v) } },
                            onPincodeChange = { v -> viewModel.updateCheckoutInfo { it.copy(pincode = v) } },
                            onSearchAddress = { launchPlacesAutocomplete(mapsConfig.googleMapsApiKey.orEmpty()) },
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

                    auraComposable(
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

                    auraComposable(
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

                    auraComposable("admin_product/new") {
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

                    auraComposable(
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

                    auraComposable(
                        route = "admin/order/{orderId}",
                        arguments = listOf(navArgument("orderId") { type = NavType.StringType })
                    ) { entry ->
                        val orderId = entry.arguments?.getString("orderId").orEmpty()
                        OrderDetailScreen(
                            state = detailState,
                            onBack = { navController.popBackStack() },
                            onStatusChange = { status ->
                                viewModel.updateOrderStatus(orderId, status)
                            },
                            onDelete = {
                                viewModel.deleteOrder(orderId, onDone = {
                                    navController.popBackStack()
                                })
                            }
                        )
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        super.onDestroy()
    }

    private fun initTextToSpeech() {
        textToSpeech = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                textToSpeech?.language = Locale.ENGLISH
            }
        }
    }

    private fun launchPlacesAutocomplete(apiKey: String) {
        if (apiKey.isBlank()) return
        try {
            if (!Places.isInitialized()) {
                Places.initialize(applicationContext, apiKey)
            }
            val fields = listOf(Place.Field.ADDRESS, Place.Field.ADDRESS_COMPONENTS)
            val intent = Autocomplete.IntentBuilder(AutocompleteActivityMode.OVERLAY, fields)
                .setCountries(listOf("IN"))
                .build(this)
            placesLauncher.launch(intent)
        } catch (_: Exception) { }
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
