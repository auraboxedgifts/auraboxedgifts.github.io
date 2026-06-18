package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.CheckoutUiState
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight
import com.auraboxedgifts.orders.ui.theme.SuccessGreen
import com.auraboxedgifts.orders.ui.theme.TextMedium

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    state: CheckoutUiState,
    cartTotal: Double,
    onBack: () -> Unit,
    onNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onAddressChange: (String) -> Unit,
    onCityChange: (String) -> Unit,
    onStateChange: (String) -> Unit,
    onPincodeChange: (String) -> Unit,
    onPay: () -> Unit,
    onDone: () -> Unit
) {
    Scaffold(
        containerColor = Cream,
        topBar = {
            TopAppBar(
                title = { Text("Checkout") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Cream)
            )
        }
    ) { padding ->
        if (state.orderComplete != null) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally
            ) {
                Text("Order placed!", style = MaterialTheme.typography.headlineMedium, color = SuccessGreen)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Thank you for shopping with Aura Boxed Gift.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextMedium
                )
                Spacer(modifier = Modifier.height(24.dp))
                Button(
                    onClick = onDone,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
                ) {
                    Text("Continue shopping")
                }
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Color.White)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Order total", style = MaterialTheme.typography.labelMedium, color = TextMedium)
                    Text(
                        formatRupee(cartTotal),
                        style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.SemiBold),
                        color = RoseGold
                    )
                }
            }

            Text("Delivery details", style = MaterialTheme.typography.titleMedium)

            checkoutField("Full name", state.info.name, onNameChange)
            checkoutField("Phone", state.info.phone, onPhoneChange)
            checkoutField("Address", state.info.address, onAddressChange)
            checkoutField("City", state.info.city, onCityChange)
            checkoutField("State", state.info.state, onStateChange)
            checkoutField("Pincode", state.info.pincode, onPincodeChange)

            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            }

            Button(
                onClick = onPay,
                enabled = !state.isProcessing,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
            ) {
                if (state.isProcessing) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.height(22.dp))
                } else {
                    Text("Pay with Razorpay")
                }
            }
        }
    }
}

@Composable
private fun checkoutField(label: String, value: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(label) },
        singleLine = true,
        shape = RoundedCornerShape(16.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = RoseGold,
            unfocusedBorderColor = RoseLight,
            focusedContainerColor = Color.White,
            unfocusedContainerColor = Color.White
        )
    )
}
