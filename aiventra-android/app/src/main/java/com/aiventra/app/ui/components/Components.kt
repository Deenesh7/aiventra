package com.aiventra.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiventra.app.ui.theme.*

@Composable
fun SectionCard(
    title: String? = null,
    eyebrow: String? = null,
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Ink900)
            .border(1.dp, Ink800, RoundedCornerShape(14.dp))
            .padding(16.dp),
    ) {
        if (eyebrow != null) {
            Text(
                text = eyebrow.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = NeonCyan.copy(alpha = 0.85f),
            )
            Spacer(Modifier.height(4.dp))
        }
        if (title != null) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = TextPrimary,
            )
            Spacer(Modifier.height(12.dp))
        }
        content()
    }
}

@Composable
fun StatCard(
    label: String,
    value: String,
    accent: Color = NeonCyan,
    hint: String? = null,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Ink900)
            .border(1.dp, Ink800, RoundedCornerShape(12.dp))
            .padding(14.dp),
    ) {
        Text(
            text = label.uppercase(),
            fontSize = 9.sp,
            fontFamily = FontFamily.Monospace,
            color = TextMuted,
            letterSpacing = 1.5.sp,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = value,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
            color = accent,
        )
        if (hint != null) {
            Spacer(Modifier.height(4.dp))
            Text(
                text = hint,
                fontSize = 10.sp,
                color = TextSecondary,
            )
        }
    }
}

@Composable
fun ThreatBadge(level: String, modifier: Modifier = Modifier) {
    val (bg, fg) = when (level.lowercase()) {
        "critical" -> NeonRedBright.copy(alpha = 0.15f) to NeonRedBright
        "high" -> NeonRed.copy(alpha = 0.15f) to NeonRed
        "medium" -> NeonAmber.copy(alpha = 0.15f) to NeonAmber
        "low" -> NeonGreen.copy(alpha = 0.15f) to NeonGreen
        else -> Ink800 to TextSecondary
    }
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(4.dp))
            .background(bg)
            .border(1.dp, fg.copy(alpha = 0.4f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(
            text = level.uppercase(),
            fontSize = 9.sp,
            fontFamily = FontFamily.Monospace,
            fontWeight = FontWeight.Bold,
            color = fg,
            letterSpacing = 1.sp,
        )
    }
}

@Composable
fun Eyebrow(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        modifier = modifier,
        fontSize = 10.sp,
        fontFamily = FontFamily.Monospace,
        color = NeonCyan.copy(alpha = 0.85f),
        letterSpacing = 2.sp,
    )
}

@Composable
fun MonoLabel(text: String, modifier: Modifier = Modifier, color: Color = TextMuted) {
    Text(
        text = text.uppercase(),
        modifier = modifier,
        fontSize = 9.sp,
        fontFamily = FontFamily.Monospace,
        color = color,
        letterSpacing = 1.5.sp,
    )
}
