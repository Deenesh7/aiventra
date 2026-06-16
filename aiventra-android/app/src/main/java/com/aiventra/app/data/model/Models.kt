package com.aiventra.app.data.model

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

// ─── Auth ────────────────────────────────────────────────────────────────────

data class User(
    val id: String,
    val email: String,
    val name: String,
    val role: String = "investigator",
    val department: String = "Forensic Investigation",
)

// ─── Case ────────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class Case(
    val id: String = "",
    @Json(name = "case_number") val caseNumber: String = "",
    val title: String = "",
    val location: String = "",
    val status: String = "active",
    val priority: String = "high",
    @Json(name = "case_type") val caseType: String = "homicide",
    @Json(name = "risk_score") val riskScore: Int = 0,
    @Json(name = "risk_level") val riskLevel: String = "low",
    val description: String = "",
    @Json(name = "incident_date") val incidentDate: String? = null,
    @Json(name = "evidence_count") val evidenceCount: Int = 0,
    @Json(name = "created_at") val createdAt: String = "",
    @Json(name = "updated_at") val updatedAt: String = "",
)

// ─── Autopsy analysis result ─────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class AutopsyResult(
    @Json(name = "case_id") val caseId: String?,
    @Json(name = "cause_of_death") val causeOfDeath: CauseOfDeath?,
    @Json(name = "injury_patterns") val injuryPatterns: List<InjuryPattern> = emptyList(),
    val toxicology: List<ToxicologyItem> = emptyList(),
    val observations: List<String> = emptyList(),
    @Json(name = "suspicious_indicators") val suspiciousIndicators: List<SuspiciousIndicator> = emptyList(),
    val confidence: Int = 0,
    val pathologist: String? = null,
    @Json(name = "deep_reasoning") val deepReasoning: DeepReasoning? = null,
    @Json(name = "body_diagram") val bodyDiagram: BodyDiagram? = null,
    val filename: String? = null,
)

@JsonClass(generateAdapter = true)
data class CauseOfDeath(
    val primary: String = "Undetermined",
    val category: String = "undetermined",
    val confidence: Double = 0.0,
    @Json(name = "evidence_quote") val evidenceQuote: String = "",
)

@JsonClass(generateAdapter = true)
data class InjuryPattern(
    val region: String = "",
    val description: String = "",
    val severity: String = "medium",
)

@JsonClass(generateAdapter = true)
data class ToxicologyItem(
    val substance: String = "",
    val value: String = "",
    val status: String = "negative",
)

@JsonClass(generateAdapter = true)
data class SuspiciousIndicator(
    val indicator: String = "",
    val severity: String = "medium",
    val note: String = "",
)

@JsonClass(generateAdapter = true)
data class DeepReasoning(
    val narrative: String = "",
    val provider: String = "",
    val model: String = "",
    @Json(name = "inference_ms") val inferenceMs: Int = 0,
)

@JsonClass(generateAdapter = true)
data class BodyDiagram(
    val svg: String = "",
    @Json(name = "svg_base64") val svgBase64: String = "",
    @Json(name = "marker_count") val markerCount: Int = 0,
    val legend: List<DiagramLegendItem> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class DiagramLegendItem(
    val n: Int = 0,
    val region: String = "",
    val severity: String = "",
    val description: String = "",
    val color: String = "#ff3358",
)

// ─── Image analysis result ────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class ImageAnalysisResult(
    @Json(name = "source_type") val sourceType: String = "image",
    @Json(name = "source_name") val sourceName: String? = null,
    @Json(name = "body_diagram") val bodyDiagram: BodyDiagram? = null,
    val injuries: List<InferredInjury> = emptyList(),
    val detections: List<Detection> = emptyList(),
    @Json(name = "body_location") val bodyLocation: BodyLocation? = null,
    val confidence: Double? = null,
)

@JsonClass(generateAdapter = true)
data class InferredInjury(
    val region: String = "",
    @Json(name = "region_label") val regionLabel: String = "",
    val severity: String = "medium",
    @Json(name = "injury_type") val injuryType: String = "",
    @Json(name = "possible_cause") val possibleCause: String = "",
    val confidence: Double = 0.5,
    val description: String = "",
)

@JsonClass(generateAdapter = true)
data class Detection(
    val label: String = "",
    @Json(name = "class") val detClass: String = "",
    val confidence: Double = 0.0,
    val severity: String = "medium",
    val primary: Boolean = false,
)

@JsonClass(generateAdapter = true)
data class BodyLocation(
    val confidence: Double = 0.0,
    val label: String = "",
    val method: String = "",
)

// ─── AI Assistant ─────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class AssistantRequest(
    val query: String,
    @Json(name = "case_id") val caseId: String? = null,
    val history: List<ChatMessage> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class AssistantResponse(
    val answer: String = "",
    val citations: List<Citation> = emptyList(),
    val reasoning: String = "",
    @Json(name = "inference_ms") val inferenceMs: Int = 0,
)

@JsonClass(generateAdapter = true)
data class Citation(
    val id: String = "",
    val label: String = "",
    val type: String = "",
    val relevance: Double = 0.0,
)

data class ChatMessage(
    val id: Long = System.currentTimeMillis(),
    val role: String, // "user" | "assistant"
    val content: String,
    val citations: List<Citation> = emptyList(),
    val reasoning: String = "",
    val timestamp: Long = System.currentTimeMillis(),
)

// ─── Timeline ─────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class TimelineEvent(
    val id: String = "",
    @Json(name = "case_id") val caseId: String = "",
    val time: String = "",
    val title: String = "",
    val source: String = "",
    val severity: String = "info",
    val location: String = "",
    val description: String = "",
    @Json(name = "evidence_ids") val evidenceIds: List<String> = emptyList(),
)

// ─── Geo / Map ─────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class GeoMarker(
    val id: String = "",
    @Json(name = "case_id") val caseId: String = "",
    val type: String = "crime_scene",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val label: String = "",
    val note: String = "",
)

// ─── Risk score ────────────────────────────────────────────────────────────────

@JsonClass(generateAdapter = true)
data class RiskResult(
    val score: Int = 0,
    val level: String = "low",
    val confidence: Int = 0,
    @Json(name = "model_version") val modelVersion: String = "",
    @Json(name = "inference_ms") val inferenceMs: Int = 0,
    val anomalies: List<RiskAnomaly> = emptyList(),
    val recommendations: List<String> = emptyList(),
)

@JsonClass(generateAdapter = true)
data class RiskAnomaly(
    val title: String = "",
    val severity: String = "",
    val description: String = "",
)
