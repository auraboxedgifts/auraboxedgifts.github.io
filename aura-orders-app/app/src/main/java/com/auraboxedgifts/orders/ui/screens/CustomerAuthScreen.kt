package com.auraboxedgifts.orders.ui.screens

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
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.AuthMode
import com.auraboxedgifts.orders.CustomerAuthUiState
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
    onSendOtp: () -> Unit,
    onSignIn: () -> Unit,
    onSignUp: () -> Unit
) {
    Scaffold(
        containerColor = Cream,
        topBar = {
            TopAppBar(
                title = { Text(if (state.mode == AuthMode.SIGN_IN) "Sign in" else "Sign up") },
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
            Text(
                "Sign in to checkout and track your orders.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextMedium
            )

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

            OutlinedTextField(
                value = state.email,
                onValueChange = onEmailChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Email") },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                colors = authFieldColors()
            )

            if (state.mode == AuthMode.SIGN_IN) {
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
            } else {
                if (state.otpSent) {
                    OutlinedTextField(
                        value = state.otp,
                        onValueChange = onOtpChange,
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("OTP from email") },
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        colors = authFieldColors()
                    )
                } else {
                    OutlinedButton(onClick = onSendOtp, modifier = Modifier.fillMaxWidth()) {
                        Text("Send OTP to email")
                    }
                }
            }

            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            }
            state.successMessage?.let {
                Text(it, color = RoseGold, style = MaterialTheme.typography.bodyMedium)
            }

            Button(
                onClick = { if (state.mode == AuthMode.SIGN_IN) onSignIn() else onSignUp() },
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
                    Text(if (state.mode == AuthMode.SIGN_IN) "Sign in" else "Verify & create account")
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
