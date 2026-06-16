package com.aiventra.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val isAuthenticated: Boolean = false,
    val userName: String = "",
    val userEmail: String = "",
    val error: String? = null,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val auth: FirebaseAuth,
    private val db: FirebaseFirestore,
) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    init {
        auth.currentUser?.let { u ->
            _state.value = _state.value.copy(
                isAuthenticated = true,
                userName = u.displayName ?: u.email?.substringBefore("@") ?: "Investigator",
                userEmail = u.email ?: "",
            )
        }
    }

    fun login(email: String, password: String) {
        _state.value = _state.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            runCatching {
                auth.signInWithEmailAndPassword(email.trim(), password).await()
            }.onSuccess { result ->
                val u = result.user
                _state.value = AuthUiState(
                    isAuthenticated = true,
                    userName = u?.displayName ?: email.substringBefore("@"),
                    userEmail = u?.email ?: email,
                )
            }.onFailure { e ->
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = mapAuthError(e.message),
                )
            }
        }
    }

    fun register(email: String, password: String, name: String) {
        _state.value = _state.value.copy(isLoading = true, error = null)
        viewModelScope.launch {
            runCatching {
                val result = auth.createUserWithEmailAndPassword(email.trim(), password).await()
                val uid = result.user!!.uid
                db.collection("users").document(uid).set(
                    hashMapOf(
                        "email" to email,
                        "name" to name.ifBlank { email.substringBefore("@") },
                        "role" to "investigator",
                        "department" to "Forensic Investigation",
                        "platform" to "android",
                    )
                ).await()
                result
            }.onSuccess {
                _state.value = AuthUiState(
                    isAuthenticated = true,
                    userName = name.ifBlank { email.substringBefore("@") },
                    userEmail = email,
                )
            }.onFailure { e ->
                _state.value = _state.value.copy(
                    isLoading = false,
                    error = mapAuthError(e.message),
                )
            }
        }
    }

    fun logout() {
        auth.signOut()
        _state.value = AuthUiState(isAuthenticated = false)
    }

    private fun mapAuthError(msg: String?): String = when {
        msg == null -> "Authentication failed"
        msg.contains("password is invalid", true) -> "Incorrect password"
        msg.contains("no user record", true) -> "No account found for this email"
        msg.contains("email address is already", true) -> "Email already registered — try signing in"
        msg.contains("badly formatted", true) -> "Invalid email address"
        msg.contains("network", true) -> "Network error — check your connection"
        msg.contains("at least 6", true) -> "Password must be at least 6 characters"
        else -> msg
    }
}
