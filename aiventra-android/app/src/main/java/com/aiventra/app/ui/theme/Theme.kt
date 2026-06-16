package com.aiventra.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// ── Forensic dark palette (mirrors the web app) ──
val NeonCyan = Color(0xFF00E5FF)
val NeonRed = Color(0xFFFF3358)
val NeonRedBright = Color(0xFFFF003C)
val NeonAmber = Color(0xFFFFA033)
val NeonGreen = Color(0xFF34D399)
val Violet = Color(0xFFA78BFA)

val Ink950 = Color(0xFF04080F)
val Ink900 = Color(0xFF0A0D14)
val Ink850 = Color(0xFF10141E)
val Ink800 = Color(0xFF1A2030)
val Ink700 = Color(0xFF2A3344)

val TextPrimary = Color(0xFFE4E4E7)
val TextSecondary = Color(0xFFA1A1AA)
val TextMuted = Color(0xFF71717A)

private val AiventraColors = darkColorScheme(
    primary = NeonCyan,
    onPrimary = Ink950,
    secondary = Violet,
    onSecondary = Ink950,
    tertiary = NeonAmber,
    background = Ink950,
    onBackground = TextPrimary,
    surface = Ink900,
    onSurface = TextPrimary,
    surfaceVariant = Ink850,
    onSurfaceVariant = TextSecondary,
    error = NeonRed,
    onError = Color.White,
    outline = Ink700,
)

private val AiventraTypography = Typography(
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 26.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 18.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 15.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontSize = 13.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        letterSpacing = 1.5.sp,
    ),
)

@Composable
fun AiventraTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = AiventraColors,
        typography = AiventraTypography,
        content = content,
    )
}
