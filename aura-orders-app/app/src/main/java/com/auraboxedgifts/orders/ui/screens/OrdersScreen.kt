package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.OrderFilter
import com.auraboxedgifts.orders.OrdersUiState
import com.auraboxedgifts.orders.data.Order
import com.auraboxedgifts.orders.data.OrderStatus
import com.auraboxedgifts.orders.data.displayName
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.data.isPaid
import com.auraboxedgifts.orders.formatOrderDate
import com.auraboxedgifts.orders.orderItemCount
import com.auraboxedgifts.orders.ui.components.BrandLogo
import com.auraboxedgifts.orders.ui.components.ProductImage
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight
import com.auraboxedgifts.orders.ui.theme.SuccessGreen
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium
import com.auraboxedgifts.orders.ui.theme.WarningAmber

@OptIn(ExperimentalMaterial3Api::class, ExperimentalMaterialApi::class)
@Composable
fun OrdersScreen(
    state: OrdersUiState,
    adminEmail: String?,
    filteredOrders: List<Order>,
    onRefresh: () -> Unit,
    onFilterChange: (OrderFilter) -> Unit,
    onOrderClick: (String) -> Unit,
    onLogout: () -> Unit
) {
    val pullRefreshState = rememberPullRefreshState(
        refreshing = state.isRefreshing,
        onRefresh = onRefresh
    )

    Scaffold(
        containerColor = Cream,
        topBar = {
            TopAppBar(
                title = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        BrandLogo(modifier = Modifier.size(36.dp))
                        Column {
                            Text("Orders", style = MaterialTheme.typography.titleLarge)
                            if (!adminEmail.isNullOrBlank()) {
                                Text(
                                    adminEmail,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = TextLight
                                )
                            }
                        }
                    }
                },
                actions = {
                    IconButton(onClick = onLogout) {
                        Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = "Logout")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Cream,
                    titleContentColor = TextDark
                )
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .pullRefresh(pullRefreshState)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                FilterRow(
                    selected = state.filter,
                    onFilterChange = onFilterChange,
                    totalCount = state.orders.size,
                    paidCount = state.orders.count { it.isPaid() }
                )

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
                            title = "Could not load orders",
                            subtitle = state.error,
                            action = "Try again",
                            onAction = onRefresh
                        )
                    }

                    filteredOrders.isEmpty() -> {
                        EmptyState(
                            title = if (state.orders.isEmpty()) "No orders yet" else "No matching orders",
                            subtitle = if (state.orders.isEmpty()) {
                                "New customer orders will appear here when someone checks out on your website."
                            } else {
                                "Try a different filter to see other orders."
                            }
                        )
                    }

                    else -> {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(filteredOrders, key = { it.id }) { order ->
                                OrderCard(order = order, onClick = { onOrderClick(order.id) })
                            }
                            item { Spacer(modifier = Modifier.height(24.dp)) }
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
        }
    }
}

@Composable
private fun FilterRow(
    selected: OrderFilter,
    onFilterChange: (OrderFilter) -> Unit,
    totalCount: Int,
    paidCount: Int
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        OrderFilter.entries.forEach { filter ->
            val count = when (filter) {
                OrderFilter.ALL -> totalCount
                OrderFilter.PAID -> paidCount
                OrderFilter.PENDING -> totalCount - paidCount
            }
            FilterChip(
                selected = selected == filter,
                onClick = { onFilterChange(filter) },
                label = { Text("${filter.label} ($count)") },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = RoseGold.copy(alpha = 0.15f),
                    selectedLabelColor = RoseGold
                )
            )
        }
    }
}

@Composable
private fun OrderCard(order: Order, onClick: () -> Unit) {
    val status = OrderStatus.fromApi(order.status)
    val paid = order.isPaid()
    val firstImage = order.cart?.lines?.firstOrNull()?.image

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                ProductImage(
                    imagePath = firstImage,
                    contentDescription = order.cart?.lines?.firstOrNull()?.name,
                    modifier = Modifier.size(56.dp),
                    cornerRadius = 14.dp
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = order.displayName(),
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = formatOrderDate(order.createdAt),
                        style = MaterialTheme.typography.labelMedium
                    )
                }
                StatusChip(
                    label = if (paid) "Paid" else "Pending",
                    color = if (paid) SuccessGreen else WarningAmber
                )
            }

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${orderItemCount(order)} item${if (orderItemCount(order) == 1) "" else "s"} · ${status.label}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMedium
                )
                Text(
                    text = formatRupee(order.cart?.grandTotal ?: 0.0),
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = RoseGold
                )
            }

            Text(
                text = order.id,
                style = MaterialTheme.typography.labelMedium,
                color = TextLight
            )
        }
    }
}

@Composable
fun StatusChip(label: String, color: Color) {
    AssistChip(
        onClick = {},
        enabled = false,
        label = {
            Text(label, style = MaterialTheme.typography.labelMedium)
        },
        colors = AssistChipDefaults.assistChipColors(
            disabledContainerColor = color.copy(alpha = 0.12f),
            disabledLabelColor = color
        ),
        border = null
    )
}

@Composable
private fun EmptyState(
    title: String,
    subtitle: String,
    action: String? = null,
    onAction: (() -> Unit)? = null
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(RoseLight.copy(alpha = 0.5f)),
            contentAlignment = Alignment.Center
        ) {
            Text("🎁", style = MaterialTheme.typography.headlineMedium)
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(title, style = MaterialTheme.typography.titleLarge, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            subtitle,
            style = MaterialTheme.typography.bodyMedium,
            color = TextMedium,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
        if (action != null && onAction != null) {
            Spacer(modifier = Modifier.height(16.dp))
            AssistChip(
                onClick = onAction,
                label = { Text(action) },
                colors = AssistChipDefaults.assistChipColors(
                    containerColor = RoseGold.copy(alpha = 0.12f),
                    labelColor = RoseGold
                )
            )
        }
    }
}
