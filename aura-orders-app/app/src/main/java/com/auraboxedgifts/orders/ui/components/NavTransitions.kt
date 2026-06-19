package com.auraboxedgifts.orders.ui.components

import androidx.compose.animation.AnimatedContentScope
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.runtime.Composable
import androidx.navigation.NamedNavArgument
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavGraphBuilder
import androidx.navigation.compose.composable

fun slideInFromRight(): EnterTransition =
    slideInHorizontally(
        initialOffsetX = { it },
        animationSpec = AuraMotion.smoothTween()
    ) + fadeIn(AuraMotion.smoothTween())

fun slideOutToRight(): ExitTransition =
    slideOutHorizontally(
        targetOffsetX = { it },
        animationSpec = tween(AuraMotion.PAGE_MS - 40)
    ) + fadeOut(tween(AuraMotion.PAGE_MS - 40))

fun slideInFromBottom(): EnterTransition =
    slideInHorizontally(
        initialOffsetX = { it / 3 },
        animationSpec = AuraMotion.smoothTween()
    ) + fadeIn(AuraMotion.smoothTween()) +
    scaleIn(initialScale = 0.94f, animationSpec = AuraMotion.smoothTween())

fun slideOutToBottom(): ExitTransition =
    slideOutHorizontally(
        targetOffsetX = { it / 3 },
        animationSpec = tween(AuraMotion.PAGE_MS - 40)
    ) + fadeOut(tween(AuraMotion.PAGE_MS - 40)) +
    scaleOut(targetScale = 0.94f, animationSpec = tween(AuraMotion.PAGE_MS - 40))

fun popEnter(): EnterTransition =
    fadeIn(AuraMotion.smoothTween()) +
    slideInHorizontally(
        initialOffsetX = { -it / 4 },
        animationSpec = AuraMotion.smoothTween()
    )

fun popExit(): ExitTransition =
    fadeOut(tween(AuraMotion.PAGE_MS - 40)) +
    slideOutHorizontally(
        targetOffsetX = { it },
        animationSpec = tween(AuraMotion.PAGE_MS - 40)
    )

fun fadeEnter(): EnterTransition = fadeIn(AuraMotion.smoothTween(280))

fun fadeExit(): ExitTransition = fadeOut(AuraMotion.smoothTween(220))

fun AnimatedContentTransitionScope<NavBackStackEntry>.defaultEnter(): EnterTransition =
    slideInFromRight()

fun AnimatedContentTransitionScope<NavBackStackEntry>.defaultExit(): ExitTransition =
    slideOutToRight()

fun AnimatedContentTransitionScope<NavBackStackEntry>.defaultPopEnter(): EnterTransition =
    popEnter()

fun AnimatedContentTransitionScope<NavBackStackEntry>.defaultPopExit(): ExitTransition =
    popExit()

fun NavGraphBuilder.auraComposable(
    route: String,
    arguments: List<NamedNavArgument> = emptyList(),
    enterTransition: (AnimatedContentTransitionScope<NavBackStackEntry>.() -> EnterTransition)? = { slideInFromRight() },
    exitTransition: (AnimatedContentTransitionScope<NavBackStackEntry>.() -> ExitTransition)? = { slideOutToRight() },
    popEnterTransition: (AnimatedContentTransitionScope<NavBackStackEntry>.() -> EnterTransition)? = { popEnter() },
    popExitTransition: (AnimatedContentTransitionScope<NavBackStackEntry>.() -> ExitTransition)? = { popExit() },
    content: @Composable AnimatedContentScope.(NavBackStackEntry) -> Unit
) {
    composable(
        route = route,
        arguments = arguments,
        enterTransition = enterTransition,
        exitTransition = exitTransition,
        popEnterTransition = popEnterTransition,
        popExitTransition = popExitTransition,
        content = content
    )
}
