package com.aiventra.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.aiventra.app.ui.CasesViewModel
import com.aiventra.app.ui.components.SectionCard
import com.aiventra.app.ui.components.StatCard
import com.aiventra.app.ui.components.ThreatBadge
import com.aiventra.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CaseDetailScreen(
    caseId: String,
    onBack: () -> Unit,
    onOpenMap: () -> Unit,
    onOpenTimeline: () -> Unit,
    onOpenAutopsy: () -> Unit,
    onOpenImage: () -> Unit,
    onOpenAssistant: () -> Unit,
    vm: CasesViewModel = hiltViewModel(),
) {
    val state by vm.state.collectAsState()
    val case_ = remember(state.cases, caseId) { state.cases.firstOrNull { it.id == caseId } }

    Scaffold(
        containerColor = Ink950,
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        case_?.caseNumber ?: "Case",
                        fontSize = 14.sp,
                        fontFamily = FontFamily.Monospace,
                        color = NeonCyan,
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
        if (case_ == null) {
            Box(Modifier.fillMaxSize().padding(padding), Alignment.Center) {
                CircularProgressIndicator(color = NeonCyan)
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
        ) {
            // Header
            Text(
                case_.title,
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimary,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                case_.location.ifBlank { "No location set" },
                fontSize = 12.sp,
                color = TextSecondary,
            )
            Spacer(Modifier.height(16.dp))

            // Risk gauge + status row
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatCard(
                    "Risk Score",
                    "${case_.riskScore}",
                    accent = when {
                        case_.riskScore >= 75 -> NeonRedBright
                        case_.riskScore >= 50 -> NeonRed
                        case_.riskScore >= 25 -> NeonAmber
                        else -> NeonGreen
                    },
                    modifier = Modifier.weight(1f),
                )
                StatCard("Evidence", "${case_.evidenceCount}", accent = NeonCyan, modifier = Modifier.weight(1f))
            }
            Spacer(Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                ThreatBadge(case_.riskLevel)
                Spacer(Modifier.width(8.dp))
                Text(case_.caseType.replaceFirstChar { it.uppercase() }, fontSize = 12.sp, color = TextSecondary)
                Spacer(Modifier.weight(1f))
                Text(case_.status.uppercase(), fontSize = 10.sp, color = NeonGreen, fontFamily = FontFamily.Monospace)
            }

            Spacer(Modifier.height(20.dp))

            // Description
            if (case_.description.isNotBlank()) {
                SectionCard(title = "Brief", eyebrow = "Investigator notes") {
                    Text(case_.description, fontSize = 13.sp, color = TextPrimary, lineHeight = 19.sp)
                }
                Spacer(Modifier.height(12.dp))
            }

            // Action grid
            SectionCard(eyebrow = "AI Workflows · This Case") {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ActionTile(Icons.Default.Description, "Autopsy", "Upload PDF", Modifier.weight(1f)) { onOpenAutopsy() }
                        ActionTile(Icons.Default.Image, "Image CV", "Body chart", Modifier.weight(1f)) { onOpenImage() }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        ActionTile(Icons.Default.SmartToy, "Assistant", "Ask the case", Modifier.weight(1f)) { onOpenAssistant() }
                        ActionTile(Icons.Default.AccessTime, "Timeline", "Reconstruct", Modifier.weight(1f)) { onOpenTimeline() }
                    }
                    ActionTile(Icons.Default.Map, "Crime Scene Map", "View body location", Modifier.fillMaxWidth()) { onOpenMap() }
                }
            }

            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun ActionTile(
    icon: ImageVector,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(Ink850)
            .border(1.dp, NeonCyan.copy(alpha = 0.15f), RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(34.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(NeonCyan.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = NeonCyan, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(10.dp))
        Column {
            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
            Text(subtitle, fontSize = 10.sp, color = TextSecondary)
        }
        Spacer(Modifier.weight(1f))
        Icon(Icons.Default.ChevronRight, null, tint = TextMuted, modifier = Modifier.size(18.dp))
    }
}
