package com.aiventra.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.aiventra.app.ui.AppNavigation
import com.aiventra.app.ui.theme.AiventraTheme
import com.aiventra.app.ui.theme.Ink950
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            AiventraTheme {
                Surface(
                    modifier = Modifier.fillMaxSize().background(Ink950),
                    color = Ink950,
                ) {
                    AppNavigation()
                }
            }
        }
    }
}
