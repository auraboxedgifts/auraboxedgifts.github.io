package com.auraboxedgifts.orders.ui.screens

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.outlined.Mic
import androidx.compose.material.icons.outlined.MicOff
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.AuraVoicePhase
import com.auraboxedgifts.orders.AuraVoiceUiState
import com.auraboxedgifts.orders.ui.theme.RoseGold

private val AuraDark = Color(0xFF2A1F1A)
private val AuraDarkMid = Color(0xFF3A2A1F)
private val AuraRose = Color(0xFFB76E79)
private val AuraRoseLight = Color(0xFFD4919B)
private val AuraGold = Color(0xFFC9A96E)
private val EndRed = Color(0xFFFF6B6B)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AuraAiScreen(
    state: AuraVoiceUiState,
    onBack: () -> Unit,
    onStartSession: () -> Unit,
    onEndSession: () -> Unit,
    onToggleMute: () -> Unit
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

    Scaffold(
        containerColor = AuraDark,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Aura Voice AI",
                        color = Color.White,
                        style = MaterialTheme.typography.titleLarge
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = Color.White)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = AuraDark)
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Brush.verticalGradient(listOf(AuraDark, AuraDarkMid, AuraDark)))
                .navigationBarsPadding()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(220.dp)
                        .clickable(enabled = !state.isSessionActive) { onStartSession() },
                    contentAlignment = Alignment.Center
                ) {
                    if (state.phase == AuraVoicePhase.Listening || state.phase == AuraVoicePhase.Speaking) {
                        Box(
                            modifier = Modifier
                                .size(200.dp)
                                .scale(orbScale * 1.08f)
                                .clip(CircleShape)
                                .background(AuraRose.copy(alpha = 0.15f))
                        )
                    }
                    Box(
                        modifier = Modifier
                            .size(140.dp)
                            .scale(orbScale)
                            .clip(CircleShape)
                            .background(orbBrush)
                            .border(2.dp, AuraRoseLight.copy(alpha = 0.45f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Box(
                            modifier = Modifier
                                .size(96.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.18f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                if (state.isMicMuted) Icons.Outlined.MicOff else Icons.Outlined.Mic,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(42.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(28.dp))

                Text(
                    text = state.statusText,
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.SemiBold),
                    color = Color.White,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = when {
                        !state.isSessionActive -> "Tap the orb to start a voice conversation"
                        state.isMicMuted -> "Microphone is muted — tap mic to unmute"
                        state.phase == AuraVoicePhase.Speaking -> "Aura is responding…"
                        state.phase == AuraVoicePhase.Listening -> "Speak naturally about gifts & hampers"
                        state.phase == AuraVoicePhase.Connecting -> "Connecting to Gemini Live 3.1…"
                        else -> "Powered by Gemini Live on aura.devshubh.me"
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = AuraRoseLight.copy(alpha = 0.85f),
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 12.dp)
                )

                state.error?.let { err ->
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = err,
                        style = MaterialTheme.typography.bodySmall,
                        color = EndRed,
                        textAlign = TextAlign.Center
                    )
                }
            }

            if (state.isSessionActive) {
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 24.dp),
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
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 32.dp)
                        .clip(RoundedCornerShape(50))
                        .background(RoseGold)
                        .clickable { onStartSession() }
                        .padding(horizontal = 28.dp, vertical = 14.dp)
                ) {
                    Text("Start voice session", color = Color.White, style = MaterialTheme.typography.labelLarge)
                }
            }
        }
    }
}
