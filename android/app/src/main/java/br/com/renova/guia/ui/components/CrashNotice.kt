package br.com.renova.guia.ui.components

import android.content.Intent
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import br.com.renova.guia.CrashLog

/** Se o app fechou sozinho da última vez, oferece mandar o relatório (WhatsApp, e-mail…) para o conserto. */
@Composable
fun CrashNotice() {
    val context = LocalContext.current
    var report by remember { mutableStateOf(CrashLog.read(context)) }
    val text = report ?: return
    AlertDialog(
        onDismissRequest = {
            CrashLog.clear(context)
            report = null
        },
        title = { Text("O app fechou sozinho da última vez") },
        text = { Text("Mande o relatório do erro para o suporte — ele diz onde consertar. Vai só o erro técnico, sem nada de paciente.") },
        confirmButton = {
            TextButton(onClick = {
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, "Guia Renova — o app fechou")
                    putExtra(Intent.EXTRA_TEXT, text)
                }
                try {
                    context.startActivity(Intent.createChooser(send, "Mandar o relatório").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
                } catch (_: Exception) {
                }
                CrashLog.clear(context)
                report = null
            }) { Text("Mandar relatório") }
        },
        dismissButton = {
            TextButton(onClick = {
                CrashLog.clear(context)
                report = null
            }) { Text("Agora não") }
        },
    )
}
