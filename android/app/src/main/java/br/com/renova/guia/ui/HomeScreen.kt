@file:OptIn(ExperimentalMaterial3Api::class)

package br.com.renova.guia.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudOff
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import br.com.renova.guia.data.GuideContent
import br.com.renova.guia.data.GuideState
import br.com.renova.guia.data.ItemRef
import br.com.renova.guia.data.Routes
import br.com.renova.guia.data.UserPrefs
import br.com.renova.guia.search.GuideResults
import br.com.renova.guia.ui.components.CidChip
import br.com.renova.guia.ui.components.FilterChips
import br.com.renova.guia.ui.components.ListRow
import br.com.renova.guia.ui.components.MetaRow
import br.com.renova.guia.ui.components.MutedText
import br.com.renova.guia.ui.components.SectionHeader
import br.com.renova.guia.ui.components.SourcePill
import br.com.renova.guia.ui.components.rememberVoiceInput
import br.com.renova.guia.ui.components.searchHighlighted
import br.com.renova.guia.ui.components.sourceFilterLabel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

private val SOURCES = listOf("receitas", "plantao", "drive")

/**
 * A busca única do Guia clínico: procura nas receitas prontas, no plantão e
 * no Drive ao mesmo tempo, sem internet. Vazia, mostra favoritos, recentes,
 * a Super Inteligência e as abas.
 */
@Composable
fun HomeScreen(
    ready: GuideState.Ready,
    prefs: UserPrefs,
    onOpen: (ItemRef) -> Unit,
    onAsk: (String) -> Unit,
    onNavigate: (String) -> Unit,
    onSync: () -> Unit,
) {
    val content = ready.content
    var query by rememberSaveable { mutableStateOf("") }
    var filter by rememberSaveable { mutableStateOf<String?>(null) }
    val focus = LocalFocusManager.current
    val results by produceState(GuideResults.EMPTY, query, content) {
        if (query.isBlank()) {
            value = GuideResults.EMPTY
            return@produceState
        }
        delay(80)
        value = withContext(Dispatchers.Default) { content.search.query(query, boost = { prefs.boost(query, it) }) }
    }
    val voice = rememberVoiceInput { onAsk(it) }
    var menu by remember { mutableStateOf(false) }

    ScreenScaffold(
        title = "Guia clínico",
        actions = {
            if (ready.syncing) {
                Icon(Icons.Filled.Sync, contentDescription = "Sincronizando", modifier = Modifier.padding(12.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
            } else if (ready.offline) {
                IconButton(onClick = onSync) { Icon(Icons.Filled.CloudOff, contentDescription = "Sem conexão — tocar para sincronizar") }
            }
            IconButton(onClick = { menu = true }) { Icon(Icons.Filled.MoreVert, contentDescription = "Mais") }
            DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                DropdownMenuItem(
                    text = { Text("O que mudou no guia") },
                    leadingIcon = { Icon(Icons.Filled.History, null) },
                    onClick = { menu = false; onNavigate(Routes.MUDANCAS) },
                )
                DropdownMenuItem(
                    text = { Text("Sincronizar agora") },
                    leadingIcon = { Icon(Icons.Filled.Sync, null) },
                    onClick = { menu = false; onSync() },
                )
                DropdownMenuItem(
                    text = { Text("Sobre e conta") },
                    leadingIcon = { Icon(Icons.Filled.Info, null) },
                    onClick = { menu = false; onNavigate(Routes.SOBRE) },
                )
            }
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp).testTag("search-field"),
                placeholder = { Text("Busca em tudo: condição, remédio, sintoma ou CID") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = ""; filter = null }) { Icon(Icons.Filled.Close, contentDescription = "Limpar busca") }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { focus.clearFocus() }),
            )
            if (query.isBlank()) {
                HomeSections(ready, prefs, onOpen, onAsk, onNavigate, voice, onQuery = { query = it })
            } else {
                Results(content, query.trim(), results, filter, onFilter = { filter = it }, onSuggestion = { query = it }, onAsk = onAsk) { ref ->
                    prefs.rememberPick(query, ref.id)
                    onOpen(ref)
                }
            }
        }
    }
}

@Composable
private fun Results(
    content: GuideContent,
    q: String,
    results: GuideResults,
    filter: String?,
    onFilter: (String?) -> Unit,
    onSuggestion: (String) -> Unit,
    onAsk: (String) -> Unit,
    onOpen: (ItemRef) -> Unit,
) {
    val counts = SOURCES.associateWith { s -> results.rows.count { it.item.source == s } }
    val present = SOURCES.filter { (counts[it] ?: 0) > 0 }
    val active = filter?.takeIf { (counts[it] ?: 0) > 0 }
    val shown = if (active != null) results.rows.filter { it.item.source == active } else results.rows
    LazyColumn(
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier.testTag("results"),
    ) {
        if (q.length >= 3) {
            item {
                AssistChip(
                    onClick = { onAsk(q) },
                    label = { Text("Perguntar ao guia: “$q”", maxLines = 1) },
                    leadingIcon = { Icon(Icons.Filled.AutoAwesome, contentDescription = null) },
                )
            }
        }
        item {
            MutedText(
                if (results.rows.isEmpty()) "Nada encontrado nas três abas." else "${results.rows.size} ${if (results.rows.size == 1) "resultado" else "resultados"} em receitas, plantão e Drive",
            )
        }
        if (present.size > 1) {
            item {
                FilterChips(
                    options = present.map { it to (counts[it] ?: 0) },
                    total = results.rows.size,
                    selected = active,
                    onSelect = onFilter,
                    label = { sourceFilterLabel(it) },
                    contentPadding = PaddingValues(0.dp),
                )
            }
        }
        val suggestion = results.suggestion
        if (results.rows.isEmpty() && suggestion != null) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    MutedText("Você quis dizer ")
                    SuggestionChip(onClick = { onSuggestion(suggestion) }, label = { Text(suggestion) })
                }
            }
        }
        items(shown, key = { it.item.id }) { row ->
            val item = row.item
            ListRow(
                title = searchHighlighted(item.title, row.marks),
                onClick = { content.describe(item.id)?.let(onOpen) },
                meta = {
                    MetaRow {
                        SourcePill(item.source)
                        MutedText(item.where)
                        if (!row.complete) Text("casa com parte da busca", style = MaterialTheme.typography.labelSmall, color = Color(0xFFB45309))
                    }
                },
                support = row.line?.let { searchHighlighted(it, row.marks) },
                trailing = item.cid?.let { cid -> @Composable { CidChip(cid) } },
            )
        }
    }
}

@Composable
private fun HomeSections(
    ready: GuideState.Ready,
    prefs: UserPrefs,
    onOpen: (ItemRef) -> Unit,
    onAsk: (String) -> Unit,
    onNavigate: (String) -> Unit,
    voice: (() -> Unit)?,
    onQuery: (String) -> Unit,
) {
    val content = ready.content
    val favorites by prefs.favorites.collectAsState()
    val recents by prefs.recents.collectAsState()
    val searches by prefs.recentSearches.collectAsState()
    LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (ready.offline) {
            item {
                Notice("Sem conexão: usando o guia guardado neste aparelho. A Super Inteligência volta com a internet.")
            }
        }
        if (searches.isNotEmpty()) {
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(searches) { s -> SuggestionChip(onClick = { onQuery(s) }, label = { Text(s, maxLines = 1) }) }
                }
            }
        }
        item { ListenCard { onNavigate(Routes.ESCUTAR) } }
        item { AskCard(onOpen = { onNavigate(Routes.PERGUNTAR) }, voice = voice) }
        item {
            val rev = content.bundle.revision.current
            Card(
                onClick = { onNavigate(Routes.MUDANCAS) },
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.History, contentDescription = null)
                    Spacer(Modifier.size(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Guia na ${content.revisionLabel(rev)}", fontWeight = FontWeight.Bold)
                        MutedText("Ver o que cada revisão mudou")
                    }
                }
            }
        }
        val favoriteRefs = favorites.mapNotNull { content.describe(it) }
        if (favoriteRefs.isNotEmpty()) {
            item { SectionHeader("Favoritos") }
            items(favoriteRefs, key = { "fav-" + it.id }) { ItemRow(it, onOpen) }
        }
        val recentRefs = recents.filter { it !in favorites }.mapNotNull { content.describe(it) }.take(8)
        if (recentRefs.isNotEmpty()) {
            item { SectionHeader("Abertos por último") }
            items(recentRefs, key = { "rec-" + it.id }) { ItemRow(it, onOpen) }
        }
        item { SectionHeader("As três abas") }
        item {
            TabCard("Receitas prontas", "${content.recipes.size} receitas por condição, com a orientação ao paciente") { onNavigate(Routes.RECEITAS) }
        }
        item {
            TabCard("Plantão e emergência", "${content.topics.size} tópicos de pronto-socorro e sala vermelha") { onNavigate(Routes.PLANTAO) }
        }
        item {
            TabCard("Drive de prescrições", "${content.driveEntries.size} condições de consultório, com dose de criança") { onNavigate(Routes.DRIVE) }
        }
    }
}

@Composable
fun ItemRow(ref: ItemRef, onOpen: (ItemRef) -> Unit) {
    ListRow(
        title = AnnotatedString(ref.title),
        onClick = { onOpen(ref) },
        meta = {
            MetaRow {
                SourcePill(ref.source)
                MutedText(ref.where)
            }
        },
    )
}

@Composable
private fun TabCard(title: String, subtitle: String, onClick: () -> Unit) {
    ListRow(title = AnnotatedString(title), onClick = onClick, support = AnnotatedString(subtitle))
}

@Composable
fun Notice(text: String) {
    Text(
        text,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.tertiaryContainer)
            .padding(12.dp),
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onTertiaryContainer,
    )
}

/** O cartão da Super Inteligência: escrever ou falar a pergunta. */
@Composable
private fun AskCard(onOpen: () -> Unit, voice: (() -> Unit)?) {
    Card(
        onClick = onOpen,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
        modifier = Modifier.fillMaxWidth().testTag("ask-card"),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Filled.AutoAwesome, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text("Super Inteligência — pergunte ao guia", fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
            }
            Text(
                "Escreva a dúvida como falaria com um colega. A resposta vem só do guia — plantão, receitas prontas e Drive —, com a fonte de cada trecho.",
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(top = 4.dp, bottom = 10.dp),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilledTonalButton(onClick = onOpen) { Text("Escrever pergunta") }
                if (voice != null) {
                    FilledTonalButton(onClick = voice) {
                        Icon(Icons.Filled.Mic, contentDescription = null)
                        Spacer(Modifier.size(6.dp))
                        Text("Falar")
                    }
                }
            }
        }
    }
}

/** O cartão do "Escutar o paciente". */
@Composable
private fun ListenCard(onOpen: () -> Unit) {
    Card(
        onClick = onOpen,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer, contentColor = MaterialTheme.colorScheme.onTertiaryContainer),
        modifier = Modifier.fillMaxWidth().testTag("listen-card"),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Mic, contentDescription = null)
            Spacer(Modifier.size(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Escutar o paciente", fontWeight = FontWeight.ExtraBold)
                Text(
                    "O celular ouve a queixa como o paciente conta e mostra as condições do guia que combinam.",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}
