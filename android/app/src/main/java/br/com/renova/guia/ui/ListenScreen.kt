package br.com.renova.guia.ui

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import br.com.renova.guia.data.GuideContent
import br.com.renova.guia.search.SymptomMatcher
import br.com.renova.guia.ui.components.ContinuousListener
import br.com.renova.guia.ui.components.MutedText
import br.com.renova.guia.ui.components.Pill
import br.com.renova.guia.ui.components.SourcePill
import br.com.renova.guia.ui.theme.GuideTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/**
 * "Escutar o paciente": o celular ouve a queixa (ou o médico digita) e o
 * app mostra as condições do guia que combinam, com as queixas que casaram e
 * os itens das três abas. Tudo no aparelho: o texto não vai a lugar nenhum,
 * a não ser que o médico leve as queixas à Super Inteligência.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ListenScreen(content: GuideContent, onOpen: (String) -> Unit, onAsk: (String) -> Unit, onBack: () -> Unit) {
    val context = LocalContext.current
    var text by rememberSaveable { mutableStateOf("") }
    var partial by remember { mutableStateOf("") }
    var listening by remember { mutableStateOf(false) }
    var problem by remember { mutableStateOf<String?>(null) }
    val listener = remember {
        ContinuousListener(
            context,
            onFinal = { heard -> text = if (text.isBlank()) heard else "${text.trimEnd()}. $heard" },
            onPartial = { partial = it },
            onListening = { listening = it },
            onProblem = { problem = it },
        )
    }
    DisposableEffect(Unit) { onDispose { listener.stop() } }
    val permission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) listener.start() else problem = "Sem o microfone o app não ouve — dá para digitar a queixa."
    }
    fun toggle() {
        problem = null
        when {
            listening -> listener.stop()
            !listener.available -> problem = "Este aparelho não tem reconhecimento de voz — digite a queixa."
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED -> listener.start()
            else -> permission.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    val heard = (text + " " + partial).trim()
    val matches by produceState(emptyList<SymptomMatcher.Match>(), heard, content) {
        if (heard.length < 3) {
            value = emptyList()
            return@produceState
        }
        delay(250)
        value = withContext(Dispatchers.Default) { content.listener.rank(heard) }
    }

    ScreenScaffold(
        title = "Escutar o paciente",
        onBack = onBack,
        actions = {
            if (text.isNotEmpty()) {
                IconButton(onClick = { text = ""; partial = "" }) { Icon(Icons.Filled.DeleteSweep, contentDescription = "Apagar o texto") }
            }
        },
    ) { padding ->
        LazyColumn(
            Modifier.padding(padding).fillMaxSize().testTag("listen"),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            item {
                MutedText(
                    "O app ouve a queixa como o paciente conta e mostra onde olhar no guia — apoio à decisão, não diagnóstico. " +
                        "Nada é gravado: o texto fica só nesta tela. Avise o paciente que o celular está ouvindo.",
                )
            }
            item {
                Button(
                    onClick = { toggle() },
                    modifier = Modifier.fillMaxWidth().testTag("listen-toggle"),
                    colors = if (listening) ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.tertiary) else ButtonDefaults.buttonColors(),
                ) {
                    Icon(if (listening) Icons.Filled.Stop else Icons.Filled.Mic, contentDescription = null)
                    Spacer(Modifier.size(8.dp))
                    Text(if (listening) "Ouvindo… toque para parar" else "Começar a ouvir")
                }
                problem?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp)) }
            }
            item {
                OutlinedTextField(
                    value = if (listening && partial.isNotBlank()) heard else text,
                    onValueChange = { if (!listening) text = it },
                    modifier = Modifier.fillMaxWidth().testTag("listen-text"),
                    label = { Text("O que o paciente conta") },
                    placeholder = { Text("Ex.: dor de cabeça latejante de um lado, a luz incomoda, tô enjoada") },
                    minLines = 3,
                    maxLines = 8,
                    shape = RoundedCornerShape(16.dp),
                )
            }
            if (heard.length >= 3 && matches.isEmpty()) {
                item { MutedText("Nenhuma condição do guia combina ainda — continue ouvindo ou descreva mais.") }
            }
            if (matches.isNotEmpty()) {
                item {
                    Text("CONDIÇÕES A CONSIDERAR", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                items(matches, key = { it.condition.key }) { m -> MatchCard(content, m, matches.first().score, onOpen) }
                item {
                    val complaints = matches.take(3).flatMap { it.evidence.take(3) }.distinct()
                    OutlinedButton(
                        onClick = { onAsk("Queixas relatadas: ${complaints.joinToString("; ")}. Quais condições do guia considerar e qual a conduta inicial?") },
                        modifier = Modifier.fillMaxWidth().testTag("listen-ask"),
                    ) {
                        Icon(Icons.Filled.AutoAwesome, contentDescription = null)
                        Spacer(Modifier.size(8.dp))
                        Text("Levar as queixas à Super Inteligência")
                    }
                    MutedText("Vai só a lista de queixas que casaram, sem o texto falado.", Modifier.padding(top = 4.dp))
                }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun MatchCard(content: GuideContent, m: SymptomMatcher.Match, top: Double, onOpen: (String) -> Unit) {
    val g = GuideTheme.colors
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(m.condition.label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                val strength = m.score / top
                Pill(if (strength > 0.66) "combina muito" else if (strength > 0.33) "combina" else "talvez", g.historyBackground, g.historyAccent)
            }
            FlowRow(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                for (e in m.evidence) Pill(e, g.highlight, MaterialTheme.colorScheme.onSurface)
            }
            Spacer(Modifier.size(6.dp))
            for (id in m.condition.items) {
                val ref = content.describe(id) ?: continue
                Row(
                    Modifier.fillMaxWidth().clickable { onOpen(ref.route) }.padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    SourcePill(ref.source)
                    Text(ref.title, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.secondary)
                }
            }
        }
    }
}
