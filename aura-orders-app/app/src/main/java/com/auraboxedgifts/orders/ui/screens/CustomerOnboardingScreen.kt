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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextMedium

private data class OnboardingSlide(
    val title: String,
    val subtitle: String
)

@Composable
fun CustomerOnboardingScreen(onFinish: () -> Unit) {
    val slides = listOf(
        OnboardingSlide(
            title = "Welcome to Aura Boxed Gifts",
            subtitle = "Discover curated hampers and premium gifts made for birthdays, weddings, and special moments."
        ),
        OnboardingSlide(
            title = "Shop Faster with Aura AI",
            subtitle = "Use voice to ask for gift ideas, view your cart, and add or remove items instantly."
        ),
        OnboardingSlide(
            title = "Smooth Checkout Experience",
            subtitle = "Track orders, manage your account, and complete secure payments in a few taps."
        )
    )
    var page by remember { mutableIntStateOf(0) }
    val isLast = page == slides.lastIndex

    Box(
        modifier = Modifier
            .fillMaxSize()
            .navigationBarsPadding()
            .background(
                Brush.verticalGradient(
                    listOf(Cream, Color(0xFFF8EFF1), Color(0xFFF4E9EC))
                )
            )
            .padding(20.dp)
    ) {
        TextButton(
            onClick = onFinish,
            modifier = Modifier.align(Alignment.TopEnd)
        ) {
            Text("Skip", color = TextMedium)
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 56.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Box(
                        modifier = Modifier
                            .size(68.dp)
                            .background(RoseGold.copy(alpha = 0.15f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("✨", style = MaterialTheme.typography.headlineSmall)
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                    Text(
                        text = slides[page].title,
                        style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = TextDark,
                        textAlign = TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = slides[page].subtitle,
                        style = MaterialTheme.typography.bodyLarge,
                        color = TextMedium,
                        textAlign = TextAlign.Center
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                slides.indices.forEach { index ->
                    Box(
                        modifier = Modifier
                            .size(if (index == page) 10.dp else 8.dp)
                            .background(
                                color = if (index == page) RoseGold else RoseGold.copy(alpha = 0.25f),
                                shape = CircleShape
                            )
                    )
                }
            }

            Spacer(modifier = Modifier.weight(1f))
            Button(
                onClick = {
                    if (isLast) onFinish() else page += 1
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .padding(bottom = 8.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
            ) {
                Text(if (isLast) "Get Started" else "Next")
            }
        }
    }
}
