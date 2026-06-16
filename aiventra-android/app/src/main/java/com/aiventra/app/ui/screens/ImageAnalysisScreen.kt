package com.aiventra.app.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.aiventra.app.data.model.InferredInjury
import com.aiventra.app.ui.AnalysisViewModel
import com.aiventra.app.ui.components.BodyDiagramView
import com.aiventra.app.ui.components.SectionCard
import com.aiventra.app.ui.components.ThreatBadge
import com.aiventra.app.ui.theme.*
import com.aiventra.app.ui.toUploadFile
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImageAnalysisScreen(
    onBack: () -> Unit,
    vm: AnalysisViewModel = hiltViewModel(),
) {
    val state by vm.analysis.collectAsState()
    val ctx = LocalContext.current
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    var pickedUri by remember { mutableStateOf<android.net.Uri?>(null) }

    val imagePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            pickedUri = uri
            scope.launch {
                val mime = ctx.contentResolver.getType(uri) ?: "image/jpeg"
                val file = uri.toUploadFile(ctx.contentResolver, ctx.cacheDir)
                if (mime == "application/pdf") vm.analyzeAutopsy(file)
                else vm.analyzeImage(file, mime)
            }
        }
    }

    Scaffold(
        containerColor = Ink950,
        topBar = {
            TopAppBar(
                title = { Text("Image Analysis", fontSize = 16.sp, fontWeight = FontWeight.Bold) },
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
            Text(
                "Module 08 · CV + Body Chart Synthesis",
                fontSize = 10.sp, fontFamily = FontFamily.Monospace, color = NeonCyan, letterSpacing = 2.sp,
            )
            Spacer(Modifier.height(6.dp))
            Text("Forensic Image & Report Analysis", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
            Spacer(Modifier.height(4.dp))
            Text(
                "Upload a victim photograph OR an autopsy PDF. The system generates a blue forensic body chart with red injury markers at anatomically detected positions.",
                fontSize = 12.sp, color = TextSecondary, lineHeight = 17.sp,
            )
            Spacer(Modifier.height(20.dp))

            // Upload card
            UploadCard(
                icon = Icons.Default.AddPhotoAlternate,
                title = "Drop victim photo or autopsy PDF",
                subtitle = "JPEG · PNG · WEBP · PDF accepted",
                cta = "Choose file",
            ) {
                imagePicker.launch("*/*")
            }

            // Loading
            if (state.isLoading) {
                Spacer(Modifier.height(12.dp))
                LoadingCard("Running OpenCV detection · body silhouette · blood pattern HSV · edge clustering")
            }

            // Error
            state.error?.let {
                Spacer(Modifier.height(12.dp))
                ErrorBanner(it)
            }

            // Original image preview
            pickedUri?.let { uri ->
                if (!state.isLoading && state.imageResult != null) {
                    Spacer(Modifier.height(16.dp))
                    SectionCard(eyebrow = "Source", title = "Original photograph") {
                        AsyncImage(
                            model = uri,
                            contentDescription = "source",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(300.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Ink950),
                        )
                    }
                }
            }

            // Image analysis result (body chart + injuries)
            state.imageResult?.let { res ->
                Spacer(Modifier.height(16.dp))

                // Body chart
                res.bodyDiagram?.svg?.takeIf { it.isNotBlank() }?.let { svg ->
                    SectionCard(eyebrow = "Forensic body chart · anterior view", title = "Injury map") {
                        BodyDiagramView(svg = svg, modifier = Modifier.fillMaxWidth().height(520.dp))
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "${res.bodyDiagram.markerCount} injuries mapped",
                                fontSize = 11.sp, color = TextSecondary,
                            )
                            Spacer(Modifier.weight(1f))
                            LegendDot(NeonRedBright, "Critical")
                            Spacer(Modifier.width(6.dp))
                            LegendDot(NeonRed, "High")
                            Spacer(Modifier.width(6.dp))
                            LegendDot(NeonAmber, "Medium")
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }

                // Detected injuries
                if (res.injuries.isNotEmpty()) {
                    SectionCard(
                        eyebrow = "${res.injuries.size} entries · pathologist confirmation required",
                        title = "Detected injuries",
                    ) {
                        res.injuries.forEachIndexed { i, inj ->
                            if (i > 0) Spacer(Modifier.height(12.dp))
                            InjuryCard(i + 1, inj)
                        }
                    }
                } else {
                    SectionCard(eyebrow = "Analysis complete", title = "No injuries inferred") {
                        Text(
                            "The CV pipeline did not surface wound-suggestive features inside the body silhouette. Try a better-lit or higher-resolution photograph.",
                            fontSize = 12.sp, color = TextSecondary,
                        )
                    }
                }
            }

            // Autopsy PDF path
            state.autopsy?.let { res ->
                Spacer(Modifier.height(16.dp))
                res.bodyDiagram?.svg?.takeIf { it.isNotBlank() }?.let { svg ->
                    SectionCard(
                        eyebrow = "Body chart from PDF · ${res.bodyDiagram.markerCount} markers",
                        title = "Synthesized injury map",
                    ) {
                        BodyDiagramView(svg = svg, modifier = Modifier.fillMaxWidth().height(520.dp))
                    }
                    Spacer(Modifier.height(12.dp))
                }
                if (res.injuryPatterns.isNotEmpty()) {
                    SectionCard(eyebrow = "${res.injuryPatterns.size} extracted", title = "Injury patterns from autopsy") {
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
                }
            }

            // Forensic disclaimer
            if (state.imageResult != null || state.autopsy != null) {
                Spacer(Modifier.height(16.dp))
                Box(
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
                        .background(NeonAmber.copy(alpha = 0.06f))
                        .border(1.dp, NeonAmber.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                        .padding(14.dp),
                ) {
                    Row(verticalAlignment = Alignment.Top) {
                        Icon(Icons.Default.Info, null, tint = NeonAmber, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(10.dp))
                        Text(
                            "Forensic disclaimer: Injury detections and cause-of-injury classifications are produced by computer-vision heuristics. All findings require independent confirmation by a qualified forensic pathologist before inclusion in any official report.",
                            fontSize = 11.sp, color = TextPrimary, lineHeight = 16.sp,
                        )
                    }
                }
            }

            Spacer(Modifier.height(40.dp))
        }
    }
}

@Composable
private fun InjuryCard(number: Int, inj: InferredInjury) {
    val color = when (inj.severity.lowercase()) {
        "critical" -> NeonRedBright
        "high" -> NeonRed
        "medium" -> NeonAmber
        else -> NeonGreen
    }
    Column(
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
            .background(Ink850).border(1.dp, Ink800, RoundedCornerShape(10.dp)).padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.Top) {
            Box(
                modifier = Modifier.size(34.dp).clip(RoundedCornerShape(10.dp))
                    .background(color.copy(alpha = 0.15f))
                    .border(1.5.dp, color.copy(alpha = 0.5f), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Text("$number", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = color, fontFamily = FontFamily.Monospace)
            }
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(inj.injuryType, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = TextPrimary, lineHeight = 17.sp)
                Text("ID · INJ-${number.toString().padStart(3, '0')}", fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = TextMuted, letterSpacing = 1.sp)
            }
            Column(horizontalAlignment = Alignment.End) {
                ThreatBadge(inj.severity)
                Spacer(Modifier.height(4.dp))
                Text("${(inj.confidence * 100).toInt()}%", fontSize = 11.sp, fontFamily = FontFamily.Monospace, color = NeonCyan)
            }
        }
        Spacer(Modifier.height(10.dp))
        DetailRow("Body region", inj.regionLabel.ifBlank { inj.region.replace("_", " ").replaceFirstChar { it.uppercase() } })
        Spacer(Modifier.height(6.dp))
        DetailRow("Severity", inj.severity.uppercase(), valueColor = color)
        Spacer(Modifier.height(6.dp))
        DetailRow("Possible cause", inj.possibleCause)
    }
}

@Composable
private fun DetailRow(label: String, value: String, valueColor: Color = TextPrimary) {
    Row(verticalAlignment = Alignment.Top) {
        Column(modifier = Modifier.width(110.dp)) {
            Text(label.uppercase(), fontSize = 9.sp, fontFamily = FontFamily.Monospace, color = TextMuted, letterSpacing = 1.sp)
        }
        Text(value, fontSize = 12.sp, color = valueColor, modifier = Modifier.weight(1f), lineHeight = 16.sp)
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(modifier = Modifier.size(8.dp).clip(RoundedCornerShape(4.dp)).background(color))
        Spacer(Modifier.width(4.dp))
        Text(label, fontSize = 9.sp, color = TextSecondary, fontFamily = FontFamily.Monospace)
    }
}
