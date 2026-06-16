package com.aiventra.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiventra.app.data.model.Case
import com.aiventra.app.ui.AuthViewModel
import com.aiventra.app.ui.CasesViewModel
import com.aiventra.app.ui.Routes
import com.aiventra.app.ui.components.StatCard
import com.aiventra.app.ui.components.ThreatBadge
import com.aiventra.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    authVm: AuthViewModel,
    onCaseClick: (String) -> Unit,
    onNavigate: (String) -> Unit,
    onLogout: () -> Unit,
    casesVm: CasesViewModel = hiltViewModel(),
) {
    val auth by authVm.state.collectAsState()
    val cases by casesVm.state.collectAsState()

    Scaffold(
        containerColor = Ink950,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "AIVENTRA",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 3.sp,
                            color = TextPrimary,
                        )
                        Text(
                            auth.userName,
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            color = NeonCyan.copy(alpha = 0.7f),
                        )
                    }
                },
                actions = {
                    IconButton(onClick = {
                        authVm.logout()
                        onLogout()
                    }) {
                        Icon(Icons.Default.Logout, "Logout", tint = TextSecondary)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Ink900),
            )
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Spacer(Modifier.height(8.dp))
                Text(
                    "Operations Console",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimary,
                )
                Text(
                    "Live forensic case command center",
                    fontSize = 12.sp,
                    color = TextSecondary,
                )
                Spacer(Modifier.height(12.dp))
            }

            // Stats row
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val active = cases.cases.count { it.status == "active" }
                    val critical = cases.cases.count { it.riskLevel == "critical" }
                    val high = cases.cases.count { it.riskLevel == "high" }
                    StatCard(
                        "Active",
                        active.toString(),
                        accent = NeonCyan,
                        modifier = Modifier.weight(1f),
                    )
                    StatCard(
                        "Critical",
                        critical.toString(),
                        accent = NeonRedBright,
                        modifier = Modifier.weight(1f),
                    )
                    StatCard(
                        "High Risk",
                        high.toString(),
                        accent = NeonAmber,
                        modifier = Modifier.weight(1f),
                    )
                }
            }

            // Quick action tiles
            item {
                Spacer(Modifier.height(8.dp))
                Text(
                    "AI MODULES",
                    fontSize = 10.sp,
                    fontFamily = FontFamily.Monospace,
                    color = NeonCyan.copy(alpha = 0.8f),
                    letterSpacing = 2.sp,
                )
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    QuickTile(
                        Icons.Default.Description,
                        "Autopsy",
                        "PDF → injury map",
                        modifier = Modifier.weight(1f),
                    ) { onNavigate(Routes.AUTOPSY) }
                    QuickTile(
                        Icons.Default.Image,
                        "Image",
                        "Photo → body chart",
                        modifier = Modifier.weight(1f),
                    ) { onNavigate(Routes.IMAGE_ANALYSIS) }
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    QuickTile(
                        Icons.Default.SmartToy,
                        "AI Assistant",
                        "Grounded chat",
                        modifier = Modifier.weight(1f),
                    ) { onNavigate(Routes.ASSISTANT) }
                    QuickTile(
                        Icons.Default.FolderOpen,
                        "All Cases",
                        "${cases.cases.size} on file",
                        modifier = Modifier.weight(1f),
                    ) { onNavigate(Routes.CASES) }
                }
            }

            // Priority cases
            item {
                Spacer(Modifier.height(16.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "PRIORITY QUEUE",
                        fontSize = 10.sp,
                        fontFamily = FontFamily.Monospace,
                        color = NeonRed.copy(alpha = 0.85f),
                        letterSpacing = 2.sp,
                    )
                    Spacer(Modifier.weight(1f))
                    TextButton(onClick = { onNavigate(Routes.CASES) }) {
                        Text("View all", color = NeonCyan, fontSize = 12.sp)
                    }
                }
            }

            if (cases.isLoading) {
                item {
                    Box(Modifier.fillMaxWidth().padding(40.dp), Alignment.Center) {
                        CircularProgressIndicator(color = NeonCyan)
                    }
                }
            } else if (cases.error != null) {
                item {
                    ErrorBanner(cases.error ?: "Failed to load cases")
                }
            } else if (cases.cases.isEmpty()) {
                item {
                    EmptyState("No cases yet · create one from the web app or via Cases screen")
                }
            } else {
                items(
                    items = cases.cases.sortedByDescending { it.riskScore }.take(8),
                    key = { it.id },
                ) { case_ ->
                    CaseRow(case_) { onCaseClick(case_.id) }
                }
            }
            item { Spacer(Modifier.height(20.dp)) }
        }
    }
}

@Composable
private fun QuickTile(
    icon: ImageVector,
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(14.dp))
            .background(Ink900)
            .border(1.dp, NeonCyan.copy(alpha = 0.15f), RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(14.dp),
    ) {
        Icon(icon, contentDescription = null, tint = NeonCyan, modifier = Modifier.size(22.dp))
        Spacer(Modifier.height(10.dp))
        Text(title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
        Text(subtitle, fontSize = 11.sp, color = TextSecondary)
    }
}

@Composable
fun CaseRow(case_: Case, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Ink900)
            .border(1.dp, Ink800, RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                case_.caseNumber.ifBlank { case_.id.take(10) },
                fontSize = 10.sp,
                fontFamily = FontFamily.Monospace,
                color = NeonCyan.copy(alpha = 0.85f),
                letterSpacing = 1.sp,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                case_.title.ifBlank { "Untitled case" },
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = TextPrimary,
                maxLines = 1,
            )
            if (case_.location.isNotBlank()) {
                Spacer(Modifier.height(2.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        null,
                        tint = TextMuted,
                        modifier = Modifier.size(11.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        case_.location,
                        fontSize = 11.sp,
                        color = TextSecondary,
                        maxLines = 1,
                    )
                }
            }
        }
        Spacer(Modifier.width(10.dp))
        Column(horizontalAlignment = Alignment.End) {
            Text(
                "${case_.riskScore}",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = riskColor(case_.riskScore),
            )
            Spacer(Modifier.height(4.dp))
            ThreatBadge(case_.riskLevel)
        }
    }
}

private fun riskColor(score: Int): Color = when {
    score >= 75 -> NeonRedBright
    score >= 50 -> NeonRed
    score >= 25 -> NeonAmber
    else -> NeonGreen
}

@Composable
fun ErrorBanner(message: String) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(NeonRed.copy(alpha = 0.1f))
            .border(1.dp, NeonRed.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Warning, null, tint = NeonRed, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(8.dp))
            Text(message, fontSize = 12.sp, color = NeonRed)
        }
    }
}

@Composable
fun EmptyState(message: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Ink900)
            .border(1.dp, Ink800, RoundedCornerShape(12.dp))
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(Icons.Default.Inbox, null, tint = TextMuted, modifier = Modifier.size(36.dp))
        Spacer(Modifier.height(8.dp))
        Text(message, fontSize = 12.sp, color = TextSecondary)
    }
}
