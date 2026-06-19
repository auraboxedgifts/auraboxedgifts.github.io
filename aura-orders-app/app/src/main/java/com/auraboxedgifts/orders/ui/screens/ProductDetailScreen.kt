package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.AddShoppingCart
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.auraboxedgifts.orders.ProductDetailUiState
import com.auraboxedgifts.orders.data.formatRupee
import com.auraboxedgifts.orders.ui.components.ProductImage
import com.auraboxedgifts.orders.ui.components.StaggeredFadeIn
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun ProductDetailScreen(
    state: ProductDetailUiState,
    collectionName: (String) -> String,
    isAdminMode: Boolean = false,
    onBack: () -> Unit,
    onAddToCart: (() -> Unit)? = null,
    onEdit: (() -> Unit)? = null,
    onDelete: (() -> Unit)? = null
) {
    var showDeleteDialog by remember { mutableStateOf(false) }

    if (showDeleteDialog && state.product != null) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete product?") },
            text = { Text("This removes \"${state.product.name}\" from your catalog.") },
            confirmButton = {
                TextButton(onClick = {
                    showDeleteDialog = false
                    onDelete?.invoke()
                }) { Text("Delete", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            }
        )
    }

    Scaffold(
        containerColor = Cream,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = state.product?.name ?: "Product",
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1
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
        when {
            state.isLoading || state.isDeleting -> {
                Box(
                    modifier = Modifier.fillMaxSize().padding(padding),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = RoseGold)
                }
            }

            state.error != null -> {
                Box(
                    modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(state.error, color = MaterialTheme.colorScheme.error)
                }
            }

            state.product != null -> {
                val product = state.product
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                ) {
                    StaggeredFadeIn(index = 0, modifier = Modifier.fillMaxWidth()) {
                        ProductImage(
                            imagePath = product.image,
                            contentDescription = product.name,
                            modifier = Modifier.fillMaxWidth().aspectRatio(1f),
                            cornerRadius = 0.dp
                        )
                    }

                    Column(
                        modifier = Modifier.padding(20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        StaggeredFadeIn(index = 1, modifier = Modifier.fillMaxWidth()) {
                            Text(product.name, style = MaterialTheme.typography.headlineMedium, color = TextDark)
                        }
                        StaggeredFadeIn(index = 2, modifier = Modifier.fillMaxWidth()) {
                            Text(collectionName(product.collection), style = MaterialTheme.typography.bodyMedium, color = TextMedium)
                        }
                        StaggeredFadeIn(index = 3, modifier = Modifier.fillMaxWidth()) {
                            Text(
                                formatRupee(product.price),
                                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.SemiBold),
                                color = RoseGold
                            )
                        }

                        if (!product.description.isNullOrBlank()) {
                            StaggeredFadeIn(index = 4, modifier = Modifier.fillMaxWidth()) {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = CardDefaults.cardColors(containerColor = Color.White)
                                ) {
                                    Column(modifier = Modifier.padding(16.dp)) {
                                        Text("Description", style = MaterialTheme.typography.titleMedium, color = TextDark)
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Text(product.description, style = MaterialTheme.typography.bodyMedium)
                                    }
                                }
                            }
                        }

                        if (!product.tags.isNullOrEmpty()) {
                            StaggeredFadeIn(index = 5, modifier = Modifier.fillMaxWidth()) {
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    product.tags.forEach { tag ->
                                        AssistChip(
                                            onClick = {},
                                            enabled = false,
                                            label = { Text(tag) },
                                            colors = AssistChipDefaults.assistChipColors(
                                                disabledContainerColor = RoseGold.copy(alpha = 0.1f),
                                                disabledLabelColor = RoseGold
                                            ),
                                            border = null
                                        )
                                    }
                                }
                            }
                        }

                        StaggeredFadeIn(index = 6, modifier = Modifier.fillMaxWidth()) {
                            if (isAdminMode) {
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    OutlinedButton(
                                        onClick = { onEdit?.invoke() },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(Icons.Outlined.Edit, contentDescription = null, tint = RoseGold)
                                        Text("  Edit", color = RoseGold)
                                    }
                                    OutlinedButton(
                                        onClick = { showDeleteDialog = true },
                                        modifier = Modifier.weight(1f)
                                    ) {
                                        Icon(Icons.Outlined.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error)
                                        Text("  Delete", color = MaterialTheme.colorScheme.error)
                                    }
                                }
                            } else if (onAddToCart != null) {
                                Button(
                                    onClick = onAddToCart,
                                    modifier = Modifier.fillMaxWidth().height(52.dp),
                                    shape = RoundedCornerShape(16.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
                                ) {
                                    Icon(Icons.Outlined.AddShoppingCart, contentDescription = null)
                                    Text("  Add to cart")
                                }
                            }
                        }

                        StaggeredFadeIn(index = 7, modifier = Modifier.fillMaxWidth()) {
                            Text("ID: ${product.id}", style = MaterialTheme.typography.labelMedium, color = TextLight)
                        }
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                }
            }
        }
    }
}
