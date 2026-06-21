package com.auraboxedgifts.orders.ui.screens

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.AuthMode
import com.auraboxedgifts.orders.CustomerAuthUiState
import com.auraboxedgifts.orders.ui.components.AuraMotion
import com.auraboxedgifts.orders.ui.components.StaggeredFadeIn
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight
import com.auraboxedgifts.orders.ui.theme.TextMedium

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CustomerAuthScreen(
    state: CustomerAuthUiState,
    onBack: () -> Unit,
    onModeChange: (AuthMode) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onOtpChange: (String) -> Unit,
    onNameChange: (String) -> Unit,
    onSendOtp: () -> Unit,
    onSignIn: () -> Unit,
    onSignUp: () -> Unit,
    onResetPassword: () -> Unit
) {
    Scaffold(
        containerColor = Cream,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        when (state.mode) {
                            AuthMode.SIGN_IN -> "Sign in"
                            AuthMode.SIGN_UP -> "Sign up"
                            AuthMode.FORGOT_PASSWORD -> "Reset Password"
                        }
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Cream)
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            StaggeredFadeIn(index = 0, modifier = Modifier.fillMaxWidth()) {
                Text(
                    when (state.mode) {
                        AuthMode.SIGN_IN -> "Sign in to checkout and track your orders."
                        AuthMode.SIGN_UP -> "Create an account to track orders and save your information."
                        AuthMode.FORGOT_PASSWORD -> "Verify your email and set a new password."
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMedium
                )
            }

            StaggeredFadeIn(index = 1, modifier = Modifier.fillMaxWidth()) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(
                        selected = state.mode == AuthMode.SIGN_IN,
                        onClick = { onModeChange(AuthMode.SIGN_IN) },
                        label = { Text("Sign in") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = RoseGold.copy(alpha = 0.15f),
                            selectedLabelColor = RoseGold
                        )
                    )
                    FilterChip(
                        selected = state.mode == AuthMode.SIGN_UP,
                        onClick = { onModeChange(AuthMode.SIGN_UP) },
                        label = { Text("Sign up") },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = RoseGold.copy(alpha = 0.15f),
                            selectedLabelColor = RoseGold
                        )
                    )
                }
            }

            StaggeredFadeIn(index = 2, modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = state.email,
                    onValueChange = onEmailChange,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Email") },
                    singleLine = true,
                    enabled = !state.otpSent,
                    shape = RoundedCornerShape(16.dp),
                    colors = authFieldColors()
                )
            }

            AnimatedContent(
                targetState = state.mode,
                transitionSpec = {
                    fadeIn(AuraMotion.smoothTween(220)) togetherWith fadeOut(AuraMotion.smoothTween(180))
                },
                label = "authModeFields"
            ) { mode ->
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    if (mode == AuthMode.SIGN_IN) {
                        OutlinedTextField(
                            value = state.password,
                            onValueChange = onPasswordChange,
                            modifier = Modifier.fillMaxWidth(),
                            label = { Text("Password") },
                            singleLine = true,
                            visualTransformation = PasswordVisualTransformation(),
                            shape = RoundedCornerShape(16.dp),
                            colors = authFieldColors()
                        )
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            TextButton(
                                onClick = { onModeChange(AuthMode.FORGOT_PASSWORD) }
                            ) {
                                Text("Forgot password?", color = RoseGold)
                            }
                        }
                    } else if (mode == AuthMode.SIGN_UP) {
                        if (!state.otpSent && !state.isOtpVerified) {
                            OutlinedButton(
                                onClick = onSendOtp,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = RoseGold),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                if (state.isLoading) {
                                    CircularProgressIndicator(color = RoseGold, modifier = Modifier.height(20.dp))
                                } else {
                                    Text("Send OTP to email")
                                }
                            }
                        } else if (state.otpSent && !state.isOtpVerified) {
                            OutlinedTextField(
                                value = state.otp,
                                onValueChange = onOtpChange,
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("OTP from email") },
                                singleLine = true,
                                shape = RoundedCornerShape(16.dp),
                                colors = authFieldColors()
                            )
                        } else if (state.isOtpVerified) {
                            OutlinedTextField(
                                value = state.name,
                                onValueChange = onNameChange,
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("Full Name") },
                                singleLine = true,
                                shape = RoundedCornerShape(16.dp),
                                colors = authFieldColors()
                            )
                            OutlinedTextField(
                                value = state.password,
                                onValueChange = onPasswordChange,
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("Create Password") },
                                singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                shape = RoundedCornerShape(16.dp),
                                colors = authFieldColors()
                            )
                        }
                    } else if (mode == AuthMode.FORGOT_PASSWORD) {
                        if (!state.otpSent) {
                            OutlinedButton(
                                onClick = onSendOtp,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.outlinedButtonColors(contentColor = RoseGold),
                                shape = RoundedCornerShape(16.dp)
                            ) {
                                if (state.isLoading) {
                                    CircularProgressIndicator(color = RoseGold, modifier = Modifier.height(20.dp))
                                } else {
                                    Text("Send OTP to email")
                                }
                            }
                        } else {
                            OutlinedTextField(
                                value = state.otp,
                                onValueChange = onOtpChange,
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("OTP from email") },
                                singleLine = true,
                                shape = RoundedCornerShape(16.dp),
                                colors = authFieldColors()
                            )
                            OutlinedTextField(
                                value = state.password,
                                onValueChange = onPasswordChange,
                                modifier = Modifier.fillMaxWidth(),
                                label = { Text("New Password") },
                                singleLine = true,
                                visualTransformation = PasswordVisualTransformation(),
                                shape = RoundedCornerShape(16.dp),
                                colors = authFieldColors()
                            )
                        }
                    }
                }
            }

            AnimatedVisibility(visible = state.error != null) {
                state.error?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                }
            }
            AnimatedVisibility(visible = state.successMessage != null) {
                state.successMessage?.let {
                    Text(it, color = RoseGold, style = MaterialTheme.typography.bodyMedium)
                }
            }

            val isMainButtonVisible = when (state.mode) {
                AuthMode.SIGN_IN -> true
                AuthMode.SIGN_UP -> state.otpSent || state.isOtpVerified
                AuthMode.FORGOT_PASSWORD -> state.otpSent
            }

            AnimatedVisibility(visible = isMainButtonVisible, modifier = Modifier.fillMaxWidth()) {
                Button(
                    onClick = {
                        when (state.mode) {
                            AuthMode.SIGN_IN -> onSignIn()
                            AuthMode.SIGN_UP -> onSignUp()
                            AuthMode.FORGOT_PASSWORD -> onResetPassword()
                        }
                    },
                    enabled = !state.isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(color = Color.White, modifier = Modifier.height(22.dp))
                    } else {
                        val text = when (state.mode) {
                            AuthMode.SIGN_IN -> "Sign in"
                            AuthMode.SIGN_UP -> if (state.isOtpVerified) "Complete Registration" else "Verify OTP"
                            AuthMode.FORGOT_PASSWORD -> "Reset Password"
                        }
                        Text(text)
                    }
                }
            }
        }
    }
}

@Composable
private fun authFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = RoseGold,
    unfocusedBorderColor = RoseLight,
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color.White
)
