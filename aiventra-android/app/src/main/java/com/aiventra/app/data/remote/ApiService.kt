package com.aiventra.app.data.remote

import com.aiventra.app.data.model.*
import okhttp3.MultipartBody
import retrofit2.Response
import retrofit2.http.*

interface AiventraApiService {

    // ── Autopsy ──────────────────────────────────────────────────────────────
    @Multipart
    @POST("reports/analyze")
    suspend fun analyzeAutopsy(
        @Part file: MultipartBody.Part,
        @Part("case_id") caseId: okhttp3.RequestBody? = null,
    ): Response<AutopsyResult>

    // ── Image / body chart ────────────────────────────────────────────────────
    @Multipart
    @POST("images/generate-body-chart")
    suspend fun generateBodyChart(
        @Part file: MultipartBody.Part,
    ): Response<ImageAnalysisResult>

    // ── AI Assistant ──────────────────────────────────────────────────────────
    @POST("assistant/ask")
    suspend fun askAssistant(
        @Body request: AssistantRequest,
    ): Response<AssistantResponse>

    // ── Timeline ──────────────────────────────────────────────────────────────
    @GET("timeline/{caseId}")
    suspend fun getTimeline(
        @Path("caseId") caseId: String,
    ): Response<TimelineResponse>

    // ── Risk score ────────────────────────────────────────────────────────────
    @GET("risk/score/{caseId}")
    suspend fun getRiskScore(
        @Path("caseId") caseId: String,
    ): Response<RiskResult>

    // ── Health ────────────────────────────────────────────────────────────────
    @GET("health")
    suspend fun health(): Response<Map<String, Any>>
}

data class TimelineResponse(
    val caseId: String,
    val events: List<com.aiventra.app.data.model.TimelineEvent>,
)
