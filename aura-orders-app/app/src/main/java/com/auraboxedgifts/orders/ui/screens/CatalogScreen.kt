package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.AddShoppingCart
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.CatalogUiState
import com.auraboxedgifts.orders.data.Product
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.ui.components.ProductImage
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun CatalogScreen(
    modifier: Modifier = Modifier,
    state: CatalogUiState,
    filteredProducts: List<Product>,
    collectionName: (String) -> String,
    title: String = "Product catalog",
    subtitle: String? = null,
    onRefresh: () -> Unit,
    onCollectionChange: (String?) -> Unit,
    onSearchChange: (String) -> Unit,
    onProductClick: (String) -> Unit,
    showAddToCart: Boolean = false,
    onAddToCart: (String) -> Unit = {},
    isAdminMode: Boolean = false,
    onAddProduct: (() -> Unit)? = null
) {
    val pullRefreshState = rememberPullRefreshState(
        refreshing = state.isRefreshing,
        onRefresh = onRefresh
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .pullRefresh(pullRefreshState)
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            CatalogHeader(
                title = title,
                productCount = state.products.size,
                collectionCount = state.collections.size,
                subtitle = subtitle
            )

            OutlinedTextField(
                value = state.searchQuery,
                onValueChange = onSearchChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                placeholder = { Text("Search products…") },
                leadingIcon = {
                    Icon(Icons.Outlined.Search, contentDescription = null, tint = RoseGold)
                },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = RoseGold,
                    unfocusedBorderColor = RoseLight,
                    focusedContainerColor = Color.White,
                    unfocusedContainerColor = Color.White
                )
            )

            Spacer(modifier = Modifier.height(12.dp))

            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(
                        selected = state.selectedCollection == null,
                        onClick = { onCollectionChange(null) },
                        label = { Text("All") },
                        colors = filterChipColors()
                    )
                }
                items(state.collections, key = { it.slug }) { collection ->
                    FilterChip(
                        selected = state.selectedCollection == collection.slug,
                        onClick = { onCollectionChange(collection.slug) },
                        label = { Text(collection.name) },
                        colors = filterChipColors()
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            when {
                state.isLoading -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(color = RoseGold)
                    }
                }

                state.error != null -> {
                    EmptyState(
                        title = "Could not load catalog",
                        subtitle = state.error,
                        action = "Try again",
                        onAction = onRefresh
                    )
                }

                filteredProducts.isEmpty() -> {
                    EmptyState(
                        title = if (state.products.isEmpty()) "No products yet" else "No matching products",
                        subtitle = if (state.products.isEmpty()) {
                            "Products added in your website admin will appear here automatically."
                        } else {
                            "Try a different search or collection filter."
                        }
                    )
                }

                else -> {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(2),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize()
                    ) {
                        items(filteredProducts, key = { it.id }) { product ->
                            ProductCard(
                                product = product,
                                collectionLabel = collectionName(product.collection),
                                onClick = { onProductClick(product.id) },
                                showAddToCart = showAddToCart,
                                onAddToCart = { onAddToCart(product.id) }
                            )
                        }
                        item { Spacer(modifier = Modifier.height(16.dp)) }
                    }
                }
            }
        }

        PullRefreshIndicator(
            refreshing = state.isRefreshing,
            state = pullRefreshState,
            modifier = Modifier.align(Alignment.TopCenter),
            backgroundColor = Color.White,
            contentColor = RoseGold
        )

        if (isAdminMode && onAddProduct != null) {
            FloatingActionButton(
                onClick = onAddProduct,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp),
                containerColor = RoseGold,
                contentColor = Color.White
            ) {
                Icon(Icons.Outlined.Add, contentDescription = "Add product")
            }
        }
    }
}

@Composable
private fun CatalogHeader(
    title: String,
    productCount: Int,
    collectionCount: Int,
    subtitle: String?
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 16.dp)
    ) {
        Text(text = title, style = MaterialTheme.typography.headlineMedium)
        Text(
            text = "$productCount products · $collectionCount collections",
            style = MaterialTheme.typography.bodyMedium,
            color = TextMedium
        )
        Text(
            text = subtitle ?: "Synced with your website admin",
            style = MaterialTheme.typography.labelMedium,
            color = TextLight
        )
    }
}

@Composable
private fun ProductCard(
    product: Product,
    collectionLabel: String,
    onClick: () -> Unit,
    showAddToCart: Boolean = false,
    onAddToCart: () -> Unit = {}
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            ProductImage(
                imagePath = product.image,
                contentDescription = product.name,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
                cornerRadius = 0.dp
            )
            Column(
                modifier = Modifier.padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    color = TextDark
                )
                Text(
                    text = collectionLabel,
                    style = MaterialTheme.typography.labelMedium
                )
                Text(
                    text = formatRupee(product.price),
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = RoseGold
                )
                if (showAddToCart) {
                    OutlinedButton(
                        onClick = onAddToCart,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Icon(Icons.Outlined.AddShoppingCart, contentDescription = null, tint = RoseGold)
                        Text("  Add", color = RoseGold)
                    }
                }
            }
        }
    }
}

@Composable
private fun filterChipColors() = FilterChipDefaults.filterChipColors(
    selectedContainerColor = RoseGold.copy(alpha = 0.15f),
    selectedLabelColor = RoseGold
)
