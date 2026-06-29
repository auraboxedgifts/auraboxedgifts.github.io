package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Chat
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import com.auraboxedgifts.orders.CatalogUiState
import com.auraboxedgifts.orders.DashboardStats
import com.auraboxedgifts.orders.MainTab
import com.auraboxedgifts.orders.OrdersUiState
import com.auraboxedgifts.orders.RequestsUiState
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium

private data class TabItem(
    val tab: MainTab,
    val label: String,
    val icon: ImageVector
)

private val tabs = listOf(
    TabItem(MainTab.HOME, "Home", Icons.Outlined.Home),
    TabItem(MainTab.ORDERS, "Orders", Icons.Outlined.Receipt),
    TabItem(MainTab.REQUESTS, "Requests", Icons.Outlined.Chat),
    TabItem(MainTab.CATALOG, "Catalog", Icons.Outlined.GridView),
    TabItem(MainTab.PROFILE, "Profile", Icons.Outlined.Person)
)

@Composable
fun MainShell(
    selectedTab: MainTab,
    onTabSelected: (MainTab) -> Unit,
    ordersState: OrdersUiState,
    requestsState: RequestsUiState,
    catalogState: CatalogUiState,
    adminEmail: String?,
    dashboardStats: DashboardStats,
    filteredOrders: List<com.auraboxedgifts.orders.data.Order>,
    filteredRequests: List<com.auraboxedgifts.orders.data.CustomerRequest>,
    filteredProducts: List<com.auraboxedgifts.orders.data.Product>,
    collectionName: (String) -> String,
    onRefreshOrders: () -> Unit,
    onRefreshRequests: () -> Unit,
    onRefreshCatalog: () -> Unit,
    onOrderFilterChange: (com.auraboxedgifts.orders.OrderFilter) -> Unit,
    onRequestFilterChange: (com.auraboxedgifts.orders.RequestFilter) -> Unit,
    onOrderClick: (String) -> Unit,
    onRequestClick: (String) -> Unit,
    onProductClick: (String) -> Unit,
    onCollectionChange: (String?) -> Unit,
    onSearchChange: (String) -> Unit,
    onNavigateToOrders: () -> Unit,
    onNavigateToRequests: () -> Unit,
    onNavigateToCatalog: () -> Unit,
    onAddProduct: () -> Unit,
    onLogout: () -> Unit,
    shippingRate: Double = 120.0,
    onShippingRateChange: (Double, () -> Unit, (String) -> Unit) -> Unit = { _, _, _ -> },
    onSendCustomerPush: (String, String, String?, (String) -> Unit, (String) -> Unit) -> Unit = { _, _, _, _, _ -> }
) {
    Scaffold(
        containerColor = Cream,
        bottomBar = {
            NavigationBar(
                containerColor = Cream,
                contentColor = RoseGold,
                modifier = Modifier.navigationBarsPadding()
            ) {
                tabs.forEach { item ->
                    NavigationBarItem(
                        selected = selectedTab == item.tab,
                        onClick = { onTabSelected(item.tab) },
                        icon = {
                            Icon(
                                item.icon,
                                contentDescription = item.label
                            )
                        },
                        label = {
                            Text(
                                item.label,
                                style = MaterialTheme.typography.labelMedium
                            )
                        },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = RoseGold,
                            selectedTextColor = RoseGold,
                            unselectedIconColor = TextMedium,
                            unselectedTextColor = TextLight,
                            indicatorColor = RoseGold.copy(alpha = 0.12f)
                        )
                    )
                }
            }
        }
    ) { padding ->
        when (selectedTab) {
            MainTab.HOME -> HomeScreen(
                modifier = Modifier.padding(padding),
                adminEmail = adminEmail,
                stats = dashboardStats,
                onOrderClick = onOrderClick,
                onRequestClick = onRequestClick,
                onViewAllOrders = onNavigateToOrders,
                onViewAllRequests = onNavigateToRequests,
                onViewCatalog = onNavigateToCatalog,
                onRefresh = {
                    onRefreshOrders()
                    onRefreshCatalog()
                },
                isRefreshing = ordersState.isRefreshing || catalogState.isRefreshing
            )

            MainTab.ORDERS -> OrdersScreen(
                modifier = Modifier.padding(padding),
                state = ordersState,
                adminEmail = adminEmail,
                filteredOrders = filteredOrders,
                showTopBar = false,
                onRefresh = onRefreshOrders,
                onFilterChange = onOrderFilterChange,
                onOrderClick = onOrderClick,
                onLogout = onLogout
            )

            MainTab.REQUESTS -> RequestsScreen(
                modifier = Modifier.padding(padding),
                state = requestsState,
                filteredRequests = filteredRequests,
                onRefresh = onRefreshRequests,
                onFilterChange = onRequestFilterChange,
                onRequestClick = onRequestClick
            )

            MainTab.CATALOG -> CatalogScreen(
                modifier = Modifier.padding(padding),
                state = catalogState,
                filteredProducts = filteredProducts,
                collectionName = collectionName,
                onRefresh = onRefreshCatalog,
                onCollectionChange = onCollectionChange,
                onSearchChange = onSearchChange,
                onProductClick = onProductClick,
                isAdminMode = true,
                onAddProduct = onAddProduct
            )

            MainTab.PROFILE -> ProfileScreen(
                modifier = Modifier.padding(padding),
                adminEmail = adminEmail,
                stats = dashboardStats,
                shippingRate = shippingRate,
                onShippingRateChange = onShippingRateChange,
                onSendCustomerPush = onSendCustomerPush,
                onLogout = onLogout
            )
        }
    }
}
