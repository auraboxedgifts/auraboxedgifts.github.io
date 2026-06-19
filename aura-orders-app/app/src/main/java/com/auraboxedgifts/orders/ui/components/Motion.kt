package com.auraboxedgifts.orders.ui.components

import android.os.Build
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.draw.blur
import com.auraboxedgifts.orders.ui.theme.CreamDark
import com.auraboxedgifts.orders.ui.theme.RoseLight

object AuraMotion {
    const val STAGGER_MS = 45
    const val PAGE_MS = 340

    fun <T> gentleSpring() = spring<T>(
        dampingRatio = Spring.DampingRatioLowBouncy,
        stiffness = Spring.StiffnessMediumLow
    )

    fun <T> smoothTween(duration: Int = PAGE_MS) = tween<T>(
        durationMillis = duration,
        easing = FastOutSlowInEasing
    )
}

@Composable
fun Modifier.drawerBackdropEffect(progress: Float): Modifier {
    val blurRadius by animateDpAsState(
        targetValue = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (10f * progress).dp
        } else {
            0.dp
        },
        animationSpec = AuraMotion.smoothTween(),
        label = "drawerBlur"
    )
    val scale by animateFloatAsState(
        targetValue = 1f - 0.05f * progress,
        animationSpec = AuraMotion.smoothTween(),
        label = "drawerScale"
    )
    val offsetX by animateFloatAsState(
        targetValue = 28f * progress,
        animationSpec = AuraMotion.smoothTween(),
        label = "drawerOffset"
    )
    return this
        .graphicsLayer {
            scaleX = scale
            scaleY = scale
            translationX = offsetX
            alpha = 1f - 0.08f * progress
        }
        .then(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && blurRadius > 0.dp) {
                Modifier.blur(blurRadius)
            } else {
                Modifier
            }
        )
}

@Composable
fun AnimatedCartBadge(count: Int, content: @Composable () -> Unit) {
    AnimatedVisibility(
        visible = count > 0,
        enter = scaleIn(AuraMotion.gentleSpring()) + fadeIn(AuraMotion.smoothTween(220)),
        exit = scaleOut(AuraMotion.smoothTween(180)) + fadeOut(AuraMotion.smoothTween(180))
    ) {
        val pulse by animateFloatAsState(
            targetValue = 1f,
            animationSpec = AuraMotion.gentleSpring(),
            label = "cartPulse"
        )
        Box(modifier = Modifier.scale(pulse)) {
            content()
        }
    }
}

@Composable
fun StaggeredFadeIn(
    index: Int,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    var visible by remember { mutableStateOf(false) }
    androidx.compose.runtime.LaunchedEffect(Unit) {
        kotlinx.coroutines.delay((index * AuraMotion.STAGGER_MS).toLong())
        visible = true
    }
    AnimatedVisibility(
        visible = visible,
        modifier = modifier,
        enter = fadeIn(AuraMotion.smoothTween(380)) +
            slideInVertically(
                animationSpec = AuraMotion.smoothTween(380),
                initialOffsetY = { it / 5 }
            )
    ) {
        Box(content = content)
    }
}

@Composable
fun PressableScale(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable BoxScope.() -> Unit
) {
    var pressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.96f else 1f,
        animationSpec = AuraMotion.gentleSpring(),
        label = "pressScale"
    )
    Box(
        modifier = modifier
            .scale(scale)
            .pointerInput(onClick) {
                detectTapGestures(
                    onPress = {
                        pressed = true
                        tryAwaitRelease()
                        pressed = false
                    },
                    onTap = { onClick() }
                )
            },
        content = content
    )
}

@Composable
fun ShimmerBox(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val offset by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(1100, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmerOffset"
    )
    Box(
        modifier = modifier.background(
            Brush.linearGradient(
                colors = listOf(
                    CreamDark,
                    RoseLight.copy(alpha = 0.55f),
                    CreamDark
                ),
                start = androidx.compose.ui.geometry.Offset(offset - 400f, 0f),
                end = androidx.compose.ui.geometry.Offset(offset, 200f)
            )
        )
    )
}

fun Modifier.shimmerPlaceholder(visible: Boolean, cornerRadius: Dp = 16.dp): Modifier = composed {
    if (visible) {
        clip(androidx.compose.foundation.shape.RoundedCornerShape(cornerRadius))
            .then(Modifier)
    } else {
        this
    }
}
