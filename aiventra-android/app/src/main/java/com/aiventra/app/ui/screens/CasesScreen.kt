package com.aiventra.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiventra.app.ui.CasesViewModel
import com.aiventra.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CasesScreen(
    onCaseClick: (String) -> Unit,
    onBack: () -> Unit,
    vm: CasesViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()
    var query by remember { mutableStateOf("") }

    val filtered = remember(state.cases, state.filter, query) {
        vm.filteredCases().filter {
            if (query.isBlank()) true
            else listOf(it.caseNumber, it.title, it.location)
                .any { f -> f.contains(query, ignoreCase = true) }
        }
    }

    Scaffold(
        containerColor = Ink950,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Cases · ${filtered.size}",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.5.sp,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back", tint = TextSecondary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Ink900),
            )
        },
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp)) {
            // Search
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                placeholder = { Text("Search by ID, title, location…", fontSize = 13.sp) },
                leadingIcon = { Icon(Icons.Default.Search, null, tint = TextSecondary) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = NeonCyan,
                    unfocusedBorderColor = Ink700,
                    cursorColor = NeonCyan,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                ),
                shape = RoundedCornerShape(10.dp),
            )

            // Filter chips
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("all" to "All", "active" to "Active", "high" to "High+", "critical" to "Critical").forEach { (id, label) ->
                    FilterChip(
                        selected = state.filter == id,
                        onClick = { vm.setFilter(id) },
                        label = { Text(label, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(
                            containerColor = Ink900,
                            labelColor = TextSecondary,
                            selectedContainerColor = NeonCyan.copy(alpha = 0.15f),
                            selectedLabelColor = NeonCyan,
                        ),
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            // Cases list
            if (state.isLoading) {
                Box(Modifier.fillMaxSize(), androidx.compose.ui.Alignment.Center) {
                    CircularProgressIndicator(color = NeonCyan)
                }
            } else if (filtered.isEmpty()) {
                EmptyState(
                    if (query.isNotBlank()) "No cases match '$query'"
                    else "No cases in this filter"
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(items = filtered, key = { it.id }) { c ->
                        CaseRow(c) { onCaseClick(c.id) }
                    }
                    item { Spacer(Modifier.height(12.dp)) }
                }
            }
        }
    }
}
