package com.auraboxedgifts.orders.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = RoseGold,
    onPrimary = Color.White,
    primaryContainer = RoseLight,
    onPrimaryContainer = TextDark,
    secondary = Gold,
    onSecondary = Color.White,
    background = Cream,
    onBackground = TextDark,
    surface = Color.White,
    onSurface = TextDark,
    surfaceVariant = CreamDark,
    onSurfaceVariant = TextMedium,
    outline = RoseLight,
    error = ErrorRed
)

@Composable
fun AuraOrdersTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColors,
        typography = AuraTypography,
        shapes = AuraShapes,
        content = content
    )
}
