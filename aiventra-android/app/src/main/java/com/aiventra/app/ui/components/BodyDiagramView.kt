package com.aiventra.app.ui.components

import android.annotation.SuppressLint
import android.graphics.Color as AndroidColor
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.aiventra.app.ui.theme.Ink800
import com.aiventra.app.ui.theme.Ink950

/**
 * Renders the forensic body-chart SVG returned by /api/images/generate-body-chart
 * or /api/reports/analyze. Uses WebView for crisp vector rendering at any size,
 * with the SVG embedded in a tiny dark HTML shell so it inherits the app theme.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun BodyDiagramView(
    svg: String,
    modifier: Modifier = Modifier,
) {
    val html = remember(svg) { wrapSvg(svg) }

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Ink950)
            .border(1.dp, Ink800, RoundedCornerShape(12.dp))
            .padding(4.dp),
    ) {
        AndroidView(
            factory = { ctx ->
                WebView(ctx).apply {
                    setBackgroundColor(AndroidColor.TRANSPARENT)
                    settings.javaScriptEnabled = false
                    settings.loadWithOverviewMode = true
                    settings.useWideViewPort = true
                    webViewClient = WebViewClient()
                    isHorizontalScrollBarEnabled = false
                    isVerticalScrollBarEnabled = false
                    overScrollMode = WebView.OVER_SCROLL_NEVER
                    loadDataWithBaseURL(null, html, "text/html", "utf-8", null)
                }
            },
            modifier = Modifier.fillMaxSize(),
            update = { it.loadDataWithBaseURL(null, html, "text/html", "utf-8", null) },
        )
    }
}

private fun wrapSvg(svg: String): String = """
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
      <style>
        html, body { margin: 0; padding: 0; background: #04080f; height: 100%; }
        body { display: flex; align-items: center; justify-content: center; }
        svg { width: 100%; height: 100%; max-width: 100%; max-height: 100%; }
      </style>
    </head>
    <body>$svg</body>
    </html>
""".trimIndent()

// Helper for Compose remember import
@Composable
private fun <T> remember(key: Any?, calculation: () -> T): T =
    androidx.compose.runtime.remember(key) { calculation() }
