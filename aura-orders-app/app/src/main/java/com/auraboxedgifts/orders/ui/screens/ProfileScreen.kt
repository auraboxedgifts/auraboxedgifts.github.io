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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Store
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.DashboardStats
import com.auraboxedgifts.orders.ui.components.BrandLogo
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.CreamDark
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium

@Composable
fun ProfileScreen(
    modifier: Modifier = Modifier,
    adminEmail: String?,
    stats: DashboardStats,
    onLogout: () -> Unit
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(20.dp)
    ) {
        BrandLogo(
            modifier = Modifier
                .size(96.dp)
                .clip(RoundedCornerShape(24.dp))
        )

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "Aura Boxed Gift",
                style = MaterialTheme.typography.headlineMedium,
                textAlign = TextAlign.Center
            )
            Text(
                text = "Admin account",
                style = MaterialTheme.typography.bodyMedium,
                color = TextMedium
            )
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = Color.White),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Column(
                modifier = Modifier.padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                ProfileRow(
                    icon = Icons.Outlined.Email,
                    label = "Signed in as",
                    value = adminEmail ?: "—"
                )
                ProfileRow(
                    icon = Icons.Outlined.Store,
                    label = "Store",
                    value = "aura.devshubh.me"
                )
                ProfileRow(
                    icon = Icons.Outlined.Language,
                    label = "Catalog sync",
                    value = "${stats.totalProducts} products · ${stats.totalCollections} collections"
                )
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = CreamDark)
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(
                    text = "About this app",
                    style = MaterialTheme.typography.titleMedium,
                    color = TextDark
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Manage customer orders and browse your live product catalog. " +
                        "Products added in the website admin dashboard appear here automatically.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMedium
                )
            }
        }

        Spacer(modifier = Modifier.weight(1f))

        Button(
            onClick = onLogout,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = RoseGold.copy(alpha = 0.12f),
                contentColor = RoseGold
            )
        ) {
            Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null)
            Text(
                text = "  Sign out",
                style = MaterialTheme.typography.labelLarge
            )
        }

        Text(
            text = "Version 1.2.0",
            style = MaterialTheme.typography.labelMedium,
            color = TextLight
        )
    }
}

@Composable
private fun ProfileRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(RoseLight.copy(alpha = 0.5f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(icon, contentDescription = null, tint = RoseGold, modifier = Modifier.size(20.dp))
        }
        Column {
            Text(text = label, style = MaterialTheme.typography.labelMedium)
            Text(text = value, style = MaterialTheme.typography.bodyLarge, color = TextDark)
        }
    }
}
