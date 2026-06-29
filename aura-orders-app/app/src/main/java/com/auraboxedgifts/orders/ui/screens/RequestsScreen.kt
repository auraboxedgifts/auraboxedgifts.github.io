package com.auraboxedgifts.orders.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.ExperimentalMaterialApi
import androidx.compose.material.pullrefresh.PullRefreshIndicator
import androidx.compose.material.pullrefresh.pullRefresh
import androidx.compose.material.pullrefresh.rememberPullRefreshState
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.auraboxedgifts.orders.RequestFilter
import com.auraboxedgifts.orders.RequestsUiState
import com.auraboxedgifts.orders.data.CustomerRequest
import com.auraboxedgifts.orders.data.RequestStatus
import com.auraboxedgifts.orders.data.displayContact
import com.auraboxedgifts.orders.data.displayName
import com.auraboxedgifts.orders.formatOrderDate
import com.auraboxedgifts.orders.ui.theme.Cream
import com.auraboxedgifts.orders.ui.theme.RoseGold
import com.auraboxedgifts.orders.ui.theme.RoseLight
import com.auraboxedgifts.orders.ui.theme.SuccessGreen
import com.auraboxedgifts.orders.ui.theme.TextDark
import com.auraboxedgifts.orders.ui.theme.TextLight
import com.auraboxedgifts.orders.ui.theme.TextMedium
import com.auraboxedgifts.orders.ui.theme.WarningAmber

@OptIn(ExperimentalMaterialApi::class)
@Composable
fun RequestsScreen(
    modifier: Modifier = Modifier,
    state: RequestsUiState,
    filteredRequests: List<CustomerRequest>,
    onRefresh: () -> Unit,
    onFilterChange: (RequestFilter) -> Unit,
    onRequestClick: (String) -> Unit
) {
    val pullRefreshState = rememberPullRefreshState(
        refreshing = state.isRefreshing,
        onRefresh = onRefresh
    )

    Scaffold(
        modifier = modifier,
        containerColor = Cream
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .pullRefresh(pullRefreshState)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "Requests (Not Paid)",
                        style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.SemiBold),
                        color = TextDark
                    )
                    Text(
                        text = "Gift and hamper inquiries from Aura AI on the website or app",
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextMedium
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    RequestFilter.entries.forEach { filter ->
                        FilterChip(
                            selected = state.filter == filter,
                            onClick = { onFilterChange(filter) },
                            label = { Text(filter.label) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = RoseLight,
                                selectedLabelColor = RoseGold
                            )
                        )
                    }
                }

                when {
                    state.isLoading -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator(color = RoseGold)
                        }
                    }

                    state.error != null -> {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 24.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    state.error,
                                    style = MaterialTheme.typography.bodyLarge,
                                    color = TextMedium
                                )
                                Text(
                                    "Pull down to refresh",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = TextLight
                                )
                            }
                        }
                    }

                    filteredRequests.isEmpty() -> {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                if (state.requests.isEmpty()) "No Requests atm" else "No requests match this filter",
                                style = MaterialTheme.typography.bodyLarge,
                                color = TextLight
                            )
                        }
                    }

                    else -> {
                        LazyColumn(
                            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(filteredRequests, key = { it.id }) { request ->
                                RequestCard(
                                    request = request,
                                    onClick = { onRequestClick(request.id) }
                                )
                            }
                        }
                    }
                }
            }

            PullRefreshIndicator(
                refreshing = state.isRefreshing,
                state = pullRefreshState,
                modifier = Modifier.align(Alignment.TopCenter),
                contentColor = RoseGold
            )
        }
    }
}

@Composable
private fun RequestCard(
    request: CustomerRequest,
    onClick: () -> Unit
) {
    val status = RequestStatus.fromApi(request.status)
    val statusColor = when (status) {
        RequestStatus.OPEN -> WarningAmber
        RequestStatus.CONTACTED -> RoseGold
        RequestStatus.CONVERTED -> SuccessGreen
        RequestStatus.CLOSED -> TextLight
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = request.displayName(),
                        style = MaterialTheme.typography.titleMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Text(
                        text = request.displayContact(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = TextMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                AssistChip(
                    onClick = {},
                    enabled = false,
                    label = { Text(status.label, style = MaterialTheme.typography.labelMedium) },
                    colors = AssistChipDefaults.assistChipColors(
                        disabledContainerColor = statusColor.copy(alpha = 0.12f),
                        disabledLabelColor = statusColor
                    ),
                    border = null
                )
            }

            Text(
                text = request.inquiryType ?: "Inquiry",
                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                color = RoseGold
            )

            request.message?.takeIf { it.isNotBlank() }?.let { message ->
                Text(
                    text = message.lines().first(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = TextDark,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }

            Text(
                text = formatOrderDate(request.createdAt),
                style = MaterialTheme.typography.labelMedium,
                color = TextLight
            )
        }
    }
}
