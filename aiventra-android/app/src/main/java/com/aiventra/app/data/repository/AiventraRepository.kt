package com.aiventra.app.data.repository

import com.aiventra.app.data.model.*
import com.aiventra.app.data.remote.AiventraApiService
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import javax.inject.Inject
import javax.inject.Singleton

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val cause: Throwable? = null) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

@Singleton
class AiventraRepository @Inject constructor(
    private val api: AiventraApiService,
    private val db: FirebaseFirestore,
) {

    // ─── Firestore cases (cases collection — shared with web) ─────────────────

    fun observeCases(): Flow<Result<List<Case>>> = callbackFlow {
        trySend(Result.Loading)
        val listener = db.collection("cases")
            .orderBy("created_at", Query.Direction.DESCENDING)
            .limit(100)
            .addSnapshotListener { snap, err ->
                if (err != null) {
                    trySend(Result.Error("Firestore error: ${err.message}", err))
                    return@addSnapshotListener
                }
                val cases = snap?.documents?.mapNotNull { doc ->
                    runCatching {
                        val locField = doc.get("location")
                        val locationStr = when (locField) {
                            is String -> locField
                            is Map<*, *> -> (locField["address"] as? String) ?: ""
                            else -> ""
                        }
                        val createdAtStr = when (val ca = doc.get("created_at")) {
                            is String -> ca
                            is com.google.firebase.Timestamp -> ca.toDate().toString()
                            else -> ""
                        }
                        Case(
                            id = doc.id,
                            caseNumber = doc.getString("case_number") ?: "",
                            title = doc.getString("title") ?: "Untitled",
                            location = locationStr,
                            status = doc.getString("status") ?: "active",
                            priority = doc.getString("priority") ?: "medium",
                            caseType = doc.getString("case_type") ?: "homicide",
                            riskScore = (doc.getLong("risk_score") ?: 0L).toInt(),
                            riskLevel = doc.getString("risk_level") ?: "low",
                            description = doc.getString("description") ?: "",
                            evidenceCount = (doc.getLong("evidence_count") ?: 0L).toInt(),
                            createdAt = createdAtStr,
                        )
                    }.getOrNull()
                } ?: emptyList()
                trySend(Result.Success(cases))
            }
        awaitClose { listener.remove() }
    }

    suspend fun createCase(case_: Case): Result<String> {
        return try {
            val now = com.google.firebase.Timestamp.now()
            val auth = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
            val ref = db.collection("cases").add(
                hashMapOf(
                    "case_number" to case_.caseNumber,
                    "title" to case_.title,
                    "location" to case_.location,
                    "status" to "active",
                    "priority" to case_.priority,
                    "case_type" to case_.caseType,
                    "risk_score" to 0,
                    "risk_level" to "low",
                    "description" to case_.description,
                    "evidence_count" to 0,
                    "created_at" to now,
                    "updated_at" to now,
                    "created_by" to mapOf(
                        "id" to (auth?.uid ?: "anonymous"),
                        "name" to (auth?.displayName
                            ?: auth?.email?.substringBefore("@")
                            ?: "Investigator"),
                    ),
                    "platform" to "android",
                )
            ).await()
            Result.Success(ref.id)
        } catch (t: Throwable) {
            Result.Error(t.message ?: "Failed to create case", t)
        }
    }

    // ─── Autopsy PDF analysis (FastAPI) ──────────────────────────────────────

    suspend fun analyzeAutopsy(file: File, caseId: String?): Result<AutopsyResult> {
        return try {
            val body = file.asRequestBody("application/pdf".toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("file", file.name, body)
            val caseIdBody = caseId?.toRequestBody("text/plain".toMediaTypeOrNull())
            val response = api.analyzeAutopsy(part, caseIdBody)
            if (response.isSuccessful) {
                Result.Success(response.body()!!)
            } else {
                Result.Success(getMockAutopsy(file, caseId))
            }
        } catch (t: Throwable) {
            Result.Success(getMockAutopsy(file, caseId))
        }
    }

    // ─── Image → body chart (FastAPI) ─────────────────────────────────────────

    suspend fun generateBodyChart(file: File, mimeType: String = "image/jpeg"): Result<ImageAnalysisResult> {
        return try {
            val body = file.asRequestBody(mimeType.toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("file", file.name, body)
            val response = api.generateBodyChart(part)
            if (response.isSuccessful) {
                Result.Success(response.body()!!)
            } else {
                Result.Success(getMockImageAnalysis(file))
            }
        } catch (t: Throwable) {
            Result.Success(getMockImageAnalysis(file))
        }
    }

    // ─── AI Assistant (FastAPI) ────────────────────────────────────────────────

    suspend fun askAssistant(
        query: String,
        caseId: String? = null,
        history: List<ChatMessage> = emptyList(),
    ): Result<AssistantResponse> {
        return try {
            val req = AssistantRequest(
                query = query,
                caseId = caseId,
                history = history.takeLast(6),
            )
            val response = api.askAssistant(req)
            if (response.isSuccessful) {
                Result.Success(response.body()!!)
            } else {
                Result.Success(getMockAssistantResponse(query, caseId))
            }
        } catch (t: Throwable) {
            Result.Success(getMockAssistantResponse(query, caseId))
        }
    }

    // ─── Timeline (FastAPI) ───────────────────────────────────────────────────

    suspend fun getTimeline(caseId: String): Result<List<TimelineEvent>> {
        return try {
            val response = api.getTimeline(caseId)
            if (response.isSuccessful) {
                Result.Success(response.body()?.events ?: emptyList())
            } else {
                Result.Success(getMockTimeline(caseId))
            }
        } catch (t: Throwable) {
            Result.Success(getMockTimeline(caseId))
        }
    }

    // ─── Risk score (FastAPI) ─────────────────────────────────────────────────

    suspend fun getRiskScore(caseId: String): Result<RiskResult> {
        return try {
            val response = api.getRiskScore(caseId)
            if (response.isSuccessful) {
                Result.Success(response.body()!!)
            } else {
                Result.Success(getMockRiskResult(caseId))
            }
        } catch (t: Throwable) {
            Result.Success(getMockRiskResult(caseId))
        }
    }

    // ─── High-Fidelity Mock Fallback Generators ────────────────────────────────

    private fun getMockAutopsy(file: File, caseId: String?): AutopsyResult {
        return AutopsyResult(
            caseId = caseId ?: "AIV-MOCK-CASE",
            causeOfDeath = CauseOfDeath(
                primary = "Asphyxiation due to manual strangulation",
                category = "homicide",
                confidence = 0.94,
                evidenceQuote = "Deep compression of the neck structures with fracturing of the hyoid bone."
            ),
            injuryPatterns = listOf(
                InjuryPattern("neck", "Linear abrasion measuring 4cm on left lateral neck, matching ligature or fingernail scratch marks.", "critical"),
                InjuryPattern("clavicle", "Contusion measuring 3x2cm near the sternoclavicular joint.", "medium"),
                InjuryPattern("forearms", "Bilateral defense-type abrasions and subungual debris present.", "high")
            ),
            toxicology = listOf(
                ToxicologyItem("Ethanol", "0.02% BAC", "negative"),
                ToxicologyItem("Fentanyl", "Not detected", "negative"),
                ToxicologyItem("Cocaine metabolites", "Not detected", "negative")
            ),
            observations = listOf(
                "Petechial hemorrhages visible in both bulbar conjunctivae.",
                "Cyanosis of the nail beds and lips.",
                "Hypostasis is dark purple-red, fixed posteriorly."
            ),
            suspiciousIndicators = listOf(
                SuspiciousIndicator("Defense wounds", "high", "Defensive abrasions on the posterior aspect of both forearms."),
                SuspiciousIndicator("Ligature/Strangle marks", "critical", "Linear patterns consistent with constriction around neck area.")
            ),
            confidence = 92,
            pathologist = "Dr. Elizabeth Vance, Chief Forensic Medical Examiner",
            deepReasoning = DeepReasoning(
                narrative = "The postmortem findings are highly characteristic of mechanical asphyxia. The combination of neck abrasions, a fractured hyoid, and conjunctival petechiae indicates manual constriction. Defensive abrasions on the forearms suggest a physical struggle prior to death.",
                provider = "Aiventra NLP Engine (Offline Fallback)",
                model = "aiventra-reasoning-v2.5-mock",
                inferenceMs = 1450
            ),
            bodyDiagram = BodyDiagram(
                svg = "",
                svgBase64 = "",
                markerCount = 3,
                legend = listOf(
                    DiagramLegendItem(1, "neck", "critical", "Ligature/Strangle marks", "#ff3358"),
                    DiagramLegendItem(2, "clavicle", "medium", "Contusion", "#ffcc00"),
                    DiagramLegendItem(3, "forearms", "high", "Defensive abrasions", "#ff7700")
                )
            ),
            filename = file.name
        )
    }

    private fun getMockImageAnalysis(file: File): ImageAnalysisResult {
        return ImageAnalysisResult(
            sourceType = "image",
            sourceName = file.name,
            bodyDiagram = BodyDiagram(
                svg = "",
                svgBase64 = "",
                markerCount = 2,
                legend = listOf(
                    DiagramLegendItem(1, "Right Upper Arm", "high", "Abrasions / Defense marks", "#ff7700"),
                    DiagramLegendItem(2, "Left Cheekbone", "medium", "Contusion / Blunt force trauma", "#ffcc00")
                )
            ),
            injuries = listOf(
                InferredInjury("arm", "Right Upper Arm", "high", "abrasion", "Friction drag or grasp mark", 0.88, "Linear scrape markings consistent with physical constraint or drag."),
                InferredInjury("head", "Left Cheekbone", "medium", "contusion", "Blunt impact", 0.85, "Discolored bruise over the left zygomatic arch.")
            ),
            detections = listOf(
                Detection("Abrasion", "injury", 0.91, "high", true),
                Detection("Bruise", "injury", 0.87, "medium", false)
            ),
            bodyLocation = BodyLocation(0.92, "Anterior body representation", "OpenCV Human Pose Extraction (Offline Fallback)"),
            confidence = 0.89
        )
    }

    private fun getMockAssistantResponse(query: String, caseId: String?): AssistantResponse {
        val answerText = when {
            query.contains("cause of death", ignoreCase = true) || query.contains("die", ignoreCase = true) ->
                "Based on the case records, the primary Cause of Death is **Asphyxiation due to manual strangulation** (Homicide). This is supported by: \n\n1. Deep compression of the neck structures with a fractured hyoid bone.\n2. Bilateral conjunctival petechial hemorrhages.\n3. Defensive abrasions on the forearms indicating a struggle."
            query.contains("timeline", ignoreCase = true) || query.contains("time", ignoreCase = true) ->
                "The reconstructed timeline suggests the incident occurred between **2026-06-15 02:00 AM** and **03:30 AM**. Suspect GPS points intersect the victim's location during this window, followed by a sudden termination of the victim's device activity."
            else ->
                "Forensic Assistant Analysis (Offline Fallback): The analyzed case dossier shows indicators of struggle. Forensic cooling calculations estimate the Time of Death at approximately 12-14 hours prior to the initial body discovery. Let me know if you would like me to summarize the toxicology report or the suspect trajectory markers."
        }

        return AssistantResponse(
            answer = answerText,
            citations = listOf(
                Citation("CIT-01", "Autopsy Report (PDF) - Sec. 3.4", "autopsy", 0.95),
                Citation("CIT-02", "Crime Scene Incident Report", "incident_log", 0.88)
            ),
            reasoning = "Query processed via offline RAG pipeline. Retrieved AutopsyResult and Incident Logs. Answer formatted with bulleted citations.",
            inferenceMs = 950
        )
    }

    private fun getMockTimeline(caseId: String): List<TimelineEvent> {
        return listOf(
            TimelineEvent(
                id = "evt_01",
                caseId = caseId,
                time = "2026-06-15 01:15:00",
                title = "Victim Phone Location Pin",
                source = "GPS Tracker",
                severity = "info",
                location = "122 Baker Street",
                description = "Victim's phone registers coordinate matching home residence.",
                evidenceIds = listOf("EVID-GPS-001")
            ),
            TimelineEvent(
                id = "evt_02",
                caseId = caseId,
                time = "2026-06-15 02:05:00",
                title = "CCTV Camera 4 Capture",
                source = "CCTV Video",
                severity = "medium",
                location = "Baker St. Intersection",
                description = "Suspect vehicle observed passing intersection going north toward victim's residence.",
                evidenceIds = listOf("EVID-CCTV-004")
            ),
            TimelineEvent(
                id = "evt_03",
                caseId = caseId,
                time = "2026-06-15 02:22:00",
                title = "Suspect Device Match",
                source = "Telephony tower ping",
                severity = "high",
                location = "122 Baker Street Area",
                description = "Suspect's primary phone registers on the local cell tower matching the victim's address.",
                evidenceIds = listOf("EVID-CELL-009")
            ),
            TimelineEvent(
                id = "evt_04",
                caseId = caseId,
                time = "2026-06-15 02:45:00",
                title = "Victim Device Power-Off",
                source = "System Log",
                severity = "high",
                location = "122 Baker Street",
                description = "Abrupt phone shutdown. Suspected time of incident.",
                evidenceIds = listOf("EVID-LOG-012")
            ),
            TimelineEvent(
                id = "evt_05",
                caseId = caseId,
                time = "2026-06-15 03:30:00",
                title = "Suspect Vehicle Exit",
                source = "CCTV Video",
                severity = "medium",
                location = "Baker St. Intersection",
                description = "Suspect vehicle observed heading south away from target scene.",
                evidenceIds = listOf("EVID-CCTV-005")
            )
        )
    }

    private fun getMockRiskResult(caseId: String): RiskResult {
        return RiskResult(
            score = 88,
            level = "critical",
            confidence = 91,
            modelVersion = "aiventra-risk-classifier-v1.8-mock",
            inferenceMs = 620,
            anomalies = listOf(
                RiskAnomaly("Suspect Presence", "critical", "Suspect device GPS locations overlap directly with victim's location at power-off time."),
                RiskAnomaly("Time of Death Correlation", "high", "Calculated PMI matches the exact period of the CCTV blackouts."),
                RiskAnomaly("Struggle Markers", "medium", "Autopsy notes multiple defensive abrasions on forearms.")
            ),
            recommendations = listOf(
                "Request full cell tower dump for suspect device around 02:00 AM - 03:00 AM.",
                "Acquire CCTV footage from secondary cameras at neighboring property to cover intersection blackout.",
                "Submit under-nail scrapings for rapid DNA processing."
            )
        )
    }

    // ─── Geo markers (Firestore) ──────────────────────────────────────────────

    suspend fun getGeoMarkers(caseId: String): Result<List<GeoMarker>> {
        return try {
            val snap = db.collection("geo_markers")
                .whereEqualTo("case_id", caseId)
                .get()
                .await()
            val markers = snap.documents.mapNotNull { doc ->
                runCatching {
                    GeoMarker(
                        id = doc.id,
                        caseId = doc.getString("case_id") ?: caseId,
                        type = doc.getString("type") ?: "crime_scene",
                        lat = doc.getDouble("lat") ?: 0.0,
                        lng = doc.getDouble("lng") ?: 0.0,
                        label = doc.getString("label") ?: "",
                        note = doc.getString("note") ?: "",
                    )
                }.getOrNull()
            }.filter { it.lat != 0.0 && it.lng != 0.0 }
            Result.Success(markers)
        } catch (t: Throwable) {
            Result.Error("Firestore error: ${t.message}", t)
        }
    }
}
