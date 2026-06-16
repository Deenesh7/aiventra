package com.aiventra.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiventra.app.ui.AnalysisViewModel
import com.aiventra.app.ui.theme.*
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MapScreen(
    caseId: String,
    onBack: () -> Unit,
    vm: AnalysisViewModel = hiltViewModel(),
) {
    val state by vm.map.collectAsState()

    LaunchedEffect(caseId) { vm.loadMarkers(caseId) }

    val defaultCenter = LatLng(13.0339, 80.2619) // Chennai
    val firstMarker = state.markers.firstOrNull { it.lat != 0.0 && it.lng != 0.0 }
    val center = firstMarker?.let { LatLng(it.lat, it.lng) } ?: defaultCenter
    val cameraState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(center, 14f)
    }

    LaunchedEffect(firstMarker?.id) {
        firstMarker?.let {
            cameraState.position = CameraPosition.fromLatLngZoom(LatLng(it.lat, it.lng), 14f)
        }
    }

    Scaffold(
        containerColor = Ink950,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Crime Scene Map", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Text(
                            "${state.markers.size} markers · case ${caseId.take(8)}",
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
        Box(modifier = Modifier.fillMaxSize().padding(padding)) {
            GoogleMap(
                modifier = Modifier.fillMaxSize(),
                cameraPositionState = cameraState,
                properties = MapProperties(isMyLocationEnabled = false),
                uiSettings = MapUiSettings(zoomControlsEnabled = true, mapToolbarEnabled = false),
            ) {
                state.markers.filter { it.lat != 0.0 && it.lng != 0.0 }.forEach { m ->
                    Marker(
                        state = MarkerState(position = LatLng(m.lat, m.lng)),
                        title = m.label.ifBlank { m.type },
                        snippet = m.note.ifBlank { null },
                    )
                }
            }

            if (state.isLoading) {
                Box(modifier = Modifier.fillMaxSize().background(Ink950.copy(alpha = 0.6f)), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = NeonCyan)
                }
            }
            state.error?.let { err ->
                Box(
                    modifier = Modifier.align(Alignment.TopCenter).padding(16.dp).fillMaxWidth(),
                ) { ErrorBanner(err) }
            }
        }
    }
}
