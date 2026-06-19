package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.outlined.AdminPanelSettings
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
import com.auraboxedgifts.orders.formatOrderDate
import com.auraboxedgifts.orders.ui.components.BrandLogo
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
    onLogout: () -> Unit
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
                colors = CardDefaults.cardColors(containerColor = RoseGold.copy(alpha = 0.1f))
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
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Signed in", style = MaterialTheme.typography.labelMedium, color = TextLight)
                    Text(name?.ifBlank { email } ?: email.orEmpty(), style = MaterialTheme.typography.titleLarge, color = TextDark)
                    if (!name.isNullOrBlank()) {
                        Text(email.orEmpty(), style = MaterialTheme.typography.bodyMedium, color = TextMedium)
                    }
                }
            }

            Text("Your orders", style = MaterialTheme.typography.titleLarge, modifier = Modifier.fillMaxWidth())

            when {
                ordersState.isLoading -> CircularProgressIndicator(color = RoseGold)
                ordersState.orders.isEmpty() -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = CreamDark)
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
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(formatOrderDate(order.createdAt), style = MaterialTheme.typography.labelMedium)
                                Text(
                                    formatRupee(order.cart?.grandTotal ?: 0.0),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = RoseGold
                                )
                                Text(
                                    order.status?.replaceFirstChar { it.uppercase() } ?: "Pending",
                                    style = MaterialTheme.typography.bodyMedium,
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
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Text("Sign out")
                }
            }
        } else if (!isAdminLoggedIn) {
            Text(
                "Sign in to track orders and pay at checkout.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextMedium,
                textAlign = TextAlign.Center
            )
            Button(
                onClick = onSignIn,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
            ) {
                Text("Sign in / Sign up")
            }

            Spacer(modifier = Modifier.height(8.dp))

            OutlinedButton(
                onClick = onAdminPanel,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("Store admin sign in")
            }
        }
    }
}
