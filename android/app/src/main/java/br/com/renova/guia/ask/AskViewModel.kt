package br.com.renova.guia.ask

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import br.com.renova.guia.data.ApiClient
import br.com.renova.guia.data.AskEvent
import br.com.renova.guia.data.AskSource
import br.com.renova.guia.data.AskTurn
import br.com.renova.guia.data.TokenStore
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Uma pergunta e a resposta, que chega aos poucos. */
data class Exchange(
    val question: String,
    val answer: String = "",
    val searches: List<String> = emptyList(),
    val sources: List<AskSource> = emptyList(),
    val error: String? = null,
    val done: Boolean = false,
    /** Veio da memória de respostas: quando foi dada. */
    val cachedAt: String? = null,
)

/**
 * A conversa com a Super Inteligência: cada pergunta vai ao servidor do
 * Renova (que tem a chave do Gemini e o guia) com as anteriores, para as
 * perguntas de seguimento ("e em criança?").
 */
class AskViewModel(
    private val api: ApiClient,
    private val tokens: TokenStore,
    private val onUnauthorized: () -> Unit,
) : ViewModel() {
    private val _thread = MutableStateFlow<List<Exchange>>(emptyList())
    val thread: StateFlow<List<Exchange>> = _thread.asStateFlow()

    private var job: Job? = null

    val busy: Boolean get() = _thread.value.lastOrNull()?.done == false

    fun ask(question: String, fresh: Boolean = false) {
        val q = question.trim()
        if (q.length < 3 || busy) return
        val account = tokens.load()
        if (account == null) {
            onUnauthorized()
            return
        }
        // "Perguntar de novo" é pergunta nova e solta: sem a conversa, para não repetir a resposta guardada.
        val history = if (fresh) emptyList() else _thread.value.filter { it.done && it.answer.isNotBlank() }.flatMap {
            listOf(AskTurn("user", it.question), AskTurn("assistant", it.answer))
        }.takeLast(6)
        _thread.value = _thread.value + Exchange(q)
        job = viewModelScope.launch {
            api.ask(account.token, q, history, fresh).collect { event ->
                when (event) {
                    is AskEvent.Search -> update { it.copy(searches = it.searches + event.query) }
                    is AskEvent.Text -> update { it.copy(answer = it.answer + event.delta) }
                    is AskEvent.Sources -> update { it.copy(sources = event.items) }
                    is AskEvent.Cached -> update { it.copy(cachedAt = event.at) }
                    is AskEvent.Error -> {
                        update { it.copy(error = event.message, done = true) }
                        if (event.unauthorized) onUnauthorized()
                    }
                    AskEvent.Done -> update { it.copy(done = true) }
                }
            }
            // A conexão fechou sem "done" (servidor caiu no meio): encerra a resposta como está.
            update { if (it.done) it else it.copy(done = true, error = if (it.answer.isBlank()) "A resposta não chegou. Tente de novo." else it.error) }
        }
    }

    fun stop() {
        job?.cancel()
        update { if (it.done) it else it.copy(done = true) }
    }

    fun newConversation() {
        job?.cancel()
        _thread.value = emptyList()
    }

    private fun update(change: (Exchange) -> Exchange) {
        val list = _thread.value
        if (list.isEmpty()) return
        _thread.value = list.dropLast(1) + change(list.last())
    }
}
