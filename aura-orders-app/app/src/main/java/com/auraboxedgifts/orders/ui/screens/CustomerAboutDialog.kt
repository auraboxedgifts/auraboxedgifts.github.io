package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.text.ClickableText
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextMedium

@Composable
fun CustomerAboutDialog(onDismiss: () -> Unit) {
    val uriHandler = LocalUriHandler.current

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text("About Aura Boxed Gifts", style = MaterialTheme.typography.titleLarge, color = TextDark)
        },
        text = {
            Column {
                Text(
                    "Aura Boxed Gifts is a gifting brand focused on premium hampers and thoughtful custom gift boxes for birthdays, weddings, anniversaries, and corporate occasions.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMedium
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "With this app, you can browse collections, get suggestions from Aura AI, manage your cart, and track your orders in one place.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMedium
                )
                Spacer(modifier = Modifier.height(14.dp))
                val website = buildAnnotatedString {
                    append("Website: ")
                    pushStringAnnotation(tag = "URL", annotation = "https://auraboxedgifts.in")
                    withStyle(SpanStyle(color = RoseGold, fontWeight = FontWeight.SemiBold)) {
                        append("auraboxedgifts.in")
                    }
                    pop()
                }
                ClickableText(
                    text = website,
                    style = MaterialTheme.typography.bodyMedium.copy(color = TextMedium),
                    onClick = { offset ->
                        website.getStringAnnotations(tag = "URL", start = offset, end = offset)
                            .firstOrNull()
                            ?.let { uriHandler.openUri(it.item) }
                    }
                )
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("Close", color = RoseGold)
            }
        }
    )
}
