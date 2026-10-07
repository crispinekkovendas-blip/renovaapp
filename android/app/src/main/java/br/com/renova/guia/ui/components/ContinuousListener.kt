package br.com.renova.guia.ui.components

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer

/**
 * Escuta contínua para o "Escutar o paciente": o reconhecedor de fala do
 * Android em português, reiniciado a cada pausa enquanto estiver ligado. O
 * áudio não é gravado pelo app — só o texto chega à tela.
 *
 * Um reconhecedor novo a cada trecho: reaproveitar o mesmo depois de um
 * resultado ou erro dá ERROR_CLIENT/BUSY em muitos aparelhos. Não pede
 * reconhecimento offline: sem o pacote de português baixado, o Android
 * responde "idioma indisponível" e não ouve nada. Se falhar várias vezes,
 * avisa a tela (`onGiveUp`), que oferece o ditado do Google.
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
    private var failures = 0
    private var heardSomething = false

    val available: Boolean get() = SpeechRecognizer.isRecognitionAvailable(context)

    fun start() {
        if (active) return
        active = true
        failures = 0
        heardSomething = false
        onListening(true)
        listen()
    }

    fun stop() {
        active = false
        handler.removeCallbacksAndMessages(null)
        release()
        onPartial("")
        onListening(false)
    }

    private fun release() {
        recognizer?.let {
            try {
                it.cancel()
                it.destroy()
            } catch (_: Exception) {
            }
        }
        recognizer = null
    }

    private fun listen() {
        if (!active) return
        release()
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "pt-BR")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
        }
        try {
            recognizer = SpeechRecognizer.createSpeechRecognizer(context).also {
                it.setRecognitionListener(this)
                it.startListening(intent)
            }
        } catch (_: Exception) {
            fail("o reconhecedor de voz não abriu")
        }
    }

    private fun restart(delayMs: Long) {
        if (active) handler.postDelayed({ listen() }, delayMs)
    }

    private fun fail(reason: String) {
        failures++
        if (failures >= 3) {
            onProblem("A escuta contínua não funcionou neste celular ($reason). Use o ditado abaixo ou digite a queixa.")
            stop()
            onGiveUp()
        } else {
            restart(700L * failures)
        }
    }

    override fun onResults(results: Bundle?) {
        failures = 0
        results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.takeIf { it.isNotBlank() }?.let {
            heardSomething = true
            onFinal(it)
        }
        onPartial("")
        restart(150)
    }

    override fun onPartialResults(partialResults: Bundle?) {
        partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.takeIf { it.isNotBlank() }?.let {
            heardSomething = true
            onPartial(it)
        }
    }

    override fun onError(error: Int) {
        if (!active) return
        when (error) {
            // Silêncio ou nada entendido: segue ouvindo.
            SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
                if (heardSomething) failures = 0
                restart(150)
            }
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                onProblem("Permita o uso do microfone para o app ouvir.")
                stop()
            }
            SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> {
                onProblem("Sem internet o reconhecimento de voz deste celular não funciona — digite a queixa.")
                stop()
            }
            else -> fail(errorName(error))
        }
    }

    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    companion object {
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
