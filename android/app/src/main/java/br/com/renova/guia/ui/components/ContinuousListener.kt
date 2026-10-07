package br.com.renova.guia.ui.components

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer

/**
 * Escuta contínua para o "Escutar o paciente": o reconhecedor de fala do
 * Android em português, reiniciado a cada pausa enquanto estiver ligado. O
 * áudio não é gravado pelo app — só o texto chega à tela.
 *
 * Cuidados que evitam o app fechar sozinho:
 * - Um reconhecedor só para a sessão inteira; a cada pausa, `startListening`
 *   de novo. Criar e destruir um por trecho derruba o serviço de voz em
 *   vários aparelhos.
 * - Nunca `cancel()` seguido de `destroy()`: o cancel vira uma mensagem que
 *   roda depois do destroy e, em várias versões do Android, estoura um
 *   NullPointerException dentro do próprio SpeechRecognizer — fora do
 *   alcance de qualquer try/catch do app. Para encerrar, só `destroy()`.
 * - Só refaz o reconhecedor nos erros que pedem (cliente, ocupado, serviço
 *   desconectado), com espera crescente.
 * - Desiste por tempo, não por contagem: 30 s seguidos sem ouvir nada e
 *   falhando. Aí a tela oferece o ditado do Google.
 *
 * Não pede reconhecimento offline: sem o pacote de português baixado, o
 * Android responde "idioma indisponível" e não ouve nada.
 */
class ContinuousListener(
    private val context: Context,
    /** Texto final de um trecho falado. */
    private val onFinal: (String) -> Unit,
    /** O trecho que ainda está sendo falado (muda a cada palavra). */
    private val onPartial: (String) -> Unit,
    private val onListening: (Boolean) -> Unit,
    private val onProblem: (String) -> Unit,
    /** O reconhecimento contínuo não funciona neste aparelho: usar o ditado. */
    private val onGiveUp: () -> Unit,
) : RecognitionListener {
    private val handler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var active = false
    /** Incrementa a cada start/stop: callbacks e reinícios de uma sessão velha são ignorados. */
    private var session = 0
    private var failures = 0
    /** Último momento em que o reconhecedor entregou texto (ou a sessão começou). */
    private var lastHeardAt = 0L

    val available: Boolean get() = SpeechRecognizer.isRecognitionAvailable(context)

    fun start() {
        if (active) return
        active = true
        session++
        failures = 0
        lastHeardAt = SystemClock.elapsedRealtime()
        onListening(true)
        if (create()) listen()
    }

    fun stop() {
        if (!active && recognizer == null) return
        active = false
        session++
        handler.removeCallbacksAndMessages(null)
        destroy()
        onPartial("")
        onListening(false)
    }

    private fun create(): Boolean = try {
        recognizer = SpeechRecognizer.createSpeechRecognizer(context).also { it.setRecognitionListener(this) }
        true
    } catch (_: Exception) {
        recognizer = null
        giveUp("o reconhecedor de voz não abriu")
        false
    }

    /** Só destroy — ver o cuidado com cancel() no comentário da classe. */
    private fun destroy() {
        val r = recognizer ?: return
        recognizer = null
        try {
            r.destroy()
        } catch (_: Exception) {
        }
    }

    private fun intent() = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "pt-BR")
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
    }

    private fun listen() {
        if (!active) return
        val r = recognizer ?: run {
            if (!create()) return
            recognizer
        } ?: return
        try {
            r.startListening(intent())
        } catch (_: Exception) {
            retry(rebuild = true)
        }
    }

    /** Volta a ouvir depois de `delayMs`, se a sessão ainda for a mesma. */
    private fun later(delayMs: Long, block: () -> Unit) {
        val mine = session
        handler.postDelayed({ if (active && mine == session) block() }, delayMs)
    }

    private fun retry(rebuild: Boolean) {
        failures++
        if (SystemClock.elapsedRealtime() - lastHeardAt > GIVE_UP_MS && failures >= 3) {
            giveUp("sem ouvir há mais de 30 segundos")
            return
        }
        val wait = (300L * failures).coerceAtMost(3000L)
        if (rebuild) {
            destroy()
            later(wait) { if (create()) listen() }
        } else {
            later(wait) { listen() }
        }
    }

    private fun giveUp(reason: String) {
        onProblem("A escuta contínua parou ($reason). Toque em Começar a ouvir de novo, use o ditado abaixo ou digite a queixa.")
        stop()
        onGiveUp()
    }

    override fun onResults(results: Bundle?) {
        if (!active) return
        failures = 0
        lastHeardAt = SystemClock.elapsedRealtime()
        results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.takeIf { it.isNotBlank() }?.let(onFinal)
        onPartial("")
        // A sessão de reconhecimento acabou sozinha: o mesmo reconhecedor ouve de novo.
        later(120) { listen() }
    }

    override fun onPartialResults(partialResults: Bundle?) {
        if (!active) return
        partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.takeIf { it.isNotBlank() }?.let {
            lastHeardAt = SystemClock.elapsedRealtime()
            onPartial(it)
        }
    }

    override fun onError(error: Int) {
        if (!active) return
        when (error) {
            // Silêncio ou nada entendido: segue ouvindo, sem contar como falha.
            SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
                onPartial("")
                later(120) { listen() }
            }
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                onProblem("Permita o uso do microfone para o app ouvir.")
                stop()
            }
            SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> {
                onProblem("Sem internet o reconhecimento de voz deste celular não funciona — digite a queixa.")
                stop()
            }
            SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> giveUp(errorName(error))
            // Erros que pedem um reconhecedor novo.
            SpeechRecognizer.ERROR_CLIENT, SpeechRecognizer.ERROR_RECOGNIZER_BUSY, SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> retry(rebuild = true)
            else -> retry(rebuild = false)
        }
    }

    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    companion object {
        private const val GIVE_UP_MS = 30_000L

        /** O código do Android em palavras, para a mensagem e para quem for investigar. */
        fun errorName(error: Int): String = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "erro de áudio, 3"
            SpeechRecognizer.ERROR_SERVER -> "erro do serviço, 4"
            SpeechRecognizer.ERROR_CLIENT -> "erro do cliente, 5"
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "reconhecedor ocupado, 8"
            SpeechRecognizer.ERROR_TOO_MANY_REQUESTS -> "pedidos demais, 10"
            SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> "serviço desconectado, 11"
            SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED -> "português não suportado, 12"
            SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "português indisponível, 13"
            else -> "erro $error"
        }
    }
}
