package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.ClickableText
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.automirrored.outlined.Login
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Receipt
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.BuildConfig
import com.auraboxedgifts.orders.ui.components.BrandLogo
import com.auraboxedgifts.orders.ui.components.StaggeredFadeIn
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.CreamDark
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium

@Composable
fun CustomerDrawerContent(
    isCustomerLoggedIn: Boolean,
    isAdminLoggedIn: Boolean,
    customerEmail: String?,
    cartItemCount: Int,
    onShop: () -> Unit,
    onCart: () -> Unit,
    onAccount: () -> Unit,
    onSignIn: () -> Unit,
    onAdminPanel: () -> Unit,
    onCustomerLogout: () -> Unit,
    onAbout: () -> Unit
) {
    val uriHandler = LocalUriHandler.current

    Column(
        modifier = Modifier
            .fillMaxHeight()
            .width(300.dp)
            .background(Cream)
            .navigationBarsPadding()
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState())
                .padding(vertical = 24.dp)
        ) {
            StaggeredFadeIn(index = 0, modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    BrandLogo(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                    )
                    Column {
                        Text("Aura Boxed Gift", style = MaterialTheme.typography.titleLarge, color = TextDark)
                        Text(
                            text = when {
                                isAdminLoggedIn -> "Admin · ${customerEmail ?: "Store owner"}"
                                isCustomerLoggedIn -> customerEmail.orEmpty()
                                else -> "Browse & shop freely"
                            },
                            style = MaterialTheme.typography.labelMedium,
                            color = TextLight,
                            maxLines = 1
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
            HorizontalDivider(color = CreamDark)
            Spacer(modifier = Modifier.height(8.dp))

            DrawerItem(index = 1, icon = Icons.Outlined.ShoppingBag, label = "Shop", onClick = onShop)
            DrawerItem(
                index = 2,
                icon = Icons.Outlined.ShoppingCart,
                label = "My cart",
                badge = if (cartItemCount > 0) cartItemCount.toString() else null,
                onClick = onCart
            )
            DrawerItem(index = 3, icon = Icons.Outlined.Person, label = "My account", onClick = onAccount)
            if (isCustomerLoggedIn) {
                DrawerItem(index = 4, icon = Icons.Outlined.Receipt, label = "My orders", onClick = onAccount)
            }
            DrawerItem(index = 5, icon = Icons.Outlined.Info, label = "About", onClick = onAbout)
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 12.dp)
        ) {
            HorizontalDivider(color = CreamDark)

            when {
                isAdminLoggedIn -> {
                    DrawerItem(
                        index = 7,
                        icon = Icons.Outlined.AdminPanelSettings,
                        label = "Admin dashboard",
                        highlight = true,
                        onClick = onAdminPanel
                    )
                }
                !isCustomerLoggedIn -> {
                    DrawerItem(
                        index = 7,
                        icon = Icons.AutoMirrored.Outlined.Login,
                        label = "Sign in / Sign up",
                        highlight = true,
                        onClick = onSignIn
                    )
                }
            }

            if (isCustomerLoggedIn && !isAdminLoggedIn) {
                DrawerItem(
                    index = 8,
                    icon = Icons.AutoMirrored.Outlined.Logout,
                    label = "Sign out",
                    onClick = onCustomerLogout
                )
            }

            val footer = buildAnnotatedString {
                append("App created by ")
                pushStringAnnotation(tag = "URL", annotation = "https://devshubh.me")
                withStyle(SpanStyle(color = RoseGold, fontWeight = FontWeight.SemiBold)) {
                    append("SS")
                }
                pop()
                append("  •  v${BuildConfig.VERSION_NAME}")
            }
            HorizontalDivider(color = CreamDark)
            ClickableText(
                text = footer,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                style = MaterialTheme.typography.labelMedium.copy(color = TextLight),
                onClick = { offset ->
                    footer.getStringAnnotations(tag = "URL", start = offset, end = offset)
                        .firstOrNull()
                        ?.let { uriHandler.openUri(it.item) }
                }
            )
        }
    }
}

@Composable
private fun DrawerItem(
    index: Int,
    icon: ImageVector,
    label: String,
    badge: String? = null,
    highlight: Boolean = false,
    onClick: () -> Unit
) {
    StaggeredFadeIn(index = index, modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable(onClick = onClick)
                .background(if (highlight) RoseGold.copy(alpha = 0.08f) else Cream)
                .padding(horizontal = 20.dp, vertical = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = if (highlight) RoseGold else TextMedium,
                modifier = Modifier.size(22.dp)
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodyLarge,
                color = if (highlight) RoseGold else TextDark,
                modifier = Modifier.weight(1f)
            )
            if (badge != null) {
                Text(
                    text = badge,
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(RoseGold)
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                    style = MaterialTheme.typography.labelMedium,
                    color = Cream
                )
            }
        }
    }
}
