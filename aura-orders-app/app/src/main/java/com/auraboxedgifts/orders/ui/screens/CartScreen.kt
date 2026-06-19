package com.auraboxedgifts.orders.ui.screens

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import com.auraboxedgifts.orders.CartUiState
import com.auraboxedgifts.orders.data.Product
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.ui.components.ProductImage
import com.auraboxedgifts.orders.ui.components.StaggeredFadeIn
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.CreamDark
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(
    modifier: Modifier = Modifier,
    state: CartUiState,
    shippingRate: Double = 120.0,
    isLoggedIn: Boolean,
    productForId: (String) -> Product?,
    onBack: (() -> Unit)? = null,
    onUpdateQty: (String, Int) -> Unit,
    onProceedToPay: () -> Unit,
    onSignIn: () -> Unit
) {
    Scaffold(
        modifier = modifier,
        containerColor = Cream,
        topBar = {
            if (onBack != null) {
                TopAppBar(
                    title = {
                        Text(
                            "Cart (${state.items.sumOf { it.qty }})",
                            style = MaterialTheme.typography.titleLarge
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
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            when {
                state.items.isEmpty() -> {
                    StaggeredFadeIn(index = 0, modifier = Modifier.fillMaxWidth()) {
                        EmptyState(
                            title = "Your cart is empty",
                            subtitle = "Browse the shop and tap Add on gifts you love."
                        )
                    }
                }

                else -> {
                    if (state.isLoading && state.calculated == null) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = RoseGold, modifier = Modifier.size(28.dp))
                        }
                    }

                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(vertical = 8.dp)
                    ) {
                        items(state.items.size, key = { state.items[it].productId }) { index ->
                            val item = state.items[index]
                            val product = productForId(item.productId)
                            val line = state.calculated?.lines?.find { it.productId == item.productId }
                            StaggeredFadeIn(index = index, modifier = Modifier.fillMaxWidth()) {
                                CartLineRow(
                                    name = line?.name ?: product?.name ?: "Product",
                                    image = line?.image ?: product?.image,
                                    qty = item.qty,
                                    unitPrice = line?.unitPrice ?: product?.price ?: 0.0,
                                    lineTotal = line?.lineTotal ?: ((product?.price ?: 0.0) * item.qty),
                                    onDecrease = { onUpdateQty(item.productId, item.qty - 1) },
                                    onIncrease = { onUpdateQty(item.productId, item.qty + 1) }
                                )
                            }
                        }
                    }

                    val subtotal = state.calculated?.subtotal
                        ?: state.items.sumOf { item ->
                            val p = productForId(item.productId)
                            (p?.price ?: 0.0) * item.qty
                        }
                    val shipping = state.calculated?.shipping ?: if (state.items.isNotEmpty()) shippingRate else 0.0
                    val total = state.calculated?.grandTotal ?: (subtotal + shipping)

                    StaggeredFadeIn(index = state.items.size.coerceAtMost(6), modifier = Modifier.fillMaxWidth()) {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                SummaryRow("Subtotal", subtotal)
                                SummaryRow("Shipping", shipping)
                                HorizontalDivider(color = CreamDark)
                                SummaryRow("Total", total, bold = true)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    StaggeredFadeIn(
                        index = state.items.size.coerceAtMost(6) + 1,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        if (isLoggedIn) {
                            Button(
                                onClick = onProceedToPay,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
                            ) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Proceed to Pay", style = MaterialTheme.typography.labelLarge)
                                    Text(
                                        "Secure checkout via Razorpay",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = Color.White.copy(alpha = 0.85f)
                                    )
                                }
                            }
                        } else {
                            Text(
                                "Sign in to complete your order",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextMedium,
                                modifier = Modifier.fillMaxWidth()
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Button(
                                onClick = onSignIn,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                                shape = RoundedCornerShape(16.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
                            ) {
                                Text("Sign in / Sign up to pay", style = MaterialTheme.typography.labelLarge)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
private fun CartLineRow(
    name: String,
    image: String?,
    qty: Int,
    unitPrice: Double,
    lineTotal: Double,
    onDecrease: () -> Unit,
    onIncrease: () -> Unit
) {
    Card(
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
            ProductImage(imagePath = image, contentDescription = name, modifier = Modifier.size(72.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(name, style = MaterialTheme.typography.titleMedium, color = TextDark)
                Text(formatRupee(unitPrice), style = MaterialTheme.typography.bodyMedium, color = TextMedium)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onDecrease, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Outlined.Remove, contentDescription = "Decrease", tint = RoseGold)
                    }
                    Text("$qty", style = MaterialTheme.typography.titleMedium)
                    IconButton(onClick = onIncrease, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Outlined.Add, contentDescription = "Increase", tint = RoseGold)
                    }
                }
            }
            Text(
                formatRupee(lineTotal),
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                color = RoseGold
            )
        }
    }
}

@Composable
private fun SummaryRow(label: String, amount: Double, bold: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = if (bold) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium)
        Text(
            formatRupee(amount),
            style = if (bold) MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold) else MaterialTheme.typography.bodyMedium,
            color = if (bold) RoseGold else TextMedium
        )
    }
}
