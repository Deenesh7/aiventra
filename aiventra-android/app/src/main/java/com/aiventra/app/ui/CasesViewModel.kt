package com.aiventra.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.aiventra.app.data.model.Case
import com.aiventra.app.data.repository.AiventraRepository
import com.aiventra.app.data.repository.Result
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CasesUiState(
    val isLoading: Boolean = true,
    val cases: List<Case> = emptyList(),
    val error: String? = null,
    val filter: String = "all",  // all / active / critical / high
)

@HiltViewModel
class CasesViewModel @Inject constructor(
    private val repo: AiventraRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CasesUiState())
    val state: StateFlow<CasesUiState> = _state.asStateFlow()

    init {
        observe()
    }

    private fun observe() {
        viewModelScope.launch {
            repo.observeCases().collect { result ->
                _state.value = when (result) {
                    is Result.Loading -> _state.value.copy(isLoading = true, error = null)
                    is Result.Success -> _state.value.copy(
                        isLoading = false,
                        cases = result.data,
                        error = null,
                    )
                    is Result.Error -> _state.value.copy(
                        isLoading = false,
                        error = result.message,
                    )
                }
            }
        }
    }

    fun setFilter(filter: String) {
        _state.value = _state.value.copy(filter = filter)
    }

    fun filteredCases(): List<Case> = when (_state.value.filter) {
        "active" -> _state.value.cases.filter { it.status == "active" }
        "critical" -> _state.value.cases.filter { it.riskLevel == "critical" }
        "high" -> _state.value.cases.filter { it.riskLevel == "high" || it.riskLevel == "critical" }
        else -> _state.value.cases
    }
}
