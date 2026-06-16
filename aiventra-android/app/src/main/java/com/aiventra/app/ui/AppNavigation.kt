package com.aiventra.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.aiventra.app.ui.screens.*

object Routes {
    const val LOGIN = "login"
    const val DASHBOARD = "dashboard"
    const val CASES = "cases"
    const val CASE_DETAIL = "case/{caseId}"
    fun caseDetail(id: String) = "case/$id"
    const val AUTOPSY = "autopsy"
    const val IMAGE_ANALYSIS = "image"
    const val ASSISTANT = "assistant"
    const val MAP = "map/{caseId}"
    fun map(id: String) = "map/$id"
    const val TIMELINE = "timeline/{caseId}"
    fun timeline(id: String) = "timeline/$id"
}

@Composable
fun AppNavigation() {
    val authVm: AuthViewModel = hiltViewModel()
    val authState by authVm.state.collectAsState()
    val nav = rememberNavController()

    NavHost(
        navController = nav,
        startDestination = if (authState.isAuthenticated) Routes.DASHBOARD else Routes.LOGIN,
    ) {
        composable(Routes.LOGIN) {
            LoginScreen(
                authVm = authVm,
                onSuccess = {
                    nav.navigate(Routes.DASHBOARD) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.DASHBOARD) {
            DashboardScreen(
                authVm = authVm,
                onCaseClick = { id -> nav.navigate(Routes.caseDetail(id)) },
                onNavigate = { route -> nav.navigate(route) },
                onLogout = {
                    nav.navigate(Routes.LOGIN) {
                        popUpTo(Routes.DASHBOARD) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.CASES) {
            CasesScreen(
                onCaseClick = { id -> nav.navigate(Routes.caseDetail(id)) },
                onBack = { nav.popBackStack() },
            )
        }
        composable(
            route = Routes.CASE_DETAIL,
            arguments = listOf(navArgument("caseId") { type = NavType.StringType }),
        ) { backStack ->
            val caseId = backStack.arguments?.getString("caseId") ?: ""
            CaseDetailScreen(
                caseId = caseId,
                onBack = { nav.popBackStack() },
                onOpenMap = { nav.navigate(Routes.map(caseId)) },
                onOpenTimeline = { nav.navigate(Routes.timeline(caseId)) },
                onOpenAutopsy = { nav.navigate(Routes.AUTOPSY) },
                onOpenImage = { nav.navigate(Routes.IMAGE_ANALYSIS) },
                onOpenAssistant = { nav.navigate(Routes.ASSISTANT) },
            )
        }
        composable(Routes.AUTOPSY) {
            AutopsyScreen(onBack = { nav.popBackStack() })
        }
        composable(Routes.IMAGE_ANALYSIS) {
            ImageAnalysisScreen(onBack = { nav.popBackStack() })
        }
        composable(Routes.ASSISTANT) {
            AssistantScreen(onBack = { nav.popBackStack() })
        }
        composable(
            route = Routes.MAP,
            arguments = listOf(navArgument("caseId") { type = NavType.StringType }),
        ) { backStack ->
            MapScreen(
                caseId = backStack.arguments?.getString("caseId") ?: "",
                onBack = { nav.popBackStack() },
            )
        }
        composable(
            route = Routes.TIMELINE,
            arguments = listOf(navArgument("caseId") { type = NavType.StringType }),
        ) { backStack ->
            TimelineScreen(
                caseId = backStack.arguments?.getString("caseId") ?: "",
                onBack = { nav.popBackStack() },
            )
        }
    }
}
