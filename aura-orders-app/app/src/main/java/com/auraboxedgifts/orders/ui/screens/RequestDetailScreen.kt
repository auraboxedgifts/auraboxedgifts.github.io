package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.RequestDetailUiState
import com.auraboxedgifts.orders.data.RequestStatus
import com.auraboxedgifts.orders.data.displayContact
import com.auraboxedgifts.orders.data.displayEmail
import com.auraboxedgifts.orders.data.displayName
import com.auraboxedgifts.orders.data.displayPhone
import com.auraboxedgifts.orders.formatOrderDate
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.CreamDark
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestDetailScreen(
    state: RequestDetailUiState,
    onBack: () -> Unit,
    onStatusChange: (RequestStatus) -> Unit,
    onDelete: () -> Unit
) {
    var showDeleteDialog by remember { mutableStateOf(false) }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { if (!state.isUpdating) showDeleteDialog = false },
            title = { Text("Delete request?") },
            text = {
                Text(
                    "This permanently removes request ${state.request?.id ?: ""}.",
                    color = TextMedium
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        showDeleteDialog = false
                        onDelete()
                    },
                    enabled = !state.isUpdating,
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("Delete")
                }
            },
            dismissButton = {
                Button(onClick = { showDeleteDialog = false }, enabled = !state.isUpdating) {
                    Text("Cancel")
                }
            }
        )
    }

    Scaffold(
        containerColor = Cream,
        topBar = {
            TopAppBar(
                title = { Text("Request details") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showDeleteDialog = true }, enabled = state.request != null && !state.isUpdating) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Cream,
                    titleContentColor = TextDark
                )
            )
        }
    ) { padding ->
        when {
            state.isLoading -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator(color = RoseGold)
                }
            }

            state.error != null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(state.error, color = TextMedium)
                }
            }

            state.request != null -> {
                val request = state.request
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                request.inquiryType ?: "Inquiry",
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
                                color = RoseGold
                            )
                            Text(
                                "Not paid · via ${request.source?.replace('_', ' ') ?: "Aura AI"}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = TextMedium
                            )
                            Text(
                                formatOrderDate(request.createdAt),
                                style = MaterialTheme.typography.labelMedium,
                                color = TextLight
                            )
                            Text(request.id, style = MaterialTheme.typography.labelMedium, color = TextLight)
                        }
                    }

                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text("Customer", style = MaterialTheme.typography.titleMedium, color = TextDark)
                            Text(request.displayName(), style = MaterialTheme.typography.bodyLarge)
                            if (request.displayPhone().isNotBlank()) {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Outlined.Phone, contentDescription = null, tint = RoseGold)
                                    Text(request.displayPhone(), color = TextMedium)
                                }
                            }
                            if (request.displayEmail().isNotBlank()) {
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Outlined.Email, contentDescription = null, tint = RoseGold)
                                    Text(request.displayEmail(), color = TextMedium)
                                }
                            }
                            if (request.displayPhone().isBlank() && request.displayEmail().isBlank()) {
                                Text(request.displayContact(), color = TextMedium)
                            }
                        }
                    }

                    request.message?.takeIf { it.isNotBlank() }?.let { message ->
                        Card(
                            shape = RoundedCornerShape(18.dp),
                            colors = CardDefaults.cardColors(containerColor = Color.White)
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text("Details", style = MaterialTheme.typography.titleMedium, color = TextDark)
                                Text(message, style = MaterialTheme.typography.bodyMedium, color = TextMedium)
                            }
                        }
                    }

                    request.details?.let { details ->
                        val lines = listOfNotNull(
                            details.occasion?.takeIf { it.isNotBlank() }?.let { "Occasion: $it" },
                            details.recipient?.takeIf { it.isNotBlank() }?.let { "For: $it" },
                            details.budget?.takeIf { it.isNotBlank() }?.let { "Budget: $it" },
                            details.preferences?.takeIf { it.isNotBlank() }?.let { "Preferences: $it" }
                        )
                        if (lines.isNotEmpty()) {
                            Card(
                                shape = RoundedCornerShape(18.dp),
                                colors = CardDefaults.cardColors(containerColor = CreamDark)
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(16.dp),
                                    verticalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    lines.forEach { line ->
                                        Text(line, style = MaterialTheme.typography.bodyMedium, color = TextDark)
                                    }
                                }
                            }
                        }
                    }

                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = Color.White)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text("Status", style = MaterialTheme.typography.titleMedium, color = TextDark)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                RequestStatus.entries.forEach { status ->
                                    FilterChip(
                                        selected = RequestStatus.fromApi(request.status) == status,
                                        onClick = { if (!state.isUpdating) onStatusChange(status) },
                                        enabled = !state.isUpdating,
                                        label = { Text(status.label) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = RoseLight,
                                            selectedLabelColor = RoseGold
                                        )
                                    )
                                }
                            }
                            if (state.isUpdating) {
                                CircularProgressIndicator(color = RoseGold, modifier = Modifier.height(24.dp))
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}
