package com.auraboxedgifts.orders.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.AddShoppingCart
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.MicOff
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.auraboxedgifts.orders.AuraVoicePhase
import com.auraboxedgifts.orders.AuraVoiceUiState
import com.auraboxedgifts.orders.data.AuraShowcaseItem
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.ui.components.ProductImage
import com.auraboxedgifts.orders.ui.theme.RoseGold

private val AuraDark = Color(0xFF2A1F1A)
private val AuraDarkMid = Color(0xFF3A2A1F)
private val AuraRose = Color(0xFFB76E79)
private val AuraRoseLight = Color(0xFFD4919B)
private val AuraGold = Color(0xFFC9A96E)
private val EndRed = Color(0xFFFF6B6B)
private val CardSurface = Color(0xFF3D2E28)

private val trySayingPrompts = listOf(
    "Show me gift hampers",
    "Birthday gift ideas",
    "What's in my cart?",
    "Add a hamper to cart"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuraAiScreen(
    state: AuraVoiceUiState,
    onBack: () -> Unit,
    onStartSession: () -> Unit,
    onEndSession: () -> Unit,
    onToggleMute: () -> Unit,
    onAddToCart: (String) -> Unit = {}
) {
    val isConnecting = state.phase == AuraVoicePhase.Connecting
    val hasShowcase = state.showcaseItems.isNotEmpty()

    Scaffold(
        containerColor = AuraDark,
        topBar = {
            if (!isConnecting) {
                TopAppBar(
                    title = {
                        Column {
                            Text(
                                "Aura AI",
                                color = Color.White,
                                style = MaterialTheme.typography.titleLarge
                            )
                            Text(
                                text = state.statusText,
                                style = MaterialTheme.typography.labelMedium,
                                color = AuraRoseLight.copy(alpha = 0.8f),
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = AuraDark)
                )
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Brush.verticalGradient(listOf(AuraDark, AuraDarkMid, AuraDark)))
                .navigationBarsPadding()
        ) {
            AnimatedContent(
                targetState = isConnecting,
                transitionSpec = { fadeIn(tween(280)) togetherWith fadeOut(tween(220)) },
                label = "auraConnect"
            ) { connecting ->
                if (connecting) {
                    AuraConnectingScreen(onBack = onBack)
                } else if (hasShowcase) {
                    ShowcaseVoiceLayout(
                        state = state,
                        onStartSession = onStartSession,
                        onEndSession = onEndSession,
                        onToggleMute = onToggleMute,
                        onAddToCart = onAddToCart
                    )
                } else {
                    CenteredVoiceLayout(
                        state = state,
                        onStartSession = onStartSession,
                        onEndSession = onEndSession,
                        onToggleMute = onToggleMute
                    )
                }
            }
        }
    }
}

@Composable
private fun AuraConnectingScreen(onBack: () -> Unit) {
    val infinite = rememberInfiniteTransition(label = "connectPulse")
    val pulseAlpha by infinite.animateFloat(
        initialValue = 0.25f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseAlpha"
    )
    val pulseScale by infinite.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulseScale"
    )

    Box(modifier = Modifier.fillMaxSize()) {
        IconButton(
            onClick = onBack,
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(8.dp)
        ) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 36.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(20.dp)
                    .graphicsLayer {
                        scaleX = pulseScale
                        scaleY = pulseScale
                        alpha = pulseAlpha
                    }
                    .background(AuraRose, CircleShape)
            )
            Spacer(modifier = Modifier.height(24.dp))
            Text(
                text = "Connecting to Aura AI…",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Medium),
                color = Color.White,
                letterSpacing = (-0.2).sp
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Setting up your voice gift assistant.\nThis usually takes a few seconds.",
                style = MaterialTheme.typography.bodyMedium,
                color = AuraRoseLight.copy(alpha = 0.75f),
                textAlign = TextAlign.Center,
                lineHeight = 20.sp
            )
        }
    }
}

@Composable
private fun CenteredVoiceLayout(
    state: AuraVoiceUiState,
    onStartSession: () -> Unit,
    onEndSession: () -> Unit,
    onToggleMute: () -> Unit
) {
    Box(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(12.dp))
            AuraVoiceOrb(
                state = state,
                size = 200.dp,
                orbSize = 132.dp,
                enabled = !state.isSessionActive,
                onClick = onStartSession
            )
            Spacer(modifier = Modifier.height(20.dp))
            VoiceStatusCopy(state = state, compact = false)
            if (state.isSessionActive && state.phase == AuraVoicePhase.Listening) {
                Spacer(modifier = Modifier.height(28.dp))
                AuraTrySayingSection()
            }
        }
        VoiceControlsBar(
            state = state,
            onStartSession = onStartSession,
            onEndSession = onEndSession,
            onToggleMute = onToggleMute,
            modifier = Modifier.align(Alignment.BottomCenter)
        )
    }
}

@Composable
private fun AuraTrySayingSection() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 8.dp)
    ) {
        Text(
            text = "Try saying…",
            style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
            color = AuraRoseLight.copy(alpha = 0.85f)
        )
        Spacer(modifier = Modifier.height(10.dp))
        trySayingPrompts.forEach { prompt ->
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp),
                shape = RoundedCornerShape(16.dp),
                color = CardSurface.copy(alpha = 0.92f),
                border = androidx.compose.foundation.BorderStroke(0.5.dp, AuraRose.copy(alpha = 0.35f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Outlined.Mic,
                        contentDescription = null,
                        tint = AuraGold,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = prompt,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.92f)
                    )
                }
            }
        }
    }
}

@Composable
private fun ShowcaseVoiceLayout(
    state: AuraVoiceUiState,
    onStartSession: () -> Unit,
    onEndSession: () -> Unit,
    onToggleMute: () -> Unit,
    onAddToCart: (String) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            AuraVoiceOrb(
                state = state,
                size = 72.dp,
                orbSize = 52.dp,
                enabled = !state.isSessionActive,
                onClick = onStartSession
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = when (state.phase) {
                        AuraVoicePhase.Speaking -> "Aura is speaking"
                        AuraVoicePhase.Listening -> "Listening for you"
                        else -> state.statusText
                    },
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = Color.White
                )
                Text(
                    text = "Swipe gifts • tap Add to cart",
                    style = MaterialTheme.typography.bodySmall,
                    color = AuraRoseLight.copy(alpha = 0.8f)
                )
            }
        }

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Outlined.CardGiftcard, contentDescription = null, tint = AuraGold, modifier = Modifier.size(20.dp))
            Text(
                text = state.showcaseTitle ?: "Picked for you",
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = Color.White,
                modifier = Modifier.weight(1f)
            )
            Text(
                text = "${state.showcaseItems.size}",
                style = MaterialTheme.typography.labelMedium,
                color = AuraRoseLight.copy(alpha = 0.75f)
            )
        }

        LazyRow(
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(14.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(state.showcaseItems, key = { it.id }) { item ->
                ShowcaseGiftCard(item = item, onAddToCart = { onAddToCart(item.id) })
            }
        }

        VoiceControlsBar(
            state = state,
            onStartSession = onStartSession,
            onEndSession = onEndSession,
            onToggleMute = onToggleMute,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun ShowcaseGiftCard(
    item: AuraShowcaseItem,
    onAddToCart: () -> Unit
) {
    Column(
        modifier = Modifier
            .width(200.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(CardSurface)
            .border(
                width = 1.dp,
                brush = Brush.linearGradient(listOf(AuraRose.copy(alpha = 0.5f), AuraGold.copy(alpha = 0.35f))),
                shape = RoundedCornerShape(20.dp)
            )
    ) {
        Box {
            ProductImage(
                imagePath = item.image,
                contentDescription = item.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
                cornerRadius = 0.dp
            )
            if (item.isHamper) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(10.dp)
                        .clip(RoundedCornerShape(50))
                        .background(AuraGold.copy(alpha = 0.92f))
                        .padding(horizontal = 10.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "Hamper",
                        style = MaterialTheme.typography.labelSmall.copy(fontWeight = FontWeight.Bold),
                        color = AuraDark
                    )
                }
            }
        }
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = item.title,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            item.subtitle.takeIf { it.isNotBlank() }?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.labelSmall,
                    color = AuraRoseLight.copy(alpha = 0.8f),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
            Text(
                text = formatRupee(item.price),
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                color = RoseGold
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(AuraRose.copy(alpha = 0.22f))
                    .clickable(onClick = onAddToCart)
                    .padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Outlined.AddShoppingCart, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Add to cart", style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold), color = Color.White)
            }
        }
    }
}

@Composable
private fun AuraVoiceOrb(
    state: AuraVoiceUiState,
    size: androidx.compose.ui.unit.Dp,
    orbSize: androidx.compose.ui.unit.Dp,
    enabled: Boolean,
    onClick: () -> Unit
) {
    val infinite = rememberInfiniteTransition(label = "auraOrb")
    val pulse by infinite.animateFloat(
        initialValue = 1f,
        targetValue = 1.12f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = when (state.phase) {
                    AuraVoicePhase.Speaking -> 800
                    AuraVoicePhase.Listening -> 2000
                    else -> 1600
                },
                easing = LinearEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    val orbScale = when (state.phase) {
        AuraVoicePhase.Listening -> pulse * (1f + state.audioLevel * 0.25f)
        AuraVoicePhase.Speaking -> pulse
        AuraVoicePhase.Connecting -> pulse
        else -> 1f
    }

    val orbBrush = when (state.phase) {
        AuraVoicePhase.Speaking -> Brush.linearGradient(listOf(AuraGold, Color(0xFFE8D5B0), Color(0xFFB08D4F)))
        else -> Brush.linearGradient(listOf(AuraRose, AuraRoseLight, Color(0xFF9C5A64)))
    }

    Box(
        modifier = Modifier
            .size(size)
            .clickable(enabled = enabled) { onClick() },
        contentAlignment = Alignment.Center
    ) {
        if (state.phase == AuraVoicePhase.Listening || state.phase == AuraVoicePhase.Speaking) {
            Box(
                modifier = Modifier
                    .size(size * 0.9f)
                    .scale(orbScale * 1.08f)
                    .clip(CircleShape)
                    .background(AuraRose.copy(alpha = 0.15f))
            )
        }
        Box(
            modifier = Modifier
                .size(orbSize)
                .scale(orbScale)
                .clip(CircleShape)
                .background(orbBrush)
                .border(2.dp, AuraRoseLight.copy(alpha = 0.45f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .size(orbSize * 0.68f)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.18f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    if (state.isMicMuted) Icons.Outlined.MicOff else Icons.Outlined.Mic,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(orbSize * 0.3f)
                )
            }
        }
    }
}

@Composable
private fun VoiceStatusCopy(state: AuraVoiceUiState, compact: Boolean) {
    if (!compact) {
        Text(
            text = when (state.phase) {
                AuraVoicePhase.Ready, AuraVoicePhase.Listening -> "Start talking"
                AuraVoicePhase.Speaking -> "Aura is responding"
                else -> state.statusText
            },
            style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.SemiBold),
            color = Color.White,
            textAlign = TextAlign.Center
        )
    }
    Spacer(modifier = Modifier.height(8.dp))
    Text(
        text = when {
            !state.isSessionActive -> "Tap the orb to connect"
            state.isMicMuted -> "Microphone muted — tap mic to unmute"
            state.phase == AuraVoicePhase.Speaking -> "Gifts appear below when you ask to browse"
            state.phase == AuraVoicePhase.Listening -> "Ask about hampers, gifts, or your cart"
            else -> state.statusText
        },
        style = MaterialTheme.typography.bodyMedium,
        color = AuraRoseLight.copy(alpha = 0.85f),
        textAlign = TextAlign.Center,
        modifier = Modifier.padding(horizontal = 12.dp)
    )
    state.error?.let { err ->
        Spacer(modifier = Modifier.height(12.dp))
        Text(text = err, style = MaterialTheme.typography.bodySmall, color = EndRed, textAlign = TextAlign.Center)
    }
}

@Composable
private fun VoiceControlsBar(
    state: AuraVoiceUiState,
    onStartSession: () -> Unit,
    onEndSession: () -> Unit,
    onToggleMute: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (state.isSessionActive) {
        Row(
            modifier = modifier.padding(horizontal = 20.dp, vertical = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(
                onClick = onToggleMute,
                modifier = Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = if (state.isMicMuted) 0.22f else 0.12f))
            ) {
                Icon(
                    if (state.isMicMuted) Icons.Outlined.MicOff else Icons.Outlined.Mic,
                    contentDescription = if (state.isMicMuted) "Unmute" else "Mute",
                    tint = if (state.isMicMuted) EndRed else Color.White
                )
            }
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .border(2.dp, EndRed, RoundedCornerShape(50))
                    .clickable { onEndSession() }
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Close, contentDescription = null, tint = EndRed, modifier = Modifier.size(18.dp))
                Text("End", color = EndRed, style = MaterialTheme.typography.labelLarge)
            }
        }
    } else {
        Box(
            modifier = modifier
                .padding(bottom = 28.dp)
                .clip(RoundedCornerShape(50))
                .background(RoseGold)
                .clickable { onStartSession() }
                .padding(horizontal = 28.dp, vertical = 14.dp),
            contentAlignment = Alignment.Center
        ) {
            Text("Connect to Aura AI", color = Color.White, style = MaterialTheme.typography.labelLarge)
        }
    }
}
