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
import com.auraboxedgifts.orders.ui.screens.OrderDetailScreen
import com.auraboxedgifts.orders.ui.screens.OrdersScreen
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

                val startDestination = if (token.isNullOrBlank()) "login" else "orders"

                LaunchedEffect(deepLinkOrderId, token) {
                    val orderId = deepLinkOrderId
                    if (!orderId.isNullOrBlank() && !token.isNullOrBlank()) {
                        viewModel.loadOrderDetail(orderId, token)
                        navController.navigate("order/$orderId") {
                            popUpTo("orders")
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
                                    navController.navigate("orders") {
                                        popUpTo("login") { inclusive = true }
                                    }
                                }
                            }
                        )
                    }

                    composable("orders") {
                        if (token.isNullOrBlank()) {
                            navController.navigate("login") {
                                popUpTo("orders") { inclusive = true }
                            }
                            return@composable
                        }

                        LaunchedEffect(token) {
                            viewModel.loadOrders(token)
                        }

                        DisposableEffect(Unit) {
                            viewModel.startForegroundOrderPolling()
                            onDispose { viewModel.stopForegroundOrderPolling() }
                        }

                        OrdersScreen(
                            state = ordersState,
                            adminEmail = adminEmail,
                            filteredOrders = viewModel.filteredOrders(),
                            onRefresh = { viewModel.loadOrders(refreshing = true) },
                            onFilterChange = viewModel::setOrderFilter,
                            onOrderClick = { orderId ->
                                viewModel.loadOrderDetail(orderId)
                                navController.navigate("order/$orderId")
                            },
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
