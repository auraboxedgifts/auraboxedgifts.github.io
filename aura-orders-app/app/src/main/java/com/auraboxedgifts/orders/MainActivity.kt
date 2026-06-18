package com.auraboxedgifts.orders

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
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
import com.auraboxedgifts.orders.ui.screens.LoginScreen
import com.auraboxedgifts.orders.ui.screens.MainShell
import com.auraboxedgifts.orders.ui.screens.OrderDetailScreen
import com.auraboxedgifts.orders.ui.screens.ProductDetailScreen
import com.auraboxedgifts.orders.ui.theme.AuraOrdersTheme

class MainActivity : ComponentActivity() {

    private val notificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        OrderNotificationManager.ensureChannel(this)
        requestNotificationPermissionIfNeeded()

        val deepLinkOrderId = intent?.getStringExtra("order_id")

        setContent {
            AuraOrdersTheme {
                val navController = rememberNavController()
                val viewModel: AppViewModel = viewModel()
                val token by viewModel.token.collectAsState()
                val adminEmail by viewModel.adminEmail.collectAsState()
                val loginState by viewModel.loginState.collectAsState()
                val ordersState by viewModel.ordersState.collectAsState()
                val detailState by viewModel.detailState.collectAsState()
                val catalogState by viewModel.catalogState.collectAsState()
                val productDetailState by viewModel.productDetailState.collectAsState()
                val selectedTab by viewModel.selectedTab.collectAsState()

                val startDestination = if (token.isNullOrBlank()) "login" else "main"

                LaunchedEffect(deepLinkOrderId, token) {
                    val orderId = deepLinkOrderId
                    if (!orderId.isNullOrBlank() && !token.isNullOrBlank()) {
                        viewModel.loadOrderDetail(orderId, token)
                        viewModel.selectTab(MainTab.ORDERS)
                        navController.navigate("order/$orderId") {
                            popUpTo("main")
                        }
                    }
                }

                NavHost(
                    navController = navController,
                    startDestination = startDestination
                ) {
                    composable("login") {
                        LoginScreen(
                            state = loginState,
                            onEmailChange = viewModel::updateLoginEmail,
                            onPasswordChange = viewModel::updateLoginPassword,
                            onLogin = {
                                requestNotificationPermissionIfNeeded()
                                viewModel.login {
                                    navController.navigate("main") {
                                        popUpTo("login") { inclusive = true }
                                    }
                                }
                            }
                        )
                    }

                    composable("main") {
                        if (token.isNullOrBlank()) {
                            navController.navigate("login") {
                                popUpTo("main") { inclusive = true }
                            }
                            return@composable
                        }

                        LaunchedEffect(token) {
                            viewModel.loadOrders(token)
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
                                navController.navigate("order/$orderId")
                            },
                            onProductClick = { productId ->
                                viewModel.loadProductDetail(productId)
                                navController.navigate("product/$productId")
                            },
                            onCollectionChange = viewModel::setCatalogCollection,
                            onSearchChange = viewModel::setCatalogSearch,
                            onNavigateToOrders = { viewModel.selectTab(MainTab.ORDERS) },
                            onNavigateToCatalog = { viewModel.selectTab(MainTab.CATALOG) },
                            onLogout = {
                                viewModel.logout()
                                navController.navigate("login") {
                                    popUpTo(0) { inclusive = true }
                                }
                            }
                        )
                    }

                    composable(
                        route = "order/{orderId}",
                        arguments = listOf(navArgument("orderId") { type = NavType.StringType })
                    ) { backStackEntry ->
                        val orderId = backStackEntry.arguments?.getString("orderId").orEmpty()
                        OrderDetailScreen(
                            state = detailState,
                            onBack = { navController.popBackStack() },
                            onStatusChange = { status ->
                                viewModel.updateOrderStatus(orderId, status)
                            }
                        )
                    }

                    composable(
                        route = "product/{productId}",
                        arguments = listOf(navArgument("productId") { type = NavType.StringType })
                    ) { backStackEntry ->
                        val productId = backStackEntry.arguments?.getString("productId").orEmpty()
                        LaunchedEffect(productId) {
                            if (productId.isNotBlank()) {
                                viewModel.loadProductDetail(productId)
                            }
                        }
                        ProductDetailScreen(
                            state = productDetailState,
                            collectionName = viewModel::collectionName,
                            onBack = { navController.popBackStack() }
                        )
                    }
                }
            }
        }
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
