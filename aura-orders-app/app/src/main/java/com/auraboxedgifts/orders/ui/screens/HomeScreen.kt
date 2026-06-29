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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.Chat
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.DashboardStats
import com.auraboxedgifts.orders.data.CustomerRequest
import com.auraboxedgifts.orders.data.Order
import com.auraboxedgifts.orders.data.OrderStatus
import com.auraboxedgifts.orders.data.displayContact
import com.auraboxedgifts.orders.data.displayName
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.data.isPaid
import com.auraboxedgifts.orders.formatOrderDate
import com.auraboxedgifts.orders.ui.components.BrandLogo
import com.auraboxedgifts.orders.ui.components.ProductImage
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.CreamDark
import com.auraboxedgifts.orders.ui.theme.Gold
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight
import com.auraboxedgifts.orders.ui.theme.SuccessGreen
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium
import com.auraboxedgifts.orders.ui.theme.WarningAmber

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun HomeScreen(
    modifier: Modifier = Modifier,
    adminEmail: String?,
    stats: DashboardStats,
    onOrderClick: (String) -> Unit,
    onRequestClick: (String) -> Unit,
    onViewAllOrders: () -> Unit,
    onViewAllRequests: () -> Unit,
    onViewCatalog: () -> Unit,
    onRefresh: () -> Unit,
    isRefreshing: Boolean
) {
    val pullRefreshState = rememberPullRefreshState(
        refreshing = isRefreshing,
        onRefresh = onRefresh
    )

    Box(
        modifier = modifier
            .fillMaxSize()
            .pullRefresh(pullRefreshState)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                HeroHeader(adminEmail = adminEmail)
            }

            item {
                StatsGrid(stats = stats)
            }

            item {
                QuickActions(
                    onViewOrders = onViewAllOrders,
                    onViewCatalog = onViewCatalog
                )
            }

            item {
                SectionHeader(
                    title = "Recent orders",
                    action = "View all",
                    onAction = onViewAllOrders
                )
            }

            if (stats.recentOrders.isEmpty()) {
                item {
                    EmptyCard(
                        message = "No orders yet. New checkouts from your website will appear here."
                    )
                }
            } else {
                items(stats.recentOrders, key = { it.id }) { order ->
                    RecentOrderRow(
                        order = order,
                        onClick = { onOrderClick(order.id) },
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }
            }

            item {
                SectionHeader(
                    title = "Recent requests",
                    action = "View all",
                    onAction = onViewAllRequests
                )
            }

            if (stats.recentRequests.isEmpty()) {
                item {
                    EmptyCard(
                        message = "No inquiries yet. Custom hamper requests from Aura AI will appear here."
                    )
                }
            } else {
                items(stats.recentRequests, key = { it.id }) { request ->
                    RecentRequestRow(
                        request = request,
                        onClick = { onRequestClick(request.id) },
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                }
            }
        }

        PullRefreshIndicator(
            refreshing = isRefreshing,
            state = pullRefreshState,
            modifier = Modifier.align(Alignment.TopCenter),
            backgroundColor = Color.White,
            contentColor = RoseGold
        )
    }
}

@Composable
private fun HeroHeader(adminEmail: String?) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 16.dp),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.linearGradient(
                        colors = listOf(RoseGold, Gold.copy(alpha = 0.85f))
                    )
                )
                .padding(horizontal = 24.dp, vertical = 24.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(20.dp)
            ) {
                BrandLogo(
                    modifier = Modifier
                        .size(60.dp)
                        .clip(RoundedCornerShape(18.dp))
                        .background(Color.White.copy(alpha = 0.2f))
                        .padding(2.dp)
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Aura Boxed Gifts",
                        style = MaterialTheme.typography.headlineSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = Color.White
                        )
                    )
                    Text(
                        text = "Store Dashboard",
                        style = MaterialTheme.typography.bodyMedium.copy(
                            fontWeight = FontWeight.Medium,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                    )
                    if (!adminEmail.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = adminEmail,
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = Color.White.copy(alpha = 0.65f)
                            ),
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun StatsGrid(stats: DashboardStats) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatCard(
                modifier = Modifier.weight(1f),
                label = "Orders",
                value = stats.totalOrders.toString(),
                icon = Icons.Outlined.Receipt,
                accent = RoseGold
            )
            StatCard(
                modifier = Modifier.weight(1f),
                label = "Products",
                value = stats.totalProducts.toString(),
                icon = Icons.Outlined.Inventory2,
                accent = Gold
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StatCard(
                modifier = Modifier.weight(1f),
                label = "Paid",
                value = stats.paidOrders.toString(),
                icon = Icons.Outlined.Receipt,
                accent = SuccessGreen
            )
            StatCard(
                modifier = Modifier.weight(1f),
                label = "Open requests",
                value = stats.openRequests.toString(),
                icon = Icons.Outlined.Chat,
                accent = WarningAmber
            )
        }
    }
}

@Composable
private fun StatCard(
    modifier: Modifier = Modifier,
    label: String,
    value: String,
    icon: ImageVector,
    accent: Color
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = accent.copy(alpha = 0.15f)
        )
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(accent.copy(alpha = 0.1f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, contentDescription = null, tint = accent, modifier = Modifier.size(20.dp))
                }
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(RoundedCornerShape(50))
                        .background(accent.copy(alpha = 0.8f))
                )
            }
            Spacer(modifier = Modifier.height(2.dp))
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = TextDark
                )
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge.copy(
                    color = TextMedium,
                    fontWeight = FontWeight.Medium
                )
            )
        }
    }
}

@Composable
private fun QuickActions(
    onViewOrders: () -> Unit,
    onViewCatalog: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        ActionChip(
            modifier = Modifier.weight(1f),
            label = "Manage orders",
            icon = Icons.Outlined.Receipt,
            onClick = onViewOrders
        )
        ActionChip(
            modifier = Modifier.weight(1f),
            label = "Browse catalog",
            icon = Icons.Outlined.GridView,
            onClick = onViewCatalog
        )
    }
}

@Composable
private fun ActionChip(
    modifier: Modifier = Modifier,
    label: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = modifier
            .clip(RoundedCornerShape(24.dp))
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        border = androidx.compose.foundation.BorderStroke(
            width = 1.dp,
            color = RoseGold.copy(alpha = 0.25f)
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(RoseGold.copy(alpha = 0.04f), Gold.copy(alpha = 0.02f))
                    )
                )
                .padding(horizontal = 16.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(50))
                    .background(RoseGold.copy(alpha = 0.1f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = RoseGold, modifier = Modifier.size(16.dp))
            }
            Text(
                text = label,
                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold),
                color = RoseGold,
                modifier = Modifier.weight(1f)
            )
            Icon(
                Icons.AutoMirrored.Outlined.ArrowForward,
                contentDescription = null,
                tint = RoseGold,
                modifier = Modifier.size(14.dp)
            )
        }
    }
}

@Composable
private fun SectionHeader(
    title: String,
    action: String,
    onAction: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(title, style = MaterialTheme.typography.titleLarge)
        Text(
            text = action,
            style = MaterialTheme.typography.labelLarge,
            color = RoseGold,
            modifier = Modifier.clickable(onClick = onAction)
        )
    }
}

@Composable
private fun RecentOrderRow(
    order: Order,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val status = OrderStatus.fromApi(order.status)
    val firstImage = order.cart?.lines?.firstOrNull()?.image

    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            ProductImage(
                imagePath = firstImage,
                contentDescription = order.cart?.lines?.firstOrNull()?.name,
                modifier = Modifier.size(48.dp),
                cornerRadius = 12.dp
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    order.displayName(),
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    formatOrderDate(order.createdAt),
                    style = MaterialTheme.typography.labelMedium
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(
                    formatRupee(order.cart?.grandTotal ?: 0.0),
                    style = MaterialTheme.typography.titleMedium,
                    color = RoseGold
                )
                StatusChip(
                    label = if (order.isPaid()) "Paid" else status.label,
                    color = if (order.isPaid()) SuccessGreen else WarningAmber
                )
            }
        }
    }
}

@Composable
private fun RecentRequestRow(
    request: CustomerRequest,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    request.displayName(),
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    request.displayContact(),
                    style = MaterialTheme.typography.labelMedium,
                    color = TextMedium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    request.inquiryType ?: "Inquiry",
                    style = MaterialTheme.typography.labelMedium,
                    color = RoseGold
                )
            }
            Text(
                formatOrderDate(request.createdAt),
                style = MaterialTheme.typography.labelMedium,
                color = TextLight
            )
        }
    }
}

@Composable
private fun EmptyCard(message: String) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = CreamDark)
    ) {
        Text(
            text = message,
            modifier = Modifier.padding(20.dp),
            style = MaterialTheme.typography.bodyMedium,
            color = TextMedium
        )
    }
}
