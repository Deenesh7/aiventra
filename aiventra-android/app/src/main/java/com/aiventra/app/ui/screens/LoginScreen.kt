package com.aiventra.app.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.aiventra.app.ui.AuthViewModel
import com.aiventra.app.ui.theme.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    authVm: AuthViewModel,
    onSuccess: () -> Unit,
) {
    val state by authVm.state.collectAsState()
    var isRegister by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }

    LaunchedEffect(state.isAuthenticated) {
        if (state.isAuthenticated) onSuccess()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Ink950)
            .padding(24.dp),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Logo / Brand
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(NeonCyan.copy(alpha = 0.12f))
                    .border(1.dp, NeonCyan.copy(alpha = 0.4f), RoundedCornerShape(18.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.Shield, contentDescription = null, tint = NeonCyan, modifier = Modifier.size(34.dp))
            }
            Spacer(Modifier.height(16.dp))
            Text(
                "AIVENTRA",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 6.sp,
                color = TextPrimary,
            )
            Text(
                "Forensic Intelligence Platform",
                fontSize = 11.sp,
                fontFamily = FontFamily.Monospace,
                color = NeonCyan.copy(alpha = 0.7f),
                letterSpacing = 2.sp,
            )
            Spacer(Modifier.height(40.dp))

            // Form card
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Ink900)
                    .border(1.dp, Ink800, RoundedCornerShape(16.dp))
                    .padding(20.dp),
            ) {
                Text(
                    if (isRegister) "Create investigator account" else "Sign in to your case dossier",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary,
                )
                Spacer(Modifier.height(20.dp))

                if (isRegister) {
                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Full name") },
                        leadingIcon = { Icon(Icons.Default.Person, null) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = forensicFieldColors(),
                        singleLine = true,
                    )
                    Spacer(Modifier.height(12.dp))
                }

                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = { Text("Email") },
                    leadingIcon = { Icon(Icons.Default.Email, null) },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    modifier = Modifier.fillMaxWidth(),
                    colors = forensicFieldColors(),
                    singleLine = true,
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = { Text("Password") },
                    leadingIcon = { Icon(Icons.Default.Lock, null) },
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                    colors = forensicFieldColors(),
                    singleLine = true,
                )

                AnimatedVisibility(state.error != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 12.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(NeonRed.copy(alpha = 0.1f))
                            .border(1.dp, NeonRed.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                            .padding(12.dp),
                    ) {
                        Text(state.error ?: "", fontSize = 12.sp, color = NeonRed)
                    }
                }

                Spacer(Modifier.height(20.dp))
                Button(
                    onClick = {
                        if (isRegister) authVm.register(email, password, name)
                        else authVm.login(email, password)
                    },
                    enabled = !state.isLoading && email.isNotBlank() && password.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = NeonCyan,
                        contentColor = Ink950,
                    ),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    if (state.isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Ink950,
                            strokeWidth = 2.dp,
                        )
                    } else {
                        Text(
                            if (isRegister) "Create account" else "Sign in",
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 1.sp,
                        )
                    }
                }
                Spacer(Modifier.height(12.dp))
                TextButton(
                    onClick = { isRegister = !isRegister },
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) {
                    Text(
                        if (isRegister) "Already have an account? Sign in"
                        else "New investigator? Create account",
                        color = NeonCyan,
                        fontSize = 12.sp,
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
            Text(
                "Decision-support software · Pathologist confirmation required",
                fontSize = 9.sp,
                fontFamily = FontFamily.Monospace,
                color = TextMuted,
                letterSpacing = 1.sp,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun forensicFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = NeonCyan,
    unfocusedBorderColor = Ink700,
    focusedLabelColor = NeonCyan,
    unfocusedLabelColor = TextSecondary,
    cursorColor = NeonCyan,
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary,
    focusedLeadingIconColor = NeonCyan,
    unfocusedLeadingIconColor = TextSecondary,
)
