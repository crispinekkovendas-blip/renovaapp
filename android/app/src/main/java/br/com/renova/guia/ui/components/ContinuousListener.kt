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
 * Android em português, reiniciado a cada pausa enquanto estiver ligado.
 * Pede o reconhecimento no aparelho (offline) quando há; o áudio não é
 * gravado pelo app — só o texto chega à tela.
 */
class ContinuousListener(
    private val context: Context,
    /** Texto final de um trecho falado. */
    private val onFinal: (String) -> Unit,
    /** O trecho que ainda está sendo falado (muda a cada palavra). */
    private val onPartial: (String) -> Unit,
    private val onListening: (Boolean) -> Unit,
    private val onProblem: (String) -> Unit,
) : RecognitionListener {
    private val handler = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private var active = false
    private var failures = 0

    val available: Boolean get() = SpeechRecognizer.isRecognitionAvailable(context)

    fun start() {
        if (active) return
        active = true
        failures = 0
        recognizer = SpeechRecognizer.createSpeechRecognizer(context).also { it.setRecognitionListener(this) }
        listen()
        onListening(true)
    }

    fun stop() {
        active = false
        handler.removeCallbacksAndMessages(null)
        recognizer?.let {
            it.stopListening()
            it.destroy()
        }
        recognizer = null
        onPartial("")
        onListening(false)
    }

    private fun listen() {
        if (!active) return
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L)
        }
        try {
            recognizer?.startListening(intent)
        } catch (_: Exception) {
            restart(500)
        }
    }

    private fun restart(delayMs: Long) {
        if (active) handler.postDelayed({ listen() }, delayMs)
    }

    override fun onResults(results: Bundle?) {
        failures = 0
        results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.takeIf { it.isNotBlank() }?.let(onFinal)
        onPartial("")
        restart(200)
    }

    override fun onPartialResults(partialResults: Bundle?) {
        partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let(onPartial)
    }

    override fun onError(error: Int) {
        if (!active) return
        when (error) {
            SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> restart(150)
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> restart(600)
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                onProblem("Permita o uso do microfone para o app ouvir.")
                stop()
            }
            else -> {
                failures++
                if (failures >= 5) {
                    onProblem("O reconhecimento de voz parou (erro $error). Toque de novo para ouvir, ou digite a queixa.")
                    stop()
                } else {
                    restart(800)
                }
            }
        }
    }

    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onEvent(eventType: Int, params: Bundle?) {}
}
