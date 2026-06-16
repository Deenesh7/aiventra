package com.aiventra.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Send
import androidx.compose.material.icons.filled.SmartToy
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.aiventra.app.data.model.ChatMessage
import com.aiventra.app.ui.AnalysisViewModel
import com.aiventra.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AssistantScreen(
    onBack: () -> Unit,
    vm: AnalysisViewModel = hiltViewModel(),
) {
    val state by vm.assistant.collectAsState()
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()

    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) listState.animateScrollToItem(state.messages.size - 1)
    }

    Scaffold(
        containerColor = Ink950,
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("AI Assistant", fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Text(
                            if (state.isThinking) "Thinking…" else "Grounded · case-aware",
                            fontSize = 10.sp,
                            color = if (state.isThinking) NeonAmber else NeonGreen,
                            fontFamily = FontFamily.Monospace,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back", tint = TextSecondary) }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Ink900),
            )
        },
        bottomBar = {
            Surface(color = Ink900, tonalElevation = 4.dp) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    OutlinedTextField(
                        value = input,
                        onValueChange = { input = it },
                        placeholder = { Text("Ask about the case…", fontSize = 13.sp) },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(20.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NeonCyan,
                            unfocusedBorderColor = Ink700,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            cursorColor = NeonCyan,
                        ),
                        maxLines = 3,
                    )
                    Spacer(Modifier.width(8.dp))
                    FilledIconButton(
                        onClick = {
                            if (input.isNotBlank() && !state.isThinking) {
                                vm.sendMessage(input)
                                input = ""
                            }
                        },
                        enabled = input.isNotBlank() && !state.isThinking,
                        colors = IconButtonDefaults.filledIconButtonColors(
                            containerColor = NeonCyan,
                            contentColor = Ink950,
                            disabledContainerColor = Ink700,
                        ),
                    ) { Icon(Icons.Default.Send, "Send") }
                }
            }
        },
    ) { padding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(padding).padding(horizontal = 12.dp),
            state = listState,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item { Spacer(Modifier.height(8.dp)) }
            items(items = state.messages, key = { it.id }) { msg -> ChatBubble(msg) }
            if (state.isThinking) {
                item { ThinkingBubble() }
            }
            state.error?.let { err ->
                item {
                    Box(
                        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp))
                            .background(NeonRed.copy(alpha = 0.1f))
                            .border(1.dp, NeonRed.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                            .padding(12.dp),
                    ) {
                        Text(err, fontSize = 12.sp, color = NeonRed)
                    }
                }
            }
            item { Spacer(Modifier.height(16.dp)) }
        }
    }
}

@Composable
private fun ChatBubble(msg: ChatMessage) {
    val isUser = msg.role == "user"
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
    ) {
        if (!isUser) {
            AvatarIcon(icon = Icons.Default.SmartToy, tint = NeonCyan)
            Spacer(Modifier.width(8.dp))
        }
        Column(
            modifier = Modifier
                .widthIn(max = 320.dp)
                .clip(
                    RoundedCornerShape(
                        topStart = 14.dp,
                        topEnd = 14.dp,
                        bottomStart = if (isUser) 14.dp else 4.dp,
                        bottomEnd = if (isUser) 4.dp else 14.dp,
                    )
                )
                .background(if (isUser) NeonCyan.copy(alpha = 0.12f) else Ink900)
                .border(
                    1.dp,
                    if (isUser) NeonCyan.copy(alpha = 0.25f) else Ink800,
                    RoundedCornerShape(
                        topStart = 14.dp,
                        topEnd = 14.dp,
                        bottomStart = if (isUser) 14.dp else 4.dp,
                        bottomEnd = if (isUser) 4.dp else 14.dp,
                    )
                )
                .padding(12.dp),
        ) {
            Text(
                msg.content,
                fontSize = 13.sp,
                color = TextPrimary,
                lineHeight = 19.sp,
            )
            if (msg.citations.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                FlowRow {
                    msg.citations.forEach { c ->
                        Text(
                            "[${c.id}]",
                            fontSize = 10.sp,
                            fontFamily = FontFamily.Monospace,
                            color = NeonCyan,
                            modifier = Modifier.padding(end = 4.dp),
                        )
                    }
                }
            }
        }
        if (isUser) {
            Spacer(Modifier.width(8.dp))
            AvatarIcon(icon = Icons.Default.Person, tint = Violet)
        }
    }
}

@Composable
private fun ThinkingBubble() {
    Row(verticalAlignment = Alignment.CenterVertically) {
        AvatarIcon(icon = Icons.Default.SmartToy, tint = NeonCyan)
        Spacer(Modifier.width(8.dp))
        Row(
            modifier = Modifier.clip(RoundedCornerShape(14.dp)).background(Ink900).padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = NeonCyan)
            Spacer(Modifier.width(8.dp))
            Text("Assistant is thinking…", fontSize = 12.sp, color = TextSecondary)
        }
    }
}

@Composable
private fun AvatarIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, tint: Color) {
    Box(
        modifier = Modifier.size(28.dp).clip(RoundedCornerShape(14.dp)).background(tint.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center,
    ) { Icon(icon, null, tint = tint, modifier = Modifier.size(16.dp)) }
}

@Composable
private fun FlowRow(content: @Composable () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth()) { content() }
}
