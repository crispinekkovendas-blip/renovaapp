@file:OptIn(ExperimentalFoundationApi::class)

package br.com.renova.guia.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.renova.guia.data.DriveBlock
import br.com.renova.guia.data.GuideContent
import br.com.renova.guia.data.RevisionHistory
import br.com.renova.guia.data.Routes
import br.com.renova.guia.data.TopicBlock
import br.com.renova.guia.data.UserPrefs
import br.com.renova.guia.share.driveShareText
import br.com.renova.guia.share.recipeShareText
import br.com.renova.guia.ui.components.CidChip
import br.com.renova.guia.ui.components.HistorySheet
import br.com.renova.guia.ui.components.MutedText
import br.com.renova.guia.ui.components.Pill
import br.com.renova.guia.ui.components.RevisionLabels
import br.com.renova.guia.ui.components.SourcePill
import br.com.renova.guia.ui.components.copyText
import br.com.renova.guia.ui.components.marked
import br.com.renova.guia.ui.components.md
import br.com.renova.guia.ui.components.shareText
import br.com.renova.guia.ui.theme.GuideTheme

/** O histórico aberto (qual trecho e se começa no aviso). */
private data class OpenHistory(val history: RevisionHistory, val title: String, val atAlert: Boolean = false)

@Composable
private fun FavoriteButton(prefs: UserPrefs, id: String) {
    val favorites by prefs.favorites.collectAsState()
    val on = id in favorites
    IconButton(onClick = { prefs.toggleFavorite(id) }, modifier = Modifier.testTag("favorite")) {
        Icon(
            if (on) Icons.Filled.Star else Icons.Outlined.StarBorder,
            contentDescription = if (on) "Tirar dos favoritos" else "Pôr nos favoritos",
            tint = if (on) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun NotFound(onBack: () -> Unit) {
    ScreenScaffold(title = "Não encontrado", onBack = onBack) { padding ->
        Text("Este item não está mais no guia.", Modifier.padding(padding).padding(16.dp))
    }
}

@Composable
private fun DetailColumn(padding: androidx.compose.foundation.layout.PaddingValues, content: @Composable () -> Unit) {
    Column(
        Modifier
            .padding(padding)
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp)
            .padding(bottom = 32.dp),
    ) { content() }
}

@Composable
private fun BodyCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth().padding(top = 12.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(Modifier.padding(16.dp)) { content() }
    }
}

@Composable
private fun HistoryButton(text: String, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, modifier = Modifier.padding(top = 12.dp).testTag("history-button")) {
        Icon(Icons.Filled.History, contentDescription = null, tint = GuideTheme.colors.historyAccent)
        Spacer(Modifier.width(8.dp))
        Text(text, color = GuideTheme.colors.historyAccent)
    }
}

@Composable
private fun NumberBadge(n: String) {
    Box(
        Modifier.size(22.dp).clip(CircleShape).background(MaterialTheme.colorScheme.secondaryContainer),
        contentAlignment = Alignment.Center,
    ) {
        Text(n, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSecondaryContainer)
    }
}

@Composable
private fun PrevNext(prev: Pair<String, String>?, next: Pair<String, String>?, onOpen: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Box(Modifier.weight(1f)) {
            if (prev != null) {
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
                        .clickable { onOpen(prev.first) }.padding(12.dp),
                ) {
                    MutedText("← Anterior")
                    Text(prev.second, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        Box(Modifier.weight(1f)) {
            if (next != null) {
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
                        .clickable { onOpen(next.first) }.padding(12.dp),
                    horizontalAlignment = Alignment.End,
                ) {
                    MutedText("Próximo →")
                    Text(next.second, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.End)
                }
            }
        }
    }
}

// ── Receita pronta ─────────────────────────────────────────────────────

@Composable
fun RecipeScreen(content: GuideContent, prefs: UserPrefs, slug: String, onBack: () -> Unit) {
    val recipe = content.recipe(slug) ?: return NotFound(onBack)
    val context = LocalContext.current
    var history by remember { mutableStateOf<OpenHistory?>(null) }
    var orientationOpen by remember { mutableStateOf(false) }
    val labels = RevisionLabels(content.bundle.revision.current, content::revisionLabel)
    ScreenScaffold(
        title = recipe.name,
        onBack = onBack,
        actions = {
            FavoriteButton(prefs, recipe.id)
            IconButton(onClick = { shareText(context, recipeShareText(recipe, withOrientation = orientationOpen)) }, modifier = Modifier.testTag("share")) {
                Icon(Icons.Filled.Share, contentDescription = "Enviar a receita")
            }
            IconButton(onClick = { copyText(context, recipe.name, recipeShareText(recipe, withOrientation = orientationOpen)) }) {
                Icon(Icons.Filled.ContentCopy, contentDescription = "Copiar a receita")
            }
        },
    ) { padding ->
        DetailColumn(padding) {
            Text(recipe.name, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SourcePill("receitas")
                CidChip("CID ${recipe.cid}")
                MutedText(recipe.group)
            }
            if (recipe.items.any { it.marked }) {
                MutedText("Em amarelo, o que mudou desde a publicação.", Modifier.padding(top = 8.dp))
            }
            BodyCard {
                recipe.items.forEachIndexed { i, item ->
                    Row(Modifier.padding(vertical = 6.dp)) {
                        NumberBadge("${i + 1}")
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(marked(item.name, item.marked), fontWeight = FontWeight.Bold)
                            if (item.quantity.isNotBlank()) MutedText(item.quantity)
                            Text(marked(item.posology, item.marked), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 2.dp))
                            val extra = listOfNotNull(item.route.takeIf { it.isNotBlank() }, item.tarja).joinToString(" · ")
                            if (extra.isNotBlank()) MutedText(extra, Modifier.padding(top = 2.dp))
                        }
                    }
                }
            }
            recipe.history?.let { h ->
                HistoryButton("Histórico: da receita publicada até hoje") { history = OpenHistory(h, recipe.name) }
            }
            recipe.orientation?.let { o ->
                BodyCard {
                    Text("ORIENTAÇÃO AO PACIENTE", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(o.name, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        o.text.trim(),
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = if (orientationOpen) Int.MAX_VALUE else 6,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                    Text(
                        if (orientationOpen) "Mostrar menos" else "Ler a orientação inteira",
                        modifier = Modifier.padding(top = 6.dp).clickable { orientationOpen = !orientationOpen },
                        color = MaterialTheme.colorScheme.secondary,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
            MutedText(
                "Ponto de partida para adulto sem comorbidade: ajuste a alergias, gestação, idade, peso e função renal. Para emitir, use a ficha do paciente no Renova.",
                Modifier.padding(top = 16.dp),
            )
        }
    }
    history?.let { h -> HistorySheet(h.history, h.title, labels, h.atAlert) { history = null } }
}

// ── Tópico do plantão ──────────────────────────────────────────────────

@Composable
fun TopicScreen(content: GuideContent, prefs: UserPrefs, slug: String, onBack: () -> Unit, onOpen: (String) -> Unit) {
    val (chapter, topic) = content.topic(slug) ?: return NotFound(onBack)
    val context = LocalContext.current
    var history by remember { mutableStateOf<OpenHistory?>(null) }
    val labels = RevisionLabels(content.bundle.revision.current, content::revisionLabel)
    val (prev, next) = content.neighbors(slug, content.topicSlugs)
    val revisedBlocks = topic.blocks.count { it.history != null }
    ScreenScaffold(title = topic.title, onBack = onBack, actions = { FavoriteButton(prefs, topic.id) }) { padding ->
        DetailColumn(padding) {
            MutedText("Plantão e emergência › ${chapter.title}")
            val titleHistory = topic.titleHistory
            Text(
                marked(topic.title, titleHistory != null),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                modifier = if (titleHistory != null) Modifier.clickable { history = OpenHistory(titleHistory, topic.title) } else Modifier,
            )
            val meta = buildString {
                append("Página ${topic.page} do guia")
                if (revisedBlocks > 0) append(" · $revisedBlocks ${if (revisedBlocks == 1) "trecho revisado" else "trechos revisados"}, em amarelo — toque para ver o histórico")
                if (topic.revised > 0) append(" · ${topic.revised} ${if (topic.revised == 1) "mudança" else "mudanças"} na ${content.revisionLabel(content.bundle.revision.current)}")
            }
            MutedText(meta, Modifier.padding(top = 4.dp))
            BodyCard {
                for (block in topic.blocks) {
                    TopicBlockView(
                        block,
                        onHistory = { atAlert -> block.history?.let { history = OpenHistory(it, block.t.take(120), atAlert) } },
                        onCopy = { copyText(context, topic.title, block.t) },
                    )
                }
            }
            MutedText("Toque e segure um trecho para copiar.", Modifier.padding(top = 8.dp))
            PrevNext(
                prev?.let { s -> content.topic(s)?.let { Routes.topic(s) to it.second.title } },
                next?.let { s -> content.topic(s)?.let { Routes.topic(s) to it.second.title } },
                onOpen,
            )
            val credit = content.bundle.plantao.credit
            MutedText(
                "${credit.title}, ${credit.edition} (${credit.publisher}). Reproduzido com autorização dos autores: ${credit.authors.joinToString(", ")}. " +
                    "Revisão Renova desde ${credit.reviewedAt}: erros de dose, diluição e digitação corrigidos no próprio texto. Doses de adulto de 70 kg, salvo indicação. Sempre confira com o protocolo da instituição.",
                Modifier.padding(top = 16.dp),
            )
        }
    }
    history?.let { h -> HistorySheet(h.history, h.title, labels, h.atAlert) { history = null } }
}

@Composable
private fun TopicBlockView(block: TopicBlock, onHistory: (Boolean) -> Unit, onCopy: () -> Unit) {
    val g = GuideTheme.colors
    val h = block.history
    val text = marked(block.t, h != null)
    val tap = Modifier.combinedClickable(onClick = { if (h != null) onHistory(false) }, onLongClick = onCopy)
    when (block.k) {
        "sub" -> {
            Text(
                text,
                modifier = tap.padding(top = 18.dp, bottom = 4.dp),
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.ExtraBold,
                color = MaterialTheme.colorScheme.secondary,
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        }
        "route" -> Text(text, modifier = tap.padding(top = 10.dp), style = MaterialTheme.typography.labelMedium, fontStyle = FontStyle.Italic, color = MaterialTheme.colorScheme.onSurfaceVariant)
        "drug" -> Row(tap.padding(top = 12.dp)) {
            Box(Modifier.padding(top = 7.dp, end = 8.dp).size(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer))
            Text(text, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.ExtraBold)
        }
        "drugnote" -> Text(text, modifier = tap.padding(top = 6.dp), fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.secondary)
        "strong" -> Text(text, modifier = tap.padding(start = 16.dp, top = 4.dp), fontWeight = FontWeight.Bold)
        "ped" -> Row(
            tap.padding(start = 16.dp, top = 4.dp).fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(g.pedBg).padding(horizontal = 10.dp, vertical = 6.dp),
        ) {
            Pill("PED.", g.pedFg.copy(alpha = 0.15f), g.pedFg)
            Spacer(Modifier.width(6.dp))
            Text(text, style = MaterialTheme.typography.bodySmall, color = g.pedFg)
        }
        "tip" -> Text(
            text,
            modifier = tap.padding(top = 10.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(g.tipBg).padding(10.dp),
            style = MaterialTheme.typography.bodySmall,
            color = g.tipFg,
        )
        "plus" -> Text("+", modifier = Modifier.padding(start = 16.dp, top = 2.dp), fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.outline)
        "grid", "table" -> Column(tap.padding(top = 12.dp)) {
            if (block.t.isNotBlank()) Text(text, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold)
            Table(block.rows.orEmpty().map { row -> row.map { it to false } })
        }
        else -> Text(text, modifier = tap.padding(start = 16.dp, top = 4.dp), style = MaterialTheme.typography.bodyMedium)
    }
    if (h?.alert != null) {
        Pill("⚠ conferir — toque para ver o aviso", g.tipBg, g.tipFg, Modifier.padding(start = 16.dp, top = 4.dp).clickable { onHistory(true) })
    }
}

/** Tabela que rola para o lado; a primeira linha é o cabeçalho. */
@Composable
private fun Table(rows: List<List<Pair<String, Boolean>>>, markdown: Boolean = false) {
    Box(
        Modifier.padding(top = 6.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .border(BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant), RoundedCornerShape(12.dp))
            .horizontalScroll(rememberScrollState()),
    ) {
        Column {
            rows.forEachIndexed { r, row ->
                Row(Modifier.background(if (r == 0) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLowest)) {
                    row.forEachIndexed { c, (cell, mark) ->
                        Text(
                            if (markdown) md(cell, mark) else marked(cell, mark),
                            modifier = Modifier.widthIn(min = 96.dp, max = 220.dp).padding(8.dp),
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = if (r == 0 || c == 0) FontWeight.Bold else FontWeight.Normal,
                        )
                    }
                }
                if (r < rows.size - 1) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            }
        }
    }
}

// ── Entrada do Drive ───────────────────────────────────────────────────

@Composable
fun DriveEntryScreen(content: GuideContent, prefs: UserPrefs, slug: String, onBack: () -> Unit, onOpen: (String) -> Unit) {
    val (section, entry) = content.driveEntry(slug) ?: return NotFound(onBack)
    val context = LocalContext.current
    var history by remember { mutableStateOf<OpenHistory?>(null) }
    val labels = RevisionLabels(content.bundle.revision.current, content::revisionLabel)
    val (prev, next) = content.neighbors(slug, content.driveSlugs)
    ScreenScaffold(
        title = entry.title,
        onBack = onBack,
        actions = {
            FavoriteButton(prefs, entry.id)
            IconButton(onClick = { shareText(context, driveShareText(entry)) }, modifier = Modifier.testTag("share")) {
                Icon(Icons.Filled.Share, contentDescription = "Enviar")
            }
            IconButton(onClick = { copyText(context, entry.title, driveShareText(entry)) }) {
                Icon(Icons.Filled.ContentCopy, contentDescription = "Copiar")
            }
        },
    ) { padding ->
        DetailColumn(padding) {
            MutedText("Drive de prescrições › ${section.title}")
            Text(entry.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SourcePill("drive")
                entry.cid?.let { CidChip("CID $it", entry.cidMarked) }
                if (entry.statusLabel.isNotBlank()) MutedText(entry.statusLabel)
            }
            BodyCard {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    for (block in entry.blocks) DriveBlockView(block)
                    entry.source?.let { Text(md(it.t, it.marked), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                }
            }
            entry.history?.let { h -> HistoryButton("Histórico: do card original até hoje") { history = OpenHistory(h, entry.title) } }
            PrevNext(
                prev?.let { s -> content.driveEntry(s)?.let { Routes.drive(s) to it.second.title } },
                next?.let { s -> content.driveEntry(s)?.let { Routes.drive(s) to it.second.title } },
                onOpen,
            )
            val credit = content.bundle.drive.credit
            MutedText(
                "Condição do ${credit.basedOn}: o card original, no início do histórico, é reproduzido com autorização da autora. Texto da revisão Renova (${credit.reviewedAt}), com apoio de IA. " +
                    "Confira antes de prescrever: alergias, gestação, função renal e hepática, peso e idade mudam a conduta.",
                Modifier.padding(top = 16.dp),
            )
        }
    }
    history?.let { h -> HistorySheet(h.history, h.title, labels, h.atAlert) { history = null } }
}

@Composable
private fun DriveBlockView(block: DriveBlock) {
    val g = GuideTheme.colors
    when (block.k) {
        "rx" -> Column(
            Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp)).padding(12.dp),
        ) {
            block.rx.orEmpty().forEachIndexed { i, item ->
                item.heading?.let {
                    Text(
                        it.uppercase(),
                        modifier = Modifier.padding(top = if (i > 0) 10.dp else 0.dp),
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.ExtraBold,
                        color = MaterialTheme.colorScheme.secondary,
                    )
                }
                if (item.name.isNotBlank()) {
                    Row(Modifier.padding(top = 6.dp)) {
                        NumberBadge(item.n?.toString() ?: "•")
                        Spacer(Modifier.width(10.dp))
                        Column(Modifier.weight(1f)) {
                            Text(marked(item.name + (item.quantity?.let { " · $it" } ?: ""), item.marked), fontWeight = FontWeight.Bold)
                            for (line in item.posology) {
                                if (line.or) {
                                    Text("OU", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.outline)
                                } else {
                                    Text(marked(line.t, line.marked), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 2.dp))
                                }
                            }
                        }
                    }
                }
            }
        }
        "warn" -> Text(
            md("⚠️ " + block.t.orEmpty(), block.marked),
            modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(g.warnBg).padding(10.dp),
            style = MaterialTheme.typography.bodySmall,
            color = g.warnFg,
        )
        "ul", "ol" -> Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            block.items.orEmpty().forEachIndexed { i, item ->
                Row {
                    Text(if (block.k == "ol") "${i + 1}." else "•", modifier = Modifier.width(22.dp), fontWeight = FontWeight.Bold)
                    Text(md(item.t, item.marked), style = MaterialTheme.typography.bodyMedium)
                }
            }
        }
        "table" -> Table(block.rows.orEmpty().map { row -> row.map { it.t to it.marked } }, markdown = true)
        else -> Text(md(block.t.orEmpty(), block.marked), style = MaterialTheme.typography.bodyMedium)
    }
}
