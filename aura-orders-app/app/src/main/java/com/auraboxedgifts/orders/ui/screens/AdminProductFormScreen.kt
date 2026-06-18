package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.ProductFormUiState
import com.auraboxedgifts.orders.data.Collection
import com.auraboxedgifts.orders.ui.components.ProductImage
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminProductFormScreen(
    state: ProductFormUiState,
    collections: List<Collection>,
    onBack: () -> Unit,
    onNameChange: (String) -> Unit,
    onCollectionChange: (String) -> Unit,
    onPriceChange: (String) -> Unit,
    onImageChange: (String) -> Unit,
    onDescriptionChange: (String) -> Unit,
    onTagsChange: (String) -> Unit,
    onPickImage: () -> Unit,
    onSave: () -> Unit
) {
    var collectionExpanded by remember { mutableStateOf(false) }
    val selectedCollectionName = collections.find { it.slug == state.collection }?.name ?: state.collection

    Scaffold(
        containerColor = Cream,
        topBar = {
            TopAppBar(
                title = { Text(if (state.productId == null) "Add product" else "Edit product") },
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
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (state.image.isNotBlank()) {
                ProductImage(
                    imagePath = state.image,
                    contentDescription = state.name,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp),
                    cornerRadius = 16.dp
                )
            }

            OutlinedButton(onClick = onPickImage, modifier = Modifier.fillMaxWidth()) {
                if (state.isUploading) {
                    CircularProgressIndicator(modifier = Modifier.size(18.dp), color = RoseGold, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Outlined.Image, contentDescription = null, tint = RoseGold)
                    Text("  Upload image")
                }
            }

            formField("Product name", state.name, onNameChange)

            ExposedDropdownMenuBox(
                expanded = collectionExpanded,
                onExpandedChange = { collectionExpanded = it }
            ) {
                OutlinedTextField(
                    value = selectedCollectionName,
                    onValueChange = {},
                    readOnly = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(),
                    label = { Text("Collection") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = collectionExpanded) },
                    shape = RoundedCornerShape(16.dp),
                    colors = formFieldColors()
                )
                ExposedDropdownMenu(
                    expanded = collectionExpanded,
                    onDismissRequest = { collectionExpanded = false }
                ) {
                    collections.forEach { collection ->
                        DropdownMenuItem(
                            text = { Text(collection.name) },
                            onClick = {
                                onCollectionChange(collection.slug)
                                collectionExpanded = false
                            }
                        )
                    }
                }
            }

            formField("Price (₹)", state.price, onPriceChange)
            formField("Image URL", state.image, onImageChange)
            formField("Description", state.description, onDescriptionChange, singleLine = false)
            formField("Tags (comma separated)", state.tags, onTagsChange)

            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
            }

            Button(
                onClick = onSave,
                enabled = !state.isLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = RoseGold)
            ) {
                if (state.isLoading) {
                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                } else {
                    Text("Save product")
                }
            }
        }
    }
}

@Composable
private fun formField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    singleLine: Boolean = true
) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        modifier = Modifier.fillMaxWidth(),
        label = { Text(label) },
        singleLine = singleLine,
        minLines = if (singleLine) 1 else 3,
        shape = RoundedCornerShape(16.dp),
        colors = formFieldColors()
    )
}

@Composable
private fun formFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = RoseGold,
    unfocusedBorderColor = RoseLight,
    focusedContainerColor = Color.White,
    unfocusedContainerColor = Color.White
)
