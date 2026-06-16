package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.OrderDetailUiState
import com.auraboxedgifts.orders.data.OrderStatus
import com.auraboxedgifts.orders.data.displayAddress
import com.auraboxedgifts.orders.data.displayEmail
import com.auraboxedgifts.orders.data.displayName
import com.auraboxedgifts.orders.data.displayPhone
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.data.isPaid
import com.auraboxedgifts.orders.formatOrderDate
import com.auraboxedgifts.orders.ui.components.ProductImage
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.CreamDark
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.SuccessGreen
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium
import com.auraboxedgifts.orders.ui.theme.WarningAmber

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OrderDetailScreen(
    state: OrderDetailUiState,
    onBack: () -> Unit,
    onStatusChange: (OrderStatus) -> Unit
) {
    Scaffold(
        containerColor = Cream,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = state.order?.id ?: "Order",
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Cream)
            )
        }
    ) { padding ->
        when {
            state.isLoading -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = RoseGold)
                }
            }

            state.error != null -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(state.error, color = MaterialTheme.colorScheme.error)
                }
            }

            state.order != null -> {
                val order = state.order
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    DetailCard(title = "Overview") {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text(
                                    order.displayName(),
                                    style = MaterialTheme.typography.titleLarge
                                )
                                Text(
                                    formatOrderDate(order.createdAt),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextMedium
                                )
                            }
                            StatusChip(
                                label = if (order.isPaid()) "Paid" else "Pending",
                                color = if (order.isPaid()) SuccessGreen else WarningAmber
                            )
                        }
                        if (order.paymentId != null) {
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                "Payment ID: ${order.paymentId}",
                                style = MaterialTheme.typography.labelMedium,
                                color = TextLight
                            )
                        }
                    }

                    DetailCard(title = "Customer") {
                        InfoRow(Icons.Outlined.Email, order.displayEmail())
                        if (order.displayPhone().isNotBlank()) {
                            InfoRow(Icons.Outlined.Phone, order.displayPhone())
                        }
                        if (order.displayAddress().isNotBlank()) {
                            InfoRow(Icons.Outlined.LocationOn, order.displayAddress())
                        }
                    }

                    DetailCard(title = "Items") {
                        order.cart?.lines?.forEachIndexed { index, line ->
                            if (index > 0) {
                                HorizontalDivider(
                                    modifier = Modifier.padding(vertical = 10.dp),
                                    color = CreamDark
                                )
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                ProductImage(
                                    imagePath = line.image,
                                    contentDescription = line.name,
                                    modifier = Modifier.size(64.dp),
                                    cornerRadius = 14.dp
                                )
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        line.name ?: "Item",
                                        style = MaterialTheme.typography.bodyLarge,
                                        color = TextDark
                                    )
                                    Text(
                                        "Qty ${line.qty} × ${formatRupee(line.unitPrice)}",
                                        style = MaterialTheme.typography.bodyMedium
                                    )
                                }
                                Text(
                                    formatRupee(line.lineTotal),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = RoseGold
                                )
                            }
                        } ?: Text("No items", style = MaterialTheme.typography.bodyMedium)

                        Spacer(modifier = Modifier.height(12.dp))
                        HorizontalDivider(color = CreamDark)
                        Spacer(modifier = Modifier.height(12.dp))

                        SummaryRow("Subtotal", order.cart?.subtotal ?: 0.0)
                        SummaryRow("Shipping", order.cart?.shipping ?: 0.0)
                        Spacer(modifier = Modifier.height(4.dp))
                        SummaryRow(
                            "Total",
                            order.cart?.grandTotal ?: 0.0,
                            bold = true
                        )
                    }

                    DetailCard(title = "Update status") {
                        if (state.isUpdating) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(8.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(24.dp),
                                    color = RoseGold,
                                    strokeWidth = 2.dp
                                )
                            }
                        }
                        val current = OrderStatus.fromApi(order.status)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OrderStatus.entries.filter { it != OrderStatus.CANCELLED }.take(3).forEach { status ->
                                FilterChip(
                                    selected = current == status,
                                    onClick = { if (!state.isUpdating) onStatusChange(status) },
                                    label = { Text(status.label) },
                                    modifier = Modifier.weight(1f),
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = RoseGold.copy(alpha = 0.15f),
                                        selectedLabelColor = RoseGold
                                    )
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            OrderStatus.entries.filter { it != OrderStatus.CANCELLED }.drop(3).forEach { status ->
                                FilterChip(
                                    selected = current == status,
                                    onClick = { if (!state.isUpdating) onStatusChange(status) },
                                    label = { Text(status.label) },
                                    modifier = Modifier.weight(1f),
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = RoseGold.copy(alpha = 0.15f),
                                        selectedLabelColor = RoseGold
                                    )
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
private fun DetailCard(
    title: String,
    content: @Composable () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleMedium, color = TextDark)
            content()
        }
    }
}

@Composable
private fun InfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top
    ) {
        Icon(icon, contentDescription = null, tint = RoseGold, modifier = Modifier.size(20.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, color = TextMedium)
    }
}

@Composable
private fun SummaryRow(label: String, amount: Double, bold: Boolean = false) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = if (bold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            color = if (bold) TextDark else TextMedium
        )
        Text(
            formatRupee(amount),
            style = if (bold) {
                MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold)
            } else {
                MaterialTheme.typography.bodyMedium
            },
            color = if (bold) RoseGold else TextMedium
        )
    }
}
