package com.aiventra.app.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.aiventra.app.ui.AnalysisViewModel
import com.aiventra.app.ui.components.BodyDiagramView
import com.aiventra.app.ui.components.SectionCard
import com.aiventra.app.ui.components.ThreatBadge
import com.aiventra.app.ui.theme.*
import com.aiventra.app.ui.toUploadFile
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AutopsyScreen(
    onBack: () -> Unit,
    vm: AnalysisViewModel = hiltViewModel(),
) {
    val state by vm.analysis.collectAsState()
    val ctx = LocalContext.current
    val scope = androidx.compose.runtime.rememberCoroutineScope()

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            scope.launch {
                val file = uri.toUploadFile(ctx.contentResolver, ctx.cacheDir)
                vm.analyzeAutopsy(file)
            }
        }
    }

    Scaffold(
        containerColor = Ink950,
        topBar = {
            TopAppBar(
                title = { Text("Autopsy Analyzer", fontSize = 16.sp, fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back", tint = TextSecondary) }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Ink900),
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
        ) {
            Text("Module 01 · NLP + Deep Reasoning", fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = NeonCyan, letterSpacing = 2.sp)
            Spacer(Modifier.height(6.dp))
            Text("AI Autopsy Report Analyzer", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Spacer(Modifier.height(4.dp))
            Text("Upload an autopsy PDF — extracts cause of death, injuries, toxicology, and runs deep forensic reasoning.", fontSize = 12.sp, color = TextSecondary)
            Spacer(Modifier.height(20.dp))

            // Upload card
            UploadCard(
                icon = Icons.Default.UploadFile,
                title = "Drop autopsy PDF here",
                subtitle = "Tap to choose a file from device",
                cta = "Choose PDF",
            ) {
                picker.launch("application/pdf")
            }

            Spacer(Modifier.height(16.dp))

            // Loading
            if (state.isLoading) {
                LoadingCard("Running NLP extraction · this can take 10-30 seconds for full reasoning")
            }

            // Error
            state.error?.let {
                Spacer(Modifier.height(12.dp))
                ErrorBanner(it)
            }

            // Results
            state.autopsy?.let { res ->
                Spacer(Modifier.height(16.dp))
                AutopsyResults(res)
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
private fun AutopsyResults(res: com.aiventra.app.data.model.AutopsyResult) {
    // Header
    SectionCard(eyebrow = "Forensic Summary", title = res.causeOfDeath?.primary ?: "Cause undetermined") {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Confidence", fontSize = 10.sp, color = TextMuted, fontFamily = FontFamily.Monospace)
            Spacer(Modifier.width(8.dp))
            Text("${res.confidence}%", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = NeonCyan)
            Spacer(Modifier.weight(1f))
            res.deepReasoning?.let {
                Text("${it.provider} · ${it.inferenceMs}ms", fontSize = 9.sp, color = TextSecondary, fontFamily = FontFamily.Monospace)
            }
        }
        res.causeOfDeath?.evidenceQuote?.takeIf { it.isNotBlank() }?.let {
            Spacer(Modifier.height(8.dp))
            Text("\"${it.take(220)}\"", fontSize = 11.sp, color = TextSecondary, fontFamily = FontFamily.Monospace, lineHeight = 16.sp)
        }
    }
    Spacer(Modifier.height(12.dp))

    // Body diagram
    res.bodyDiagram?.svg?.takeIf { it.isNotBlank() }?.let { svg ->
        SectionCard(eyebrow = "Synthesized Injury Map", title = "Forensic body chart") {
            BodyDiagramView(svg = svg, modifier = Modifier.fillMaxWidth().height(520.dp))
            Spacer(Modifier.height(8.dp))
            Text("${res.bodyDiagram.markerCount} markers · auto-placed from extracted injury patterns", fontSize = 10.sp, color = TextSecondary)
        }
        Spacer(Modifier.height(12.dp))
    }

    // Deep reasoning
    res.deepReasoning?.narrative?.takeIf { it.isNotBlank() }?.let { narrative ->
        SectionCard(eyebrow = "Deep Forensic Reasoning · ${res.deepReasoning.provider}", title = "Investigator briefing") {
            Text(narrative, fontSize = 13.sp, color = TextPrimary, lineHeight = 19.sp)
        }
        Spacer(Modifier.height(12.dp))
    }

    // Injuries
    if (res.injuryPatterns.isNotEmpty()) {
        SectionCard(eyebrow = "${res.injuryPatterns.size} entries", title = "Injury patterns") {
            res.injuryPatterns.forEachIndexed { i, inj ->
                if (i > 0) Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.Top) {
                    ThreatBadge(inj.severity)
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(inj.region.replace("_", " ").replaceFirstChar { it.uppercase() }, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        Text(inj.description, fontSize = 12.sp, color = TextSecondary, lineHeight = 17.sp)
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
    }

    // Toxicology
    if (res.toxicology.isNotEmpty()) {
        SectionCard(eyebrow = "Toxicology panel", title = "Substances detected") {
            res.toxicology.forEach { tox ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(tox.substance, fontSize = 12.sp, color = TextPrimary, fontWeight = FontWeight.Medium)
                    Text(tox.value, fontSize = 11.sp, color = TextSecondary, fontFamily = FontFamily.Monospace)
                    ThreatBadge(if (tox.status == "positive") "high" else "low")
                }
            }
        }
        Spacer(Modifier.height(12.dp))
    }

    // Suspicious indicators
    if (res.suspiciousIndicators.isNotEmpty()) {
        SectionCard(eyebrow = "⚠ Investigation flags", title = "Suspicious indicators") {
            res.suspiciousIndicators.forEach { s ->
                Row(verticalAlignment = Alignment.Top, modifier = Modifier.padding(vertical = 4.dp)) {
                    ThreatBadge(s.severity)
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(s.indicator, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
                        if (s.note.isNotBlank()) Text(s.note, fontSize = 11.sp, color = TextSecondary)
                    }
                }
            }
        }
    }
}

@Composable
fun UploadCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    subtitle: String,
    cta: String,
    onClick: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Ink900)
            .border(1.dp, NeonCyan.copy(alpha = 0.3f), RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier.size(56.dp).clip(RoundedCornerShape(14.dp)).background(NeonCyan.copy(alpha = 0.1f)),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = NeonCyan, modifier = Modifier.size(28.dp))
        }
        Spacer(Modifier.height(12.dp))
        Text(title, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary)
        Text(subtitle, fontSize = 11.sp, color = TextSecondary)
        Spacer(Modifier.height(14.dp))
        Button(
            onClick = onClick,
            colors = ButtonDefaults.buttonColors(containerColor = NeonCyan, contentColor = Ink950),
            shape = RoundedCornerShape(8.dp),
        ) { Text(cta, fontWeight = FontWeight.SemiBold, fontSize = 12.sp) }
    }
}

@Composable
fun LoadingCard(message: String) {
    Row(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(Ink900)
            .border(1.dp, NeonCyan.copy(alpha = 0.3f), RoundedCornerShape(12.dp)).padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = NeonCyan)
        Spacer(Modifier.width(12.dp))
        Text(message, fontSize = 12.sp, color = TextPrimary)
    }
}
