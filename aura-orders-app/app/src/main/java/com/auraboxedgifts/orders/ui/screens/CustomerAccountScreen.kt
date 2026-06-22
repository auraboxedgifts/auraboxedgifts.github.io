package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.CustomerOrdersUiState
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.data.isPaid
import com.auraboxedgifts.orders.formatOrderDate
import com.auraboxedgifts.orders.ui.components.BrandLogo
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import com.auraboxedgifts.orders.ui.theme.Gold
import com.auraboxedgifts.orders.ui.theme.RoseLight
import com.auraboxedgifts.orders.ui.theme.CreamDark
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium

@Composable
fun CustomerAccountScreen(
    modifier: Modifier = Modifier,
    isLoggedIn: Boolean,
    isAdminLoggedIn: Boolean,
    email: String?,
    name: String?,
    ordersState: CustomerOrdersUiState,
    onSignIn: () -> Unit,
    onAdminPanel: () -> Unit,
    onLogout: () -> Unit,
    onDeleteAccount: () -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        BrandLogo(modifier = Modifier.size(72.dp))
        Text("Aura Boxed Gift", style = MaterialTheme.typography.headlineMedium)

        if (isAdminLoggedIn) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = RoseGold.copy(alpha = 0.12f))
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("Admin signed in", style = MaterialTheme.typography.titleMedium, color = RoseGold)
                    Text(
                        "You have full store access. Open the admin dashboard to manage orders and products.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextMedium
                    )
                    Button(
                        onClick = onAdminPanel,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
                    ) {
                        Text("Open admin dashboard")
                    }
                }
            }
        }

        if (isLoggedIn) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.Transparent),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.linearGradient(
                                colors = listOf(RoseGold, Gold.copy(alpha = 0.9f))
                            )
                        )
                        .padding(24.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        val initials = (name?.takeIf { it.isNotBlank() } ?: email.orEmpty())
                            .split(" ")
                            .mapNotNull { it.firstOrNull()?.uppercaseChar() }
                            .take(2)
                            .joinToString("")
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(RoundedCornerShape(50))
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = initials.ifEmpty { "A" },
                                style = MaterialTheme.typography.titleMedium.copy(
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            )
                        }
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Aura Member",
                                style = MaterialTheme.typography.labelSmall.copy(
                                    color = Color.White.copy(alpha = 0.7f),
                                    fontWeight = FontWeight.Bold
                                )
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = name?.ifBlank { email } ?: email.orEmpty(),
                                style = MaterialTheme.typography.titleLarge.copy(
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold
                                )
                            )
                            if (!name.isNullOrBlank()) {
                                Text(
                                    text = email.orEmpty(),
                                    style = MaterialTheme.typography.bodyMedium.copy(
                                        color = Color.White.copy(alpha = 0.8f)
                                    )
                                )
                            }
                        }
                    }
                }
            }

            Text(
                text = "Your orders",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                modifier = Modifier.fillMaxWidth()
            )

            when {
                ordersState.isLoading -> CircularProgressIndicator(color = RoseGold)
                ordersState.orders.isEmpty() -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White),
                        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, RoseGold.copy(alpha = 0.12f))
                    ) {
                        Text(
                            "No orders yet. Your purchases will appear here.",
                            modifier = Modifier.padding(20.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            color = TextMedium
                        )
                    }
                }
                else -> {
                    ordersState.orders.forEach { order ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, RoseGold.copy(alpha = 0.1f))
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = formatOrderDate(order.createdAt),
                                        style = MaterialTheme.typography.labelMedium,
                                        color = TextLight
                                    )
                                    val statusText = order.status?.replaceFirstChar { it.uppercase() } ?: "Pending"
                                    Text(
                                        text = statusText,
                                        style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.Bold),
                                        color = if (statusText.equals("paid", ignoreCase = true) || order.isPaid()) Color(0xFF2E7D32) else RoseGold
                                    )
                                }
                                Text(
                                    text = formatRupee(order.cart?.grandTotal ?: 0.0),
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                                    color = TextDark
                                )
                                Text(
                                    text = "Order ID: ${order.id}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextMedium
                                )
                            }
                        }
                    }
                }
            }

            if (!isAdminLoggedIn) {
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = RoseGold),
                    border = androidx.compose.foundation.BorderStroke(1.dp, RoseGold)
                ) {
                    Text("Sign out")
                }
                OutlinedButton(
                    onClick = onDeleteAccount,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFB3261E)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFB3261E).copy(alpha = 0.65f))
                ) {
                    Text("Delete account")
                }
            }
        } else if (!isAdminLoggedIn) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White),
                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, RoseGold.copy(alpha = 0.15f))
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        "Sign in to track orders and pay at checkout.",
                        style = MaterialTheme.typography.bodyLarge.copy(color = TextDark),
                        textAlign = TextAlign.Center
                    )
                    Button(
                        onClick = onSignIn,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(26.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
                    ) {
                        Text("Sign in / Sign up", style = MaterialTheme.typography.titleMedium.copy(color = Color.White, fontWeight = FontWeight.Bold))
                    }
                }
            }
        }
    }
}
