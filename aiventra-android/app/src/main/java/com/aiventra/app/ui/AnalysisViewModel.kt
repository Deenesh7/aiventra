package com.aiventra.app.ui

import android.content.ContentResolver
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiventra.app.data.model.*
import com.aiventra.app.data.repository.AiventraRepository
import com.aiventra.app.data.repository.Result
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import java.io.File
import javax.inject.Inject

data class AnalysisUiState(
    val isLoading: Boolean = false,
    val autopsy: AutopsyResult? = null,
    val imageResult: ImageAnalysisResult? = null,
    val error: String? = null,
)

data class AssistantUiState(
    val isThinking: Boolean = false,
    val messages: List<ChatMessage> = listOf(
        ChatMessage(
            role = "assistant",
            content = "Hello. I'm AIVENTRA's forensic assistant. Ask me about case evidence, autopsy findings, or risk factors and I'll provide grounded answers with citations.",
        ),
    ),
    val error: String? = null,
)

data class TimelineUiState(
    val isLoading: Boolean = false,
    val events: List<TimelineEvent> = emptyList(),
    val error: String? = null,
)

data class MapUiState(
    val isLoading: Boolean = false,
    val markers: List<GeoMarker> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class AnalysisViewModel @Inject constructor(
    private val repo: AiventraRepository,
    private val db: FirebaseFirestore,
) : ViewModel() {

    private val _analysis = MutableStateFlow(AnalysisUiState())
    val analysis: StateFlow<AnalysisUiState> = _analysis.asStateFlow()

    private val _assistant = MutableStateFlow(AssistantUiState())
    val assistant: StateFlow<AssistantUiState> = _assistant.asStateFlow()

    private val _timeline = MutableStateFlow(TimelineUiState())
    val timeline: StateFlow<TimelineUiState> = _timeline.asStateFlow()

    private val _map = MutableStateFlow(MapUiState())
    val map: StateFlow<MapUiState> = _map.asStateFlow()

    // ── Autopsy ────────────────────────────────────────────────────────────────
    fun analyzeAutopsy(file: File, caseId: String? = null) {
        _analysis.value = _analysis.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            when (val result = repo.analyzeAutopsy(file, caseId)) {
                is Result.Success -> {
                    _analysis.value = _analysis.value.copy(
                        isLoading = false,
                        autopsy = result.data,
                        error = null,
                    )
                    // Persist to Firestore (analyses)
                    runCatching {
                        db.collection("analyses").add(
                            hashMapOf(
                                "case_id" to caseId,
                                "type" to "autopsy",
                                "summary" to result.data.causeOfDeath?.primary,
                                "provider" to result.data.deepReasoning?.provider,
                                "model" to result.data.deepReasoning?.model,
                                "created_at" to com.google.firebase.Timestamp.now(),
                            )
                        ).await()
                    }
                }
                is Result.Error -> _analysis.value = _analysis.value.copy(
                    isLoading = false,
                    error = result.message,
                )
                else -> {}
            }
        }
    }

    // ── Image / body chart ─────────────────────────────────────────────────────
    fun analyzeImage(file: File, mimeType: String = "image/jpeg") {
        _analysis.value = _analysis.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            when (val result = repo.generateBodyChart(file, mimeType)) {
                is Result.Success -> {
                    _analysis.value = _analysis.value.copy(
                        isLoading = false,
                        imageResult = result.data,
                        error = null,
                    )
                    runCatching {
                        db.collection("analyses").add(
                            hashMapOf(
                                "type" to (result.data.sourceType ?: "image"),
                                "injury_count" to result.data.injuries.size,
                                "created_at" to com.google.firebase.Timestamp.now(),
                            )
                        ).await()
                    }
                }
                is Result.Error -> _analysis.value = _analysis.value.copy(
                    isLoading = false,
                    error = result.message,
                )
                else -> {}
            }
        }
    }

    fun resetAnalysis() {
        _analysis.value = AnalysisUiState()
    }

    // ── Assistant ──────────────────────────────────────────────────────────────
    fun sendMessage(text: String, caseId: String? = null) {
        if (text.isBlank() || _assistant.value.isThinking) return
        val userMsg = ChatMessage(role = "user", content = text.trim())
        _assistant.value = _assistant.value.copy(
            messages = _assistant.value.messages + userMsg,
            isThinking = true,
            error = null,
        )
        viewModelScope.launch {
            val result = repo.askAssistant(text, caseId, _assistant.value.messages)
            when (result) {
                is Result.Success -> {
                    val aiMsg = ChatMessage(
                        role = "assistant",
                        content = result.data.answer,
                        citations = result.data.citations,
                        reasoning = result.data.reasoning,
                    )
                    _assistant.value = _assistant.value.copy(
                        messages = _assistant.value.messages + aiMsg,
                        isThinking = false,
                    )
                }
                is Result.Error -> _assistant.value = _assistant.value.copy(
                    isThinking = false,
                    error = result.message,
                )
                else -> {}
            }
        }
    }

    // ── Timeline ───────────────────────────────────────────────────────────────
    fun loadTimeline(caseId: String) {
        _timeline.value = _timeline.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            when (val result = repo.getTimeline(caseId)) {
                is Result.Success -> _timeline.value = TimelineUiState(events = result.data)
                is Result.Error -> _timeline.value = TimelineUiState(error = result.message)
                else -> {}
            }
        }
    }

    // ── Map markers ────────────────────────────────────────────────────────────
    fun loadMarkers(caseId: String) {
        _map.value = _map.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            when (val result = repo.getGeoMarkers(caseId)) {
                is Result.Success -> _map.value = MapUiState(markers = result.data)
                is Result.Error -> _map.value = MapUiState(error = result.message)
                else -> {}
            }
        }
    }
}

/** Copy a Uri (from photo picker / file picker) into a temp cache file we can upload. */
suspend fun Uri.toUploadFile(resolver: ContentResolver, cacheDir: File): File =
    withContext(Dispatchers.IO) {
        val ext = resolver.getType(this@toUploadFile)?.substringAfter('/')?.let { ".$it" } ?: ".bin"
        val temp = File.createTempFile("upload_", ext, cacheDir)
        resolver.openInputStream(this@toUploadFile)?.use { input ->
            temp.outputStream().use { input.copyTo(it) }
        }
        temp
    }
