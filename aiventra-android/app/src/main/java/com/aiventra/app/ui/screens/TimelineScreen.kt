package com.aiventra.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiventra.app.data.model.TimelineEvent
import com.aiventra.app.ui.AnalysisViewModel
import com.aiventra.app.ui.components.SectionCard
import com.aiventra.app.ui.components.ThreatBadge
import com.aiventra.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TimelineScreen(
    caseId: String,
    onBack: () -> Unit,
    vm: AnalysisViewModel = hiltViewModel(),
) {
    val state by vm.timeline.collectAsState()

    LaunchedEffect(caseId) { vm.loadTimeline(caseId) }

    Scaffold(
        containerColor = Ink950,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Timeline", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Text(
                            "${state.events.size} events · case ${caseId.take(8)}",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            color = TextSecondary,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back", tint = TextSecondary) }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Ink900),
            )
        },
    ) { padding ->
        if (state.isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = NeonCyan)
            }
            return@Scaffold
        }

        if (state.error != null) {
            Box(Modifier.fillMaxSize().padding(padding).padding(16.dp), Alignment.TopCenter) {
                ErrorBanner(state.error ?: "")
            }
            return@Scaffold
        }

        if (state.events.isEmpty()) {
            Box(Modifier.fillMaxSize().padding(padding).padding(16.dp), Alignment.Center) {
                EmptyState("Timeline data not yet generated for this case.")
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item { Spacer(Modifier.height(8.dp)) }
            items(items = state.events, key = { it.id }) { event ->
                TimelineEntry(event)
            }
            item { Spacer(Modifier.height(16.dp)) }
        }
    }
}

@Composable
private fun TimelineEntry(event: TimelineEvent) {
    val (icon, tint) = when (event.source.lowercase()) {
        "cctv" -> Icons.Default.Videocam to NeonCyan
        "phone", "call" -> Icons.Default.Phone to Violet
        "gps" -> Icons.Default.LocationOn to NeonAmber
        "social" -> Icons.Default.Share to Violet
        "anomaly" -> Icons.Default.Warning to NeonRed
        "document" -> Icons.Default.Description to NeonGreen
        else -> Icons.Default.Schedule to TextSecondary
    }

    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .background(Ink900).border(1.dp, Ink800, RoundedCornerShape(12.dp)).padding(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            modifier = Modifier.size(40.dp).clip(RoundedCornerShape(10.dp)).background(tint.copy(alpha = 0.12f))
                .border(1.dp, tint.copy(alpha = 0.4f), RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center,
        ) { Icon(icon, null, tint = tint, modifier = Modifier.size(20.dp)) }

        Spacer(Modifier.width(10.dp))

        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    event.time,
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = NeonCyan,
                    letterSpacing = 1.sp,
                )
                Spacer(Modifier.width(8.dp))
                ThreatBadge(event.severity)
            }
            Spacer(Modifier.height(4.dp))
            Text(event.title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, lineHeight = 17.sp)
            if (event.location.isNotBlank()) {
                Spacer(Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, null, tint = TextMuted, modifier = Modifier.size(11.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(event.location, fontSize = 11.sp, color = TextSecondary, maxLines = 1)
                }
            }
            if (event.description.isNotBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(event.description, fontSize = 11.sp, color = TextSecondary, lineHeight = 15.sp)
            }
        }
    }
}
