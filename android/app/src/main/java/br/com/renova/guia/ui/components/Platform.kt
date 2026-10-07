package br.com.renova.guia.ui.components

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.platform.LocalContext

/** Abre o "Compartilhar" do Android (WhatsApp, e-mail…) com o texto. */
fun shareText(context: Context, text: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, text)
    }
    context.startActivity(Intent.createChooser(intent, "Enviar"))
}

/** Copia o texto (o Android 13+ já mostra o aviso de "copiado"). */
fun copyText(context: Context, label: String, text: String) {
    val clipboard = context.getSystemService(ClipboardManager::class.java) ?: return
    clipboard.setPrimaryClip(ClipData.newPlainText(label, text))
    if (Build.VERSION.SDK_INT < 33) Toast.makeText(context, "Copiado", Toast.LENGTH_SHORT).show()
}

/**
 * Pergunta por voz: o reconhecedor de fala do aparelho, em português. Volta
 * null se o aparelho não tem reconhecedor (aí o botão do microfone some).
 */
@Composable
fun rememberVoiceInput(onResult: (String) -> Unit): (() -> Unit)? {
    val context = LocalContext.current
    val available = remember { SpeechRecognizer.isRecognitionAvailable(context) }
    val latest by rememberUpdatedState(onResult)
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val text = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        if (result.resultCode == Activity.RESULT_OK && !text.isNullOrBlank()) latest(text)
    }
    if (!available) return null
    return {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Fale a pergunta para a Super Inteligência")
        }
        try {
            launcher.launch(intent)
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(context, "Este aparelho não tem reconhecimento de voz.", Toast.LENGTH_SHORT).show()
        }
    }
}
