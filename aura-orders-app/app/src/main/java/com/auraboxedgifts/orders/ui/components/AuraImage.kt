package com.auraboxedgifts.orders.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import com.auraboxedgifts.orders.ui.theme.CreamDark
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight

@Composable
fun ProductImage(
    imagePath: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 12.dp
) {
    val url = ImageUrl.resolve(imagePath)
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(CreamDark),
        contentAlignment = Alignment.Center
    ) {
        if (url == null) {
            Icon(
                Icons.Outlined.CardGiftcard,
                contentDescription = contentDescription,
                tint = RoseGold.copy(alpha = 0.6f)
            )
        } else {
            SubcomposeAsyncImage(
                model = url,
                contentDescription = contentDescription,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
                loading = {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(RoseLight.copy(alpha = 0.35f))
                    )
                },
                error = {
                    Icon(
                        Icons.Outlined.CardGiftcard,
                        contentDescription = contentDescription,
                        tint = RoseGold.copy(alpha = 0.6f)
                    )
                }
            )
        }
    }
}

@Composable
fun BrandLogo(
    modifier: Modifier = Modifier,
    contentDescription: String = "Aura Boxed Gift"
) {
    androidx.compose.foundation.Image(
        painter = androidx.compose.ui.res.painterResource(
            com.auraboxedgifts.orders.R.drawable.logo
        ),
        contentDescription = contentDescription,
        modifier = modifier,
        contentScale = ContentScale.Fit
    )
}
