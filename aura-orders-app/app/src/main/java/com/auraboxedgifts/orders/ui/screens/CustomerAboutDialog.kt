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
                    "Aura Boxed Gifts creates beautifully curated, personalized gift hampers for birthdays, weddings, anniversaries, corporate gifting, and more — delivered across India.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMedium
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "This app lets you browse gifts, talk to Aura AI for recommendations, manage your cart, and track orders — all synced with our online store.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMedium
                )
                Spacer(modifier = Modifier.height(16.dp))
                val footer = buildAnnotatedString {
                    append("App created by ")
                    pushStringAnnotation(tag = "URL", annotation = "https://devshubh.me")
                    withStyle(SpanStyle(color = RoseGold, fontWeight = FontWeight.SemiBold)) {
                        append("SS")
                    }
                    pop()
                }
                ClickableText(
                    text = footer,
                    style = MaterialTheme.typography.bodySmall.copy(color = TextMedium),
                    onClick = { offset ->
                        footer.getStringAnnotations(tag = "URL", start = offset, end = offset)
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
