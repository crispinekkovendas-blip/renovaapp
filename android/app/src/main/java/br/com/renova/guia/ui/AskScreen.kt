package br.com.renova.guia.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AddComment
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.LinkAnnotation
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLinkStyles
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.BaselineShift
import androidx.compose.ui.text.withLink
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.renova.guia.ask.AskViewModel
import br.com.renova.guia.ask.Exchange
import br.com.renova.guia.ask.Piece
import br.com.renova.guia.ask.citedIds
import br.com.renova.guia.ask.formatAnswer
import br.com.renova.guia.data.GuideContent
import br.com.renova.guia.ui.components.MutedText
import br.com.renova.guia.ui.components.SourcePill
import br.com.renova.guia.ui.components.rememberVoiceInput

private val EXAMPLES = listOf(
    "Dose de adrenalina na anafilaxia em criança de 20 kg?",
    "Como preparo noradrenalina para 70 kg?",
    "Receita para cistite em mulher adulta?",
    "Amoxicilina na otite média em criança de 15 kg?",
    "O que orientar no início do antidepressivo?",
)

/**
 * A Super Inteligência: pergunta em texto livre (ou por voz) e a resposta só
 * com o guia, com a fonte de cada trecho — toque no número para abrir.
 */
@Composable
fun AskScreen(content: GuideContent, vm: AskViewModel, offline: Boolean, onOpenRoute: (String) -> Unit) {
    val thread by vm.thread.collectAsState()
    var text by rememberSaveable { mutableStateOf("") }
    val busy = thread.lastOrNull()?.done == false
    val listState = rememberLazyListState()
    val voice = rememberVoiceInput { spoken -> vm.ask(spoken) }
    fun send() {
        val q = text.trim()
        if (q.length >= 3 && !busy) {
            vm.ask(q)
            text = ""
        }
    }
    LaunchedEffect(thread.size, thread.lastOrNull()?.answer?.length) {
        if (thread.isNotEmpty()) listState.animateScrollToItem(thread.size - 1)
    }

    ScreenScaffold(
        title = "Super Inteligência",
        actions = {
            if (thread.isNotEmpty()) {
                IconButton(onClick = { vm.newConversation() }) { Icon(Icons.Filled.AddComment, contentDescription = "Nova conversa") }
            }
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().imePadding()) {
            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth().testTag("ask-thread"),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (thread.isEmpty()) {
                    item {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                                Spacer(Modifier.size(8.dp))
                                Text("Pergunte ao guia", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.ExtraBold)
                            }
                            Text(
                                "Escreva a dúvida como falaria com um colega. A resposta vem só do guia — plantão, receitas prontas e Drive —, " +
                                    "com a fonte de cada trecho. O que o guia não traz, ela diz que não traz. Não digite dados do paciente.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 4.dp, bottom = 8.dp),
                            )
                            if (offline) Notice("Sem conexão agora: a Super Inteligência precisa de internet. A busca e o guia funcionam normalmente.")
                            for (example in EXAMPLES) {
                                SuggestionChip(onClick = { vm.ask(example) }, label = { Text(example) }, modifier = Modifier.fillMaxWidth())
                            }
                        }
                    }
                }
                itemsIndexed(thread) { _, exchange ->
                    ExchangeView(content, exchange, onOpenRoute, onRetry = { vm.ask(exchange.question, fresh = true) })
                }
            }
            if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
            Row(
                Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.surfaceContainer).padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedTextField(
                    value = text,
                    onValueChange = { if (it.length <= 600) text = it },
                    modifier = Modifier.weight(1f).testTag("ask-field"),
                    placeholder = { Text(if (thread.isEmpty()) "Sua pergunta" else "Pergunta de seguimento (ex.: e em criança?)") },
                    maxLines = 4,
                    shape = RoundedCornerShape(16.dp),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { send() }),
                )
                if (voice != null && !busy) {
                    IconButton(onClick = voice) { Icon(Icons.Filled.Mic, contentDescription = "Perguntar por voz") }
                }
                if (busy) {
                    IconButton(onClick = { vm.stop() }) { Icon(Icons.Filled.Stop, contentDescription = "Parar") }
                } else {
                    IconButton(onClick = { send() }, enabled = text.trim().length >= 3, modifier = Modifier.testTag("ask-send")) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Perguntar")
                    }
                }
            }
        }
    }
}

@Composable
private fun ExchangeView(content: GuideContent, exchange: Exchange, onOpenRoute: (String) -> Unit, onRetry: () -> Unit) {
    Column(Modifier.fillMaxWidth()) {
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.CenterEnd) {
            Text(
                exchange.question,
                modifier = Modifier
                    .widthIn(max = 320.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(MaterialTheme.colorScheme.primary)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                color = MaterialTheme.colorScheme.onPrimary,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
        Spacer(Modifier.size(8.dp))
        Card(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(18.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
            border = CardDefaults.outlinedCardBorder(),
        ) {
            Column(Modifier.padding(14.dp)) {
                if (exchange.searches.isNotEmpty()) {
                    MutedText("Buscou no guia: " + exchange.searches.joinToString(" · ") { "“$it”" })
                    Spacer(Modifier.size(6.dp))
                }
                if (exchange.answer.isBlank() && !exchange.done) MutedText("Lendo o guia…")
                AnswerText(exchange.answer, onCite = { id -> content.citationRoute(id)?.let(onOpenRoute) })
                exchange.error?.let {
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp))
                }
                if (exchange.done && exchange.sources.isNotEmpty()) {
                    Text("FONTES", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 12.dp, bottom = 4.dp))
                    val order = citedIds(exchange.answer)
                    for (source in exchange.sources) {
                        val n = order.indexOf(source.id) + 1
                        Row(
                            Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).clickable { content.citationRoute(source.id)?.let(onOpenRoute) }.padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(if (n > 0) "$n" else "•", fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.secondary, modifier = Modifier.padding(end = 8.dp))
                            SourcePill(source.source ?: sourceOfCitation(source.id))
                            Spacer(Modifier.size(6.dp))
                            Text(
                                source.topic + (source.section?.let { " › $it" } ?: ""),
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.secondary,
                            )
                        }
                    }
                }
                if (exchange.done && exchange.cachedAt != null) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                        MutedText("Resposta já dada antes a esta pergunta (sem custo). ")
                        Text(
                            "Perguntar de novo",
                            modifier = Modifier.clickable(onClick = onRetry),
                            color = MaterialTheme.colorScheme.secondary,
                            fontWeight = FontWeight.Bold,
                            style = MaterialTheme.typography.labelMedium,
                        )
                    }
                }
            }
        }
    }
}

private fun sourceOfCitation(id: String) = when {
    id.startsWith("drive-") -> "drive"
    id.startsWith("receita-") -> "receitas"
    else -> "plantao"
}

/** O texto da resposta: tópicos, **dose** em negrito e o número de cada fonte, que abre o trecho. */
@Composable
private fun AnswerText(answer: String, onCite: (String) -> Unit) {
    val linkColor = MaterialTheme.colorScheme.secondary
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        for (line in formatAnswer(answer)) {
            val annotated = buildAnnotatedString {
                if (line.bullet) append("•  ")
                for (piece in line.pieces) {
                    when (piece) {
                        is Piece.Plain -> append(piece.text)
                        is Piece.Bold -> withStyle(SpanStyle(fontWeight = FontWeight.ExtraBold)) { append(piece.text) }
                        is Piece.Cite -> withLink(
                            LinkAnnotation.Clickable(
                                tag = piece.id,
                                styles = TextLinkStyles(SpanStyle(color = linkColor, fontWeight = FontWeight.Bold, fontSize = 11.sp, baselineShift = BaselineShift.Superscript)),
                                linkInteractionListener = { onCite(piece.id) },
                            ),
                        ) { append("[${piece.number}]") }
                    }
                }
            }
            Text(annotated, style = MaterialTheme.typography.bodyMedium, modifier = if (line.bullet) Modifier.padding(start = 4.dp) else Modifier)
        }
    }
}
