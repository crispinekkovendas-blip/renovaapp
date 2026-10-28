@file:OptIn(ExperimentalMaterial3Api::class)

package br.com.renova.guia.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import br.com.renova.guia.ask.AskViewModel
import br.com.renova.guia.data.GuideContent
import br.com.renova.guia.ui.ExchangeView

/*
 * A Super Inteligência em toda tela: um botão flutuante que abre a conversa
 * numa folha por cima do que o médico está vendo. A pergunta vai com o
 * contexto da tela ("Ortopedia › Entorse de tornozelo"), e as sugestões
 * mudam com ela. A conversa é a mesma enquanto o app vive.
 */

/** O que a tela atual diz à IA e as perguntas prontas para ela. */
data class AssistantContext(val label: String, val suggestions: List<String>)

@Composable
fun AssistantFab(onClick: () -> Unit) {
    ExtendedFloatingActionButton(
        onClick = onClick,
        icon = { Icon(Icons.Filled.AutoAwesome, contentDescription = null) },
        text = { Text("Perguntar") },
        containerColor = MaterialTheme.colorScheme.primary,
        contentColor = MaterialTheme.colorScheme.onPrimary,
        modifier = Modifier.testTag("assistant-fab"),
    )
}

@Composable
fun AssistantSheet(
    content: GuideContent,
    vm: AskViewModel,
    context: AssistantContext,
    offline: Boolean,
    onOpenRoute: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val sheet = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val thread by vm.thread.collectAsState()
    var text by rememberSaveable { mutableStateOf("") }
    val busy = thread.lastOrNull()?.done == false
    val listState = rememberLazyListState()
    val voice = rememberVoiceInput { spoken -> vm.ask(spoken, context = context.label) }
    fun send(q: String) {
        if (q.trim().length >= 3 && !busy) {
            vm.ask(q.trim(), context = context.label)
            text = ""
        }
    }
    LaunchedEffect(thread.size, thread.lastOrNull()?.answer?.length) {
        if (thread.isNotEmpty()) listState.animateScrollToItem(thread.size - 1)
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheet, modifier = Modifier.testTag("assistant-sheet")) {
        Column(Modifier.fillMaxHeight(0.92f).imePadding()) {
            Row(Modifier.padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.AutoAwesome, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.size(8.dp))
                Column(Modifier.weight(1f)) {
                    Text("Super Inteligência", fontWeight = FontWeight.ExtraBold)
                    MutedText("Na tela: ${context.label}")
                }
                if (thread.isNotEmpty()) {
                    IconButton(onClick = { vm.newConversation() }) { Icon(Icons.Filled.AddComment, contentDescription = "Nova conversa") }
                }
            }
            LazyColumn(
                state = listState,
                modifier = Modifier.weight(1f).fillMaxWidth().testTag("assistant-thread"),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (thread.isEmpty()) {
                    item {
                        Column {
                            Text(
                                "A resposta vem só do guia — plantão, receitas, Drive e ortopedia —, com a fonte de cada trecho, e sabe em que tela você está. Não digite dados do paciente.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 8.dp),
                            )
                            if (offline) {
                                Text(
                                    "Sem conexão agora: a Super Inteligência precisa de internet. O guia funciona normalmente.",
                                    modifier = Modifier.fillMaxWidth().background(MaterialTheme.colorScheme.tertiaryContainer, RoundedCornerShape(12.dp)).padding(12.dp),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onTertiaryContainer,
                                )
                            }
                            for (s in context.suggestions) {
                                SuggestionChip(onClick = { send(s) }, label = { Text(s) }, modifier = Modifier.fillMaxWidth())
                            }
                        }
                    }
                }
                itemsIndexed(thread) { _, exchange ->
                    ExchangeView(content, exchange, onOpenRoute, onRetry = { vm.ask(exchange.question, fresh = true, context = context.label) })
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
                    modifier = Modifier.weight(1f).testTag("assistant-field"),
                    placeholder = { Text(if (thread.isEmpty()) "Pergunte sobre esta tela" else "Pergunta de seguimento") },
                    maxLines = 4,
                    shape = RoundedCornerShape(16.dp),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { send(text) }),
                )
                if (voice != null && !busy) IconButton(onClick = voice) { Icon(Icons.Filled.Mic, contentDescription = "Perguntar por voz") }
                if (busy) {
                    IconButton(onClick = { vm.stop() }) { Icon(Icons.Filled.Stop, contentDescription = "Parar") }
                } else {
                    IconButton(onClick = { send(text) }, enabled = text.trim().length >= 3, modifier = Modifier.testTag("assistant-send")) {
                        Icon(Icons.AutoMirrored.Filled.Send, contentDescription = "Perguntar")
                    }
                }
            }
        }
    }
}
