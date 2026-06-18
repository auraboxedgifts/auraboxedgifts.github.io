package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
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
    TabItem(MainTab.CATALOG, "Catalog", Icons.Outlined.GridView),
    TabItem(MainTab.PROFILE, "Profile", Icons.Outlined.Person)
)

@Composable
fun MainShell(
    selectedTab: MainTab,
    onTabSelected: (MainTab) -> Unit,
    ordersState: OrdersUiState,
    catalogState: CatalogUiState,
    adminEmail: String?,
    dashboardStats: DashboardStats,
    filteredOrders: List<com.auraboxedgifts.orders.data.Order>,
    filteredProducts: List<com.auraboxedgifts.orders.data.Product>,
    collectionName: (String) -> String,
    onRefreshOrders: () -> Unit,
    onRefreshCatalog: () -> Unit,
    onOrderFilterChange: (com.auraboxedgifts.orders.OrderFilter) -> Unit,
    onOrderClick: (String) -> Unit,
    onProductClick: (String) -> Unit,
    onCollectionChange: (String?) -> Unit,
    onSearchChange: (String) -> Unit,
    onNavigateToOrders: () -> Unit,
    onNavigateToCatalog: () -> Unit,
    onLogout: () -> Unit
) {
    Scaffold(
        containerColor = Cream,
        bottomBar = {
            NavigationBar(
                containerColor = Cream,
                contentColor = RoseGold
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
                onViewAllOrders = onNavigateToOrders,
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

            MainTab.CATALOG -> CatalogScreen(
                modifier = Modifier.padding(padding),
                state = catalogState,
                filteredProducts = filteredProducts,
                collectionName = collectionName,
                onRefresh = onRefreshCatalog,
                onCollectionChange = onCollectionChange,
                onSearchChange = onSearchChange,
                onProductClick = onProductClick
            )

            MainTab.PROFILE -> ProfileScreen(
                modifier = Modifier.padding(padding),
                adminEmail = adminEmail,
                stats = dashboardStats,
                onLogout = onLogout
            )
        }
    }
}
