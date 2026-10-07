package br.com.renova.guia

import android.content.Context
import android.os.Build
import java.io.File
import java.io.PrintWriter
import java.io.StringWriter
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Quando o app fecha sozinho, guarda o erro num arquivo do próprio app; na
 * próxima abertura a tela oferece mandar o relatório (texto, sem dado de
 * paciente — só a pilha do erro, a versão do app e o modelo do celular).
 * Sem isso, "abre e depois fecha" não dá para consertar de longe.
 */
object CrashLog {
    private const val FILE = "ultimo-erro.txt"
    private const val MAX = 12_000

    fun install(context: Context) {
        val app = context.applicationContext
        val previous = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            try {
                write(app, thread, error)
            } catch (_: Throwable) {
            }
            previous?.uncaughtException(thread, error)
        }
    }

    private fun write(context: Context, thread: Thread, error: Throwable) {
        val trace = StringWriter().also { error.printStackTrace(PrintWriter(it)) }.toString()
        val text = buildString {
            appendLine("Guia Renova ${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})")
            appendLine("Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT}) · ${Build.MANUFACTURER} ${Build.MODEL}")
            appendLine("Quando: ${SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(Date())} · thread ${thread.name}")
            appendLine()
            append(trace)
        }
        File(context.filesDir, FILE).writeText(text.take(MAX))
    }

    /** O relatório da última vez que o app fechou sozinho, se houver. */
    fun read(context: Context): String? = File(context.filesDir, FILE).takeIf { it.exists() }?.readText()

    fun clear(context: Context) {
        File(context.filesDir, FILE).delete()
    }
}
