package com.auraboxedgifts.orders.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.CheckoutUiState
import com.auraboxedgifts.orders.data.IndianLocations
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.orderItemCount
import com.auraboxedgifts.orders.ui.components.AuraMotion
import com.auraboxedgifts.orders.ui.components.StaggeredFadeIn
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight
import com.auraboxedgifts.orders.ui.theme.SuccessGreen
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextMedium

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutScreen(
    state: CheckoutUiState,
    cartTotal: Double,
    mapsEnabled: Boolean = false,
    onBack: () -> Unit,
    onNameChange: (String) -> Unit,
    onPhoneChange: (String) -> Unit,
    onAddressChange: (String) -> Unit,
    onCityChange: (String) -> Unit,
    onStateChange: (String) -> Unit,
    onPincodeChange: (String) -> Unit,
    onSearchAddress: () -> Unit = {},
    onPay: () -> Unit,
    onDone: () -> Unit
) {
    var stateExpanded by remember { mutableStateOf(false) }
    var cityExpanded by remember { mutableStateOf(false) }
    val cityOptions = remember(state.info.state) { IndianLocations.citiesForState(state.info.state) }

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
            AnimatedVisibility(
                visible = true,
                enter = fadeIn(AuraMotion.smoothTween()) + scaleIn(
                    initialScale = 0.92f,
                    animationSpec = AuraMotion.gentleSpring()
                )
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .navigationBarsPadding()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text("Order placed!", style = MaterialTheme.typography.headlineMedium, color = SuccessGreen)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Thank you for shopping with Aura Boxed Gift.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextMedium
                    )
                    state.orderComplete?.let { order ->
                        Spacer(modifier = Modifier.height(12.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("Order ${order.id}", style = MaterialTheme.typography.titleMedium, color = TextDark)
                                Text(
                                    "${orderItemCount(order)} item(s) · ${formatRupee(order.cart?.grandTotal ?: cartTotal)}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = TextMedium
                                )
                                Text(
                                    "Confirmation email sent. You can track this order from My account.",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = TextMedium
                                )
                            }
                        }
                    }
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
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .navigationBarsPadding()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            StaggeredFadeIn(index = 0, modifier = Modifier.fillMaxWidth()) {
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
            }

            StaggeredFadeIn(index = 1, modifier = Modifier.fillMaxWidth()) {
                Text("Delivery details", style = MaterialTheme.typography.titleMedium)
            }

            StaggeredFadeIn(index = 2, modifier = Modifier.fillMaxWidth()) {
                checkoutField("Full name", state.info.name, onNameChange)
            }

            StaggeredFadeIn(index = 3, modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = "+91",
                        onValueChange = {},
                        readOnly = true,
                        enabled = false,
                        modifier = Modifier.width(72.dp),
                        singleLine = true,
                        shape = RoundedCornerShape(16.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            disabledBorderColor = RoseLight,
                            disabledContainerColor = Color.White,
                            disabledTextColor = TextDark
                        )
                    )
                    OutlinedTextField(
                        value = state.info.phone,
                        onValueChange = { raw ->
                            onPhoneChange(raw.filter { it.isDigit() }.take(10))
                        },
                        modifier = Modifier.weight(1f),
                        label = { Text("Mobile number") },
                        placeholder = { Text("10-digit number") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                        shape = RoundedCornerShape(16.dp),
                        colors = fieldColors()
                    )
                }
            }

            StaggeredFadeIn(index = 4, modifier = Modifier.fillMaxWidth()) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    checkoutField("Address", state.info.address, onAddressChange)
                    if (mapsEnabled) {
                        OutlinedButton(
                            onClick = onSearchAddress,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp)
                        ) {
                            Icon(Icons.Outlined.LocationOn, contentDescription = null, tint = RoseGold)
                            Text("  Search address with Google Maps", color = RoseGold)
                        }
                    }
                }
            }

            StaggeredFadeIn(index = 5, modifier = Modifier.fillMaxWidth()) {
                ExposedDropdownMenuBox(
                    expanded = stateExpanded,
                    onExpandedChange = { stateExpanded = it }
                ) {
                    OutlinedTextField(
                        value = state.info.state,
                        onValueChange = {},
                        readOnly = true,
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor(),
                        label = { Text("State") },
                        placeholder = { Text("Select state") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = stateExpanded) },
                        shape = RoundedCornerShape(16.dp),
                        colors = fieldColors()
                    )
                    ExposedDropdownMenu(
                        expanded = stateExpanded,
                        onDismissRequest = { stateExpanded = false }
                    ) {
                        IndianLocations.states.forEach { option ->
                            DropdownMenuItem(
                                text = { Text(option) },
                                onClick = {
                                    onStateChange(option)
                                    onCityChange("")
                                    stateExpanded = false
                                }
                            )
                        }
                    }
                }
            }

            StaggeredFadeIn(index = 6, modifier = Modifier.fillMaxWidth()) {
                if (cityOptions.isNotEmpty()) {
                    ExposedDropdownMenuBox(
                        expanded = cityExpanded,
                        onExpandedChange = { cityExpanded = it }
                    ) {
                        OutlinedTextField(
                            value = state.info.city,
                            onValueChange = {},
                            readOnly = true,
                            enabled = state.info.state.isNotBlank(),
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor(),
                            label = { Text("City") },
                            placeholder = { Text(if (state.info.state.isBlank()) "Select state first" else "Select city") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = cityExpanded) },
                            shape = RoundedCornerShape(16.dp),
                            colors = fieldColors()
                        )
                        ExposedDropdownMenu(
                            expanded = cityExpanded,
                            onDismissRequest = { cityExpanded = false }
                        ) {
                            cityOptions.forEach { option ->
                                DropdownMenuItem(
                                    text = { Text(option) },
                                    onClick = {
                                        onCityChange(option)
                                        cityExpanded = false
                                    }
                                )
                            }
                        }
                    }
                } else {
                    checkoutField("City", state.info.city, onCityChange)
                }
            }

            StaggeredFadeIn(index = 7, modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = state.info.pincode,
                    onValueChange = { onPincodeChange(it.filter { ch -> ch.isDigit() }.take(6)) },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Pincode") },
                    placeholder = { Text("6-digit PIN") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    shape = RoundedCornerShape(16.dp),
                    colors = fieldColors()
                )
            }

            AnimatedVisibility(visible = state.error != null) {
                state.error?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                }
            }

            StaggeredFadeIn(index = 8, modifier = Modifier.fillMaxWidth()) {
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
}

@Composable
private fun checkoutField(label: String, value: String, onChange: (String) -> Unit) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(label) },
        singleLine = label != "Address",
        maxLines = if (label == "Address") 3 else 1,
        shape = RoundedCornerShape(16.dp),
        colors = fieldColors()
    )
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = RoseGold,
    unfocusedBorderColor = RoseLight,
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color.White
)
