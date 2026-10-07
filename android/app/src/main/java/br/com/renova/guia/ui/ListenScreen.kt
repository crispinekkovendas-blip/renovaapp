package br.com.renova.guia.ui

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.speech.RecognizerIntent
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
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.KeyboardVoice
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import br.com.renova.guia.data.Routes
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
 * app mostra as hipóteses do guia que combinam — primeiro a hipótese e o
 * porquê (as queixas que casaram), o que perguntar para confirmar e os sinais
 * de alarme; só depois a receita, os medicamentos e os outros itens do guia. Tudo no aparelho: o texto não vai a lugar nenhum,
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
    // A escuta contínua falhou neste celular: oferece o ditado do Google (a janela padrão do Android).
    var dictation by rememberSaveable { mutableStateOf(false) }
    fun append(heard: String) {
        text = if (text.isBlank()) heard else "${text.trimEnd()}. $heard"
    }
    val dictate = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val said = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()
        if (result.resultCode == Activity.RESULT_OK && !said.isNullOrBlank()) append(said)
    }
    fun startDictation() {
        problem = null
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Fale o que o paciente conta")
        }
        try {
            dictate.launch(intent)
        } catch (_: ActivityNotFoundException) {
            problem = "Este celular não tem ditado por voz — digite a queixa."
        }
    }
    val listener = remember {
        ContinuousListener(
            context,
            onFinal = { heard -> append(heard) },
            onPartial = { partial = it },
            onListening = { listening = it },
            onProblem = { problem = it },
            onGiveUp = { dictation = true },
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
            !listener.available -> {
                dictation = true
                startDictation()
            }
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
                if (dictation) {
                    OutlinedButton(onClick = { startDictation() }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp).testTag("listen-dictate")) {
                        Icon(Icons.Filled.KeyboardVoice, contentDescription = null)
                        Spacer(Modifier.size(8.dp))
                        Text("Ditar pelo Google (um trecho por vez)")
                    }
                } else {
                    TextButton(onClick = { dictation = true; startDictation() }, modifier = Modifier.testTag("listen-dictate-link")) {
                        Text("A escuta não funciona? Usar o ditado do Google", style = MaterialTheme.typography.labelMedium)
                    }
                }
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
                    Text("HIPÓTESES A CONSIDERAR", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                items(matches.size, key = { matches[it].condition.key }) { i -> MatchCard(content, matches[i], i, matches.first().score, onOpen) }
                item {
                    val complaints = matches.take(3).flatMap { it.evidence.take(3) }.distinct()
                    OutlinedButton(
                        onClick = {
                            onAsk(
                                "Queixas relatadas pelo paciente: ${complaints.joinToString("; ")}. " +
                                    "Responda nesta ordem: 1) hipóteses diagnósticas mais prováveis, da mais para a menos provável, cada uma com o porquê " +
                                    "(quais destas queixas a sustentam e o que falta para confirmar); 2) sinais de alarme a procurar; " +
                                    "3) só então a conduta, a receita e os medicamentos do guia para a hipótese principal.",
                            )
                        },
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
private fun MatchCard(content: GuideContent, m: SymptomMatcher.Match, rank: Int, top: Double, onOpen: (String) -> Unit) {
    val g = GuideTheme.colors
    val c = m.condition
    // As duas primeiras abertas; as outras, um toque.
    var open by rememberSaveable(c.key) { mutableStateOf(rank < 2) }
    val strength = m.score / top
    Card(
        modifier = Modifier.fillMaxWidth().testTag("hypothesis-${c.key}"),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(Modifier.fillMaxWidth().clickable { open = !open }, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("HIPÓTESE ${rank + 1}", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(c.label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
                }
                Pill(if (strength > 0.66) "combina muito" else if (strength > 0.33) "combina" else "talvez", g.historyBackground, g.historyAccent)
                Icon(if (open) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, contentDescription = if (open) "Fechar" else "Abrir")
            }

            Section("POR QUÊ — O PACIENTE RELATOU")
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                for (e in m.evidence) Pill(e, g.highlight, MaterialTheme.colorScheme.onSurface)
            }
            if (open) HypothesisDetails(content, m, onOpen)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun HypothesisDetails(content: GuideContent, m: SymptomMatcher.Match, onOpen: (String) -> Unit) {
    val g = GuideTheme.colors
    val c = m.condition
    // Para confirmar: o que foi escrito para a condição; sem isso, as queixas típicas que o paciente ainda não citou.
    val said = m.evidence.map { it.lowercase() }.toSet()
    val confirm = c.confirm.ifEmpty { c.symptoms.filter { it.lowercase() !in said }.take(4).map { "$it?" } }
    if (confirm.isNotEmpty()) {
        Section("PARA CONFIRMAR, PERGUNTE OU EXAMINE")
        for (q in confirm) Bullet(q)
    }
    if (c.alarm.isNotEmpty()) {
        Section("SINAIS DE ALARME")
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            for (a in c.alarm) Pill(a, g.warnBg, g.warnFg)
        }
    }

    val recipes = c.items.mapNotNull { content.recipeById(it) }
    val others = c.items.filter { !it.startsWith("receitas:") }.mapNotNull { content.describe(it) }
    if (recipes.isNotEmpty()) {
        HorizontalDivider(Modifier.padding(top = 12.dp))
        Section("RECEITA E MEDICAMENTOS")
        for (r in recipes) {
            Row(
                Modifier.fillMaxWidth().clickable { onOpen(Routes.recipe(r.slug)) }.padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                SourcePill("receitas")
                Text(r.name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
            }
            for (item in r.items) {
                Column(Modifier.padding(start = 8.dp, top = 2.dp, bottom = 4.dp)) {
                    Text(
                        "• ${item.name}${if (item.quantity.isNotBlank()) " — ${item.quantity}" else ""}",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(item.posology, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 10.dp))
                }
            }
        }
    }
    if (others.isNotEmpty()) {
        Section(if (recipes.isEmpty()) "CONDUTA NO GUIA" else "TAMBÉM NO GUIA")
        for (ref in others) {
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

@Composable
private fun Section(title: String) {
    Text(
        title,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.ExtraBold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = Modifier.padding(top = 12.dp, bottom = 4.dp),
    )
}

@Composable
private fun Bullet(text: String) {
    Text("• $text", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 1.dp))
}
