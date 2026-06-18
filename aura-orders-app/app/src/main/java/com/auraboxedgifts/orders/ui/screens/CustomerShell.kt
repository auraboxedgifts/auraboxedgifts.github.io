package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
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
import com.auraboxedgifts.orders.CartUiState
import com.auraboxedgifts.orders.CatalogUiState
import com.auraboxedgifts.orders.CustomerOrdersUiState
import com.auraboxedgifts.orders.CustomerTab
import com.auraboxedgifts.orders.data.Product
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium

@Composable
fun CustomerShell(
    selectedTab: CustomerTab,
    onTabSelected: (CustomerTab) -> Unit,
    catalogState: CatalogUiState,
    cartState: CartUiState,
    cartItemCount: Int,
    filteredProducts: List<Product>,
    collectionName: (String) -> String,
    isCustomerLoggedIn: Boolean,
    customerEmail: String?,
    customerName: String?,
    customerOrdersState: CustomerOrdersUiState,
    onRefreshCatalog: () -> Unit,
    onCollectionChange: (String?) -> Unit,
    onSearchChange: (String) -> Unit,
    onProductClick: (String) -> Unit,
    onAddToCart: (String) -> Unit,
    onUpdateCartQty: (String, Int) -> Unit,
    onCheckout: () -> Unit,
    onSignIn: () -> Unit,
    onAdminSignIn: () -> Unit,
    onCustomerLogout: () -> Unit,
    productForCartItem: (String) -> Product?
) {
    val tabs = listOf(
        Triple(CustomerTab.SHOP, "Shop", Icons.Outlined.ShoppingBag),
        Triple(CustomerTab.CART, "Cart", Icons.Outlined.ShoppingCart),
        Triple(CustomerTab.ACCOUNT, "Account", Icons.Outlined.Person)
    )

    Scaffold(
        containerColor = Cream,
        bottomBar = {
            NavigationBar(containerColor = Cream) {
                tabs.forEach { (tab, label, icon) ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { onTabSelected(tab) },
                        icon = {
                            if (tab == CustomerTab.CART && cartItemCount > 0) {
                                BadgedBox(badge = { Badge { Text("$cartItemCount") } }) {
                                    Icon(icon, contentDescription = label)
                                }
                            } else {
                                Icon(icon, contentDescription = label)
                            }
                        },
                        label = { Text(label, style = MaterialTheme.typography.labelMedium) },
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
            CustomerTab.SHOP -> CatalogScreen(
                modifier = Modifier.padding(padding),
                state = catalogState,
                filteredProducts = filteredProducts,
                collectionName = collectionName,
                title = "Shop gifts",
                subtitle = "Browse curated hampers & accessories",
                onRefresh = onRefreshCatalog,
                onCollectionChange = onCollectionChange,
                onSearchChange = onSearchChange,
                onProductClick = onProductClick,
                showAddToCart = true,
                onAddToCart = onAddToCart
            )

            CustomerTab.CART -> CartScreen(
                modifier = Modifier.padding(padding),
                state = cartState,
                productForId = productForCartItem,
                onUpdateQty = onUpdateCartQty,
                onCheckout = onCheckout
            )

            CustomerTab.ACCOUNT -> CustomerAccountScreen(
                modifier = Modifier.padding(padding),
                isLoggedIn = isCustomerLoggedIn,
                email = customerEmail,
                name = customerName,
                ordersState = customerOrdersState,
                onSignIn = onSignIn,
                onAdminSignIn = onAdminSignIn,
                onLogout = onCustomerLogout
            )
        }
    }
}
