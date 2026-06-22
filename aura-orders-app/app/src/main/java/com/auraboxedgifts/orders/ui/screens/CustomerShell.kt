package com.auraboxedgifts.orders.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.auraboxedgifts.orders.CatalogUiState
import com.auraboxedgifts.orders.CustomerOrdersUiState
import com.auraboxedgifts.orders.CustomerTab
import com.auraboxedgifts.orders.R
import com.auraboxedgifts.orders.data.Product
import com.auraboxedgifts.orders.ui.components.AuraMotion
import androidx.compose.ui.res.painterResource
import com.auraboxedgifts.orders.ui.components.BrandLogo
import com.auraboxedgifts.orders.ui.components.drawerBackdropEffect
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerShell(
    selectedTab: CustomerTab,
    onTabSelected: (CustomerTab) -> Unit,
    catalogState: CatalogUiState,
    cartItemCount: Int,
    filteredProducts: List<Product>,
    hampers: List<com.auraboxedgifts.orders.data.Hamper> = emptyList(),
    collectionName: (String) -> String,
    isCustomerLoggedIn: Boolean,
    isAdminLoggedIn: Boolean,
    customerEmail: String?,
    customerName: String?,
    customerOrdersState: CustomerOrdersUiState,
    snackbarMessage: String?,
    onSnackbarShown: () -> Unit,
    onRefreshCatalog: () -> Unit,
    onCollectionChange: (String?) -> Unit,
    onSearchChange: (String) -> Unit,
    onProductClick: (String) -> Unit,
    onAddToCart: (String) -> Unit,
    onOpenCart: () -> Unit,
    onSignIn: () -> Unit,
    onAdminPanel: () -> Unit,
    onCustomerLogout: () -> Unit,
    onDeleteAccount: () -> Unit,
    onOpenAuraAi: () -> Unit,
    onClearCart: () -> Unit = {}
) {
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }
    var showAboutDialog by remember { mutableStateOf(false) }

    if (showAboutDialog) {
        CustomerAboutDialog(onDismiss = { showAboutDialog = false })
    }

    val drawerProgress by animateFloatAsState(
        targetValue = if (drawerState.targetValue == DrawerValue.Open) 1f else 0f,
        animationSpec = AuraMotion.smoothTween(360),
        label = "drawerProgress"
    )

    var cartPulse by remember { mutableFloatStateOf(1f) }
    LaunchedEffect(cartItemCount) {
        if (cartItemCount > 0) {
            cartPulse = 1.18f
            kotlinx.coroutines.delay(120)
            cartPulse = 1f
        }
    }
    val cartIconScale by animateFloatAsState(
        targetValue = cartPulse,
        animationSpec = AuraMotion.gentleSpring(),
        label = "cartIconScale"
    )

    LaunchedEffect(snackbarMessage) {
        snackbarMessage?.let {
            snackbarHostState.showSnackbar(it)
            onSnackbarShown()
        }
    }

    val closeDrawer: () -> Unit = { scope.launch { drawerState.close() } }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            CustomerDrawerContent(
                isCustomerLoggedIn = isCustomerLoggedIn,
                isAdminLoggedIn = isAdminLoggedIn,
                customerEmail = customerEmail,
                cartItemCount = cartItemCount,
                onShop = {
                    onTabSelected(CustomerTab.SHOP)
                    closeDrawer()
                },
                onCart = {
                    closeDrawer()
                    onOpenCart()
                },
                onAccount = {
                    onTabSelected(CustomerTab.ACCOUNT)
                    closeDrawer()
                },
                onSignIn = {
                    closeDrawer()
                    onSignIn()
                },
                onAdminPanel = {
                    closeDrawer()
                    onAdminPanel()
                },
                onCustomerLogout = {
                    closeDrawer()
                    onCustomerLogout()
                },
                onAbout = {
                    closeDrawer()
                    showAboutDialog = true
                },
                onClearCart = {
                    closeDrawer()
                    onClearCart()
                }
            )
        }
    ) {
        Box(modifier = Modifier.drawerBackdropEffect(drawerProgress)) {
            Scaffold(
                containerColor = Cream,
                snackbarHost = {
                    SnackbarHost(
                        hostState = snackbarHostState,
                        modifier = Modifier.padding(bottom = 96.dp)
                    )
                },
                floatingActionButton = {
                    FloatingActionButton(
                        onClick = onOpenAuraAi,
                        containerColor = RoseGold,
                        contentColor = Cream,
                        modifier = Modifier
                            .padding(bottom = 72.dp)
                            .navigationBarsPadding()
                    ) {
                        Icon(
                            painter = painterResource(R.drawable.ic_aura_hamper),
                            contentDescription = "Talk to Aura AI",
                            modifier = Modifier.size(26.dp)
                        )
                    }
                },
                topBar = {
                    TopAppBar(
                        title = {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                BrandLogo(modifier = Modifier.size(32.dp))
                                Text(
                                    text = when (selectedTab) {
                                        CustomerTab.SHOP -> "Shop gifts"
                                        CustomerTab.ACCOUNT -> "My account"
                                    },
                                    style = MaterialTheme.typography.titleMedium.copy(
                                        fontWeight = FontWeight.SemiBold
                                    ),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        },
                        navigationIcon = {
                            IconButton(onClick = { scope.launch { drawerState.open() } }) {
                                Icon(Icons.Outlined.Menu, contentDescription = "Menu")
                            }
                        },
                        actions = {
                            Box(
                                modifier = Modifier
                                    .padding(end = 8.dp)
                                    .size(44.dp)
                                    .clip(CircleShape)
                                    .clickable(onClick = onOpenCart)
                                    .scale(cartIconScale),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Outlined.ShoppingCart,
                                    contentDescription = "Cart",
                                    tint = TextDark,
                                    modifier = Modifier.size(26.dp)
                                )
                                if (cartItemCount > 0) {
                                    Box(
                                        modifier = Modifier
                                            .align(Alignment.TopEnd)
                                            .offset(x = 8.dp, y = (-4).dp)
                                            .size(18.dp)
                                            .background(RoseGold, CircleShape),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Text(
                                            text = if (cartItemCount > 99) "99+" else "$cartItemCount",
                                            style = MaterialTheme.typography.labelSmall.copy(
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                lineHeight = 10.sp
                                            ),
                                            color = Color.White,
                                            maxLines = 1
                                        )
                                    }
                                }
                            }
                        },
                        colors = TopAppBarDefaults.topAppBarColors(
                            containerColor = Cream,
                            titleContentColor = TextDark
                        )
                    )
                },
                bottomBar = {
                    NavigationBar(
                        containerColor = Cream,
                        modifier = Modifier.navigationBarsPadding()
                    ) {
                        NavigationBarItem(
                            selected = selectedTab == CustomerTab.SHOP,
                            onClick = { onTabSelected(CustomerTab.SHOP) },
                            icon = { Icon(Icons.Outlined.ShoppingBag, contentDescription = "Shop") },
                            label = { Text("Shop") },
                            colors = navColors()
                        )
                        NavigationBarItem(
                            selected = selectedTab == CustomerTab.ACCOUNT,
                            onClick = { onTabSelected(CustomerTab.ACCOUNT) },
                            icon = { Icon(Icons.Outlined.Person, contentDescription = "Account") },
                            label = { Text("Account") },
                            colors = navColors()
                        )
                        if (isAdminLoggedIn) {
                            NavigationBarItem(
                                selected = false,
                                onClick = onAdminPanel,
                                icon = { Icon(Icons.Outlined.AdminPanelSettings, contentDescription = "Admin") },
                                label = { Text("Admin") },
                                colors = navColors()
                            )
                        }
                    }
                }
            ) { padding ->
                AnimatedContent(
                    targetState = selectedTab,
                    transitionSpec = {
                        fadeIn(AuraMotion.smoothTween(260)) togetherWith fadeOut(AuraMotion.smoothTween(200))
                    },
                    label = "customerTab"
                ) { tab ->
                    when (tab) {
                        CustomerTab.SHOP -> CatalogScreen(
                            modifier = Modifier.padding(padding),
                            state = catalogState,
                            filteredProducts = filteredProducts,
                            hampers = hampers,
                            collectionName = collectionName,
                            title = "Curated for you",
                            subtitle = "Swipe from left or tap ☰ to open menu",
                            showHeader = false,
                            onRefresh = onRefreshCatalog,
                            onCollectionChange = onCollectionChange,
                            onSearchChange = onSearchChange,
                            onProductClick = onProductClick,
                            showAddToCart = true,
                            onAddToCart = onAddToCart
                        )

                        CustomerTab.ACCOUNT -> CustomerAccountScreen(
                            modifier = Modifier.padding(padding),
                            isLoggedIn = isCustomerLoggedIn,
                            isAdminLoggedIn = isAdminLoggedIn,
                            email = customerEmail,
                            name = customerName,
                            ordersState = customerOrdersState,
                            onSignIn = onSignIn,
                            onAdminPanel = onAdminPanel,
                            onLogout = onCustomerLogout,
                            onDeleteAccount = onDeleteAccount
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun navColors() = NavigationBarItemDefaults.colors(
    selectedIconColor = RoseGold,
    selectedTextColor = RoseGold,
    unselectedIconColor = TextMedium,
    unselectedTextColor = TextLight,
    indicatorColor = RoseGold.copy(alpha = 0.12f)
)
