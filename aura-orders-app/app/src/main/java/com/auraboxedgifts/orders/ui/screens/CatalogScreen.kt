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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.CatalogUiState
import com.auraboxedgifts.orders.data.Hamper
import com.auraboxedgifts.orders.data.Product
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.ui.components.PressableScale
import com.auraboxedgifts.orders.ui.components.ProductImage
import com.auraboxedgifts.orders.ui.components.ShimmerBox
import com.auraboxedgifts.orders.ui.components.StaggeredFadeIn
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
    showHeader: Boolean = true,
    onRefresh: () -> Unit,
    onCollectionChange: (String?) -> Unit,
    onSearchChange: (String) -> Unit,
    onProductClick: (String) -> Unit,
    hampers: List<Hamper> = emptyList(),
    onHamperClick: (String) -> Unit = onProductClick,
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
        when {
            state.isLoading && filteredProducts.isEmpty() -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    items(6) {
                        ShimmerBox(
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(0.72f)
                                .clip(RoundedCornerShape(20.dp))
                        )
                    }
                }
            }

            state.error != null && filteredProducts.isEmpty() -> {
                EmptyState(
                    title = "Could not load catalog",
                    subtitle = state.error,
                    action = "Try again",
                    onAction = onRefresh
                )
            }

            filteredProducts.isEmpty() && !state.isLoading -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(16.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    item(span = { GridItemSpan(2) }) {
                        OutlinedTextField(
                            value = state.searchQuery,
                            onValueChange = onSearchChange,
                            modifier = Modifier.fillMaxWidth(),
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
                    }
                    item(span = { GridItemSpan(2) }) {
                        EmptyState(
                            title = if (state.products.isEmpty()) "No products yet" else "No matching products",
                            subtitle = if (state.products.isEmpty()) {
                                "Products added in your website admin will appear here automatically."
                            } else {
                                "Try a different search or collection filter."
                            }
                        )
                    }
                }
            }

            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(2),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 100.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxSize()
                ) {
                    if (showHeader) {
                        item(span = { GridItemSpan(2) }) {
                            CatalogHeader(
                                title = title,
                                productCount = state.products.size,
                                collectionCount = state.collections.size,
                                subtitle = subtitle
                            )
                        }
                    }

                    item(span = { GridItemSpan(2) }) {
                        OutlinedTextField(
                            value = state.searchQuery,
                            onValueChange = onSearchChange,
                            modifier = Modifier.fillMaxWidth(),
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
                    }

                    item(span = { GridItemSpan(2) }) {
                        LazyRow(
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
                    }

                    if (hampers.isNotEmpty()) {
                        item(span = { GridItemSpan(2) }) {
                            Column(modifier = Modifier.fillMaxWidth()) {
                                Text(
                                    text = "Gift hampers",
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                    color = TextDark,
                                    modifier = Modifier.padding(vertical = 4.dp)
                                )
                                Text(
                                    text = "Curated hampers from our website showcase",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextMedium
                                )
                                LazyRow(
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    modifier = Modifier.padding(top = 8.dp)
                                ) {
                                    items(hampers, key = { it.id }) { hamper ->
                                        HamperCard(
                                            hamper = hamper,
                                            onClick = { onHamperClick(hamper.id) },
                                            onAddToCart = if (showAddToCart) {{ onAddToCart(hamper.id) }} else null
                                        )
                                    }
                                }
                            }
                        }
                        item(span = { GridItemSpan(2) }) {
                            Text(
                                text = "All gifts",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                color = TextDark,
                                modifier = Modifier.padding(top = 4.dp, bottom = 4.dp)
                            )
                        }
                    }

                    items(filteredProducts.size, key = { filteredProducts[it].id }) { index ->
                        val product = filteredProducts[index]
                        StaggeredFadeIn(index = index) {
                            ProductCard(
                                product = product,
                                collectionLabel = collectionName(product.collection),
                                onClick = { onProductClick(product.id) },
                                showAddToCart = showAddToCart,
                                onAddToCart = { onAddToCart(product.id) }
                            )
                        }
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
private fun HamperCard(
    hamper: Hamper,
    onClick: () -> Unit,
    onAddToCart: (() -> Unit)? = null
) {
    PressableScale(onClick = onClick) {
        Card(
            modifier = Modifier.width(210.dp),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column {
                ProductImage(
                    imagePath = hamper.image,
                    contentDescription = hamper.title,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1.05f),
                    cornerRadius = 0.dp
                )
                Column(
                    modifier = Modifier.padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = hamper.title,
                        style = MaterialTheme.typography.titleSmall,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        color = TextDark
                    )
                    hamper.subtitle?.takeIf { it.isNotBlank() }?.let {
                        Text(text = it, style = MaterialTheme.typography.labelMedium, color = TextMedium)
                    }
                    Text(
                        text = formatRupee(hamper.price),
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = RoseGold
                    )
                    if (onAddToCart != null) {
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
}

@Composable
private fun ProductCard(
    product: Product,
    collectionLabel: String,
    onClick: () -> Unit,
    showAddToCart: Boolean = false,
    onAddToCart: () -> Unit = {}
) {
    PressableScale(onClick = onClick) {
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
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
                            Text("  Add to cart", color = RoseGold)
                        }
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
