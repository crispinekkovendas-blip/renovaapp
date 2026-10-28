@file:OptIn(ExperimentalMaterial3Api::class)

package br.com.renova.guia.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.StarBorder
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.renova.guia.data.OrthoContent
import br.com.renova.guia.data.OrthoTopic
import br.com.renova.guia.data.Routes
import br.com.renova.guia.data.UserPrefs
import br.com.renova.guia.search.GuideResults
import br.com.renova.guia.share.orthoShareText
import br.com.renova.guia.ui.components.CidChip
import br.com.renova.guia.ui.components.ConciseLines
import br.com.renova.guia.ui.components.FilterChips
import br.com.renova.guia.ui.components.ListRow
import br.com.renova.guia.ui.components.MetaRow
import br.com.renova.guia.ui.components.MutedText
import br.com.renova.guia.ui.components.Pill
import br.com.renova.guia.ui.components.SectionHeader
import br.com.renova.guia.ui.components.SourcePill
import br.com.renova.guia.ui.components.copyText
import br.com.renova.guia.ui.components.searchHighlighted
import br.com.renova.guia.ui.components.shareText
import br.com.renova.guia.ui.theme.GuideTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext

/*
 * A aba Ortopedia: a busca da aba (como o paciente fala, manobra, remédio ou
 * CID), o "Atender agora", os atalhos do primeiro dia e os tópicos por
 * capítulo. O tópico vem na ordem da consulta. A Super Inteligência está no
 * botão flutuante, em toda tela.
 */

@Composable
fun OrthoHomeScreen(ortho: OrthoContent, prefs: UserPrefs, onOpen: (String) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var chapter by rememberSaveable { mutableStateOf<String?>(null) }
    val focus = LocalFocusManager.current
    val results by produceState(GuideResults.EMPTY, query, ortho) {
        if (query.isBlank()) {
            value = GuideResults.EMPTY
            return@produceState
        }
        delay(80)
        value = withContext(Dispatchers.Default) { ortho.search.query(query, boost = { prefs.boost(query, it) }) }
    }
    ScreenScaffold(title = "Ortopedia") { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp).testTag("orto-search"),
                placeholder = { Text("Como o paciente fala, manobra, remédio ou CID") },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                trailingIcon = {
                    if (query.isNotEmpty()) IconButton(onClick = { query = "" }) { Icon(Icons.Filled.Close, contentDescription = "Limpar busca") }
                },
                singleLine = true,
                shape = RoundedCornerShape(16.dp),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { focus.clearFocus() }),
            )
            if (query.isBlank()) {
                OrthoIndex(ortho, chapter, onChapter = { chapter = it }, onOpen)
            } else {
                OrthoResults(ortho, query.trim(), results, onSuggestion = { query = it }) { id ->
                    prefs.rememberPick(query, id)
                    ortho.topic(id.substringAfter(":"))?.let { onOpen(Routes.ortoTopic(it.slug)) }
                }
            }
        }
    }
}

@Composable
private fun OrthoIndex(ortho: OrthoContent, chapter: String?, onChapter: (String?) -> Unit, onOpen: (String) -> Unit) {
    val chapters = ortho.tab.chapters
    LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.testTag("orto-list")) {
        item { AttendNowCard { onOpen(Routes.ortoConsulta()) } }
        item { FirstDayStrip(ortho, onOpen) }
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                MutedText("${ortho.tab.credit.title} · revisão ${ortho.tab.credit.revision}", Modifier.weight(1f))
                Text(
                    "O que mudou",
                    modifier = Modifier.clickable { onOpen(Routes.ORTO_MUDANCAS) }.padding(4.dp),
                    color = MaterialTheme.colorScheme.secondary,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }
        item {
            FilterChips(
                options = chapters.map { it.title to it.topics.size },
                total = ortho.topics.size,
                selected = chapter,
                onSelect = onChapter,
                contentPadding = PaddingValues(0.dp),
            )
        }
        for (c in chapters.filter { chapter == null || it.title == chapter }) {
            item(key = "h-${c.title}") {
                Column {
                    SectionHeader(c.title)
                    if (c.intro.isNotBlank()) MutedText(c.intro, Modifier.padding(bottom = 4.dp))
                }
            }
            items(c.topics, key = { it.id }) { topic ->
                ListRow(
                    title = AnnotatedString(topic.title),
                    onClick = { onOpen(Routes.ortoTopic(topic.slug)) },
                    support = AnnotatedString(topic.aliases.take(3).joinToString(" · ")),
                    trailing = if (topic.isCondition) {
                        { CidChip(topic.cid) }
                    } else null,
                )
            }
        }
    }
}

/** O cartão "Atender agora": a consulta guiada em cinco passos. */
@Composable
fun AttendNowCard(onClick: () -> Unit) {
    Card(
        onClick = onClick,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
        modifier = Modifier.fillMaxWidth().testTag("orto-attend"),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.MedicalServices, contentDescription = null)
            Spacer(Modifier.size(12.dp))
            Column(Modifier.weight(1f)) {
                Text("Atender agora — consulta guiada", fontWeight = FontWeight.ExtraBold)
                Text(
                    "Onde dói › alarme › condição › perguntas e manobras › conduta e receita › nota pronta para o prontuário.",
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
    }
}

/** Os cinco tópicos de base, na ordem de leitura do primeiro dia. */
@Composable
private fun FirstDayStrip(ortho: OrthoContent, onOpen: (String) -> Unit) {
    val g = GuideTheme.colors
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(g.tipBg).padding(12.dp),
    ) {
        Text("PRIMEIRO DIA — LEIA NESTA ORDEM", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.ExtraBold, color = g.tipFg)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
            itemsIndexed(ortho.tab.firstDay) { i, s ->
                Card(
                    onClick = { onOpen(Routes.ortoTopic(s.slug)) },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                    border = CardDefaults.outlinedCardBorder(),
                    modifier = Modifier.width(150.dp),
                ) {
                    Column(Modifier.padding(10.dp)) {
                        Box(Modifier.size(22.dp).clip(CircleShape).background(g.tipFg), contentAlignment = Alignment.Center) {
                            Text("${i + 1}", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.surface)
                        }
                        Text(s.label, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 6.dp))
                        MutedText(s.hint)
                    }
                }
            }
        }
    }
}

@Composable
private fun OrthoResults(ortho: OrthoContent, q: String, results: GuideResults, onSuggestion: (String) -> Unit, onOpen: (String) -> Unit) {
    LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.testTag("orto-results")) {
        item {
            MutedText(
                if (results.rows.isEmpty()) "Nada encontrado para “$q” no Guia de ortopedia." else "${results.rows.size} ${if (results.rows.size == 1) "resultado" else "resultados"}",
            )
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
        items(results.rows, key = { it.item.id }) { row ->
            val item = row.item
            ListRow(
                title = searchHighlighted(item.title, row.marks),
                onClick = { onOpen(item.id) },
                meta = {
                    MetaRow {
                        SourcePill("ortopedia")
                        MutedText(item.where)
                    }
                },
                support = row.line?.let { searchHighlighted(it, row.marks) },
                trailing = item.cid?.let { cid -> @Composable { CidChip(cid) } },
            )
        }
    }
}

// ── Tópico ─────────────────────────────────────────────────────────────

@Composable
fun OrthoTopicScreen(ortho: OrthoContent, prefs: UserPrefs, slug: String, onBack: () -> Unit, onOpen: (String) -> Unit) {
    val topic = ortho.topic(slug)
    if (topic == null) {
        ScreenScaffold(title = "Não encontrado", onBack = onBack) { padding -> Text("Este tópico não está mais no guia.", Modifier.padding(padding).padding(16.dp)) }
        return
    }
    val context = LocalContext.current
    val favorites by prefs.favorites.collectAsState()
    val fav = topic.id in favorites
    val i = ortho.slugs.indexOf(slug)
    val prev = ortho.slugs.getOrNull(i - 1)?.let(ortho::topic)
    val next = ortho.slugs.getOrNull(i + 1)?.let(ortho::topic)
    ScreenScaffold(
        title = topic.title,
        onBack = onBack,
        actions = {
            IconButton(onClick = { prefs.toggleFavorite(topic.id) }, modifier = Modifier.testTag("favorite")) {
                Icon(
                    if (fav) Icons.Filled.Star else Icons.Outlined.StarBorder,
                    contentDescription = if (fav) "Tirar dos favoritos" else "Pôr nos favoritos",
                    tint = if (fav) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            IconButton(onClick = { shareText(context, orthoShareText(topic)) }, modifier = Modifier.testTag("share")) { Icon(Icons.Filled.Share, contentDescription = "Enviar") }
            IconButton(onClick = { copyText(context, topic.title, orthoShareText(topic)) }) { Icon(Icons.Filled.ContentCopy, contentDescription = "Copiar") }
        },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 96.dp)) {
            MutedText("Ortopedia › ${topic.chapter}")
            Text(topic.title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SourcePill("ortopedia")
                if (topic.isCondition) CidChip("CID ${topic.cid}")
            }
            if (topic.aliases.isNotEmpty()) MutedText("Também: ${topic.aliases.joinToString(" · ")}", Modifier.padding(top = 4.dp))
            if (topic.revised > 0) {
                val g = GuideTheme.colors
                Text(
                    "${topic.revised} ${if (topic.revised == 1) "mudança" else "mudanças"} na ${ortho.revisionLabel(ortho.tab.revision.current)} — toque para ver antes, agora e motivo",
                    modifier = Modifier.padding(top = 8.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(g.tipBg).clickable { onOpen(Routes.ORTO_MUDANCAS) }.padding(10.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = g.tipFg,
                )
            }
            if (topic.isCondition) {
                Card(
                    onClick = { onOpen(Routes.ortoConsulta(topic.slug)) },
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary, contentColor = MaterialTheme.colorScheme.onPrimary),
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp).testTag("orto-attend-topic"),
                ) {
                    Row(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.MedicalServices, contentDescription = null)
                        Spacer(Modifier.size(8.dp))
                        Text("Atender com este roteiro", fontWeight = FontWeight.ExtraBold)
                    }
                }
            }
            OrthoTopicBody(topic)
            Row(Modifier.fillMaxWidth().padding(top = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.weight(1f)) {
                    if (prev != null) NeighborCard("← Anterior", prev.title, Alignment.Start) { onOpen(Routes.ortoTopic(prev.slug)) }
                }
                Box(Modifier.weight(1f)) {
                    if (next != null) NeighborCard("Próximo →", next.title, Alignment.End) { onOpen(Routes.ortoTopic(next.slug)) }
                }
            }
            OrthoCreditText(ortho)
        }
    }
}

@Composable
private fun NeighborCard(label: String, title: String, align: Alignment.Horizontal, onClick: () -> Unit) {
    Column(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp)).clickable(onClick = onClick).padding(12.dp),
        horizontalAlignment = align,
    ) {
        MutedText(label)
        Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium, textAlign = if (align == Alignment.End) TextAlign.End else TextAlign.Start)
    }
}

@Composable
fun OrthoCreditText(ortho: OrthoContent) {
    val c = ortho.tab.credit
    MutedText(
        "${c.title}, publicado em ${c.writtenAt}; revisão ${c.revision}${if (c.revisedAt.isNotBlank()) " em ${c.revisedAt}" else ""}. Texto próprio da Renova, a partir das diretrizes citadas no pé de cada tópico. " +
            (c.reviewedBy?.let { "Revisado por $it. " } ?: "Escrito para o médico que é o ortopedista de plantão e de ambulatório no SUS; ainda sem revisão por ortopedista — confira doses, técnicas e condutas com o protocolo do serviço. ") +
            "Doses de adulto sem comorbidade, salvo indicação. Os dias de atestado são sugestão.",
        Modifier.padding(top = 16.dp),
    )
}

/** O corpo do tópico na ordem da consulta. */
@Composable
fun OrthoTopicBody(topic: OrthoTopic) {
    val g = GuideTheme.colors
    Card(
        modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                topic.summary,
                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.secondaryContainer).padding(10.dp),
                fontWeight = FontWeight.SemiBold,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSecondaryContainer,
            )
            if (topic.ask.isNotEmpty()) {
                OrthoSection("Perguntar", "anamnese dirigida")
                Bullets(topic.ask)
            }
            if (topic.exam.isNotEmpty()) {
                OrthoSection("Examinar", "${topic.exam.size} ${if (topic.exam.size == 1) "manobra" else "manobras"}")
                for (e in topic.exam) ExamCard(e)
            }
            OrthoSection("Alarme", "o que muda tudo")
            for (a in topic.alarm) {
                Text(
                    "⚠ $a",
                    modifier = Modifier.padding(top = 4.dp).fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(g.warnBg).padding(8.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = g.warnFg,
                )
            }
            if (topic.imaging.isNotEmpty()) {
                OrthoSection("Imagem", "quando pedir e como escrever")
                Bullets(topic.imaging)
            }
            if (topic.urgent.isNotEmpty()) {
                OrthoSection("Na urgência", "você é o ortopedista de plantão: o que faz hoje")
                for (u in topic.urgent) {
                    Text(
                        "▶ $u",
                        modifier = Modifier.padding(top = 4.dp).fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.secondaryContainer).padding(8.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSecondaryContainer,
                    )
                }
            }
            topic.procedures?.takeIf { it.isNotEmpty() }?.let { procedures ->
                OrthoSection("Procedimentos", "passo a passo, no serviço")
                for (p in procedures) ProcedureCard(p)
            }
            if (topic.plan.isNotEmpty()) {
                OrthoSection("Conduta", "o que fazer e orientar")
                Bullets(topic.plan)
            }
            if (topic.rx.isNotEmpty()) {
                OrthoSection("Receita", "adulto sem comorbidade")
                for (r in topic.rx) RxRow(r)
            }
            topic.immobilize?.takeIf { it.isNotEmpty() }?.let {
                OrthoSection("Imobilizar", "órtese ou tala")
                Bullets(it)
            }
            if (topic.clinic.isNotEmpty()) {
                OrthoSection("No retorno", "o seguimento no ambulatório")
                Bullets(topic.clinic)
            }
            if (topic.refer.isNotEmpty()) {
                OrthoSection("Cirurgia e regulação", "o que sai da sua mão, e com que urgência")
                Bullets(topic.refer)
            }
            OrthoSection("Atestado e retorno", "sugestão — ajuste ao trabalho")
            Text("Atestado: ${topic.leave}", style = MaterialTheme.typography.bodyMedium)
            Text("Retorno: ${topic.followup}", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 2.dp))
            topic.pearls?.forEach { p ->
                Text(
                    "💡 $p",
                    modifier = Modifier.padding(top = 10.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(g.tipBg).padding(10.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = g.tipFg,
                )
            }
            if (topic.sources.isNotEmpty()) MutedText("Baseado em: ${topic.sources.joinToString(" · ")}.", Modifier.padding(top = 12.dp))
        }
    }
}

/** Um procedimento: quando, material, passos numerados e o depois. */
@Composable
fun ProcedureCard(p: br.com.renova.guia.data.OrthoProcedure) {
    Column(
        Modifier.padding(top = 8.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceContainerLow).padding(10.dp),
    ) {
        Text(p.name, fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.bodyMedium)
        Text("Quando: ${p.whenTo}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
        Text("Material: ${p.needs}", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 2.dp))
        p.steps.forEachIndexed { i, s -> Text("${i + 1}. $s", style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp, start = 4.dp)) }
        Text("Depois: ${p.after}", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 6.dp))
    }
}

@Composable
fun OrthoSection(title: String, hint: String? = null) {
    Row(Modifier.padding(top = 18.dp, bottom = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(title.uppercase(), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.secondary)
        if (hint != null) MutedText(hint)
    }
    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
}

@Composable
fun Bullets(items: List<String>) {
    Column(Modifier.padding(top = 4.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        for (t in items) {
            Row {
                Box(Modifier.padding(top = 8.dp, end = 8.dp).size(6.dp).clip(CircleShape).background(MaterialTheme.colorScheme.outline))
                Text(t, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
fun ExamCard(e: br.com.renova.guia.data.OrthoExam, trailing: (@Composable () -> Unit)? = null) {
    Column(
        Modifier.padding(top = 8.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).border(1.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp)).padding(10.dp),
    ) {
        Text(e.name, fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.titleSmall)
        Text(e.how, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 2.dp))
        Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.Top) {
            Pill("POSITIVO", MaterialTheme.colorScheme.secondaryContainer, MaterialTheme.colorScheme.onSecondaryContainer)
            Spacer(Modifier.width(6.dp))
            Text(e.positive, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        trailing?.invoke()
    }
}

@Composable
fun RxRow(r: br.com.renova.guia.data.OrthoRx) {
    Row(Modifier.padding(top = 8.dp)) {
        Box(Modifier.padding(top = 7.dp, end = 8.dp).size(8.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer))
        Column {
            Text(r.name, fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.titleSmall)
            Text(r.posology, style = MaterialTheme.typography.bodyMedium)
            r.note?.let { MutedText(it, Modifier.padding(top = 2.dp)) }
        }
    }
}

// ── O que mudou ────────────────────────────────────────────────────────

@Composable
fun OrthoChangesScreen(ortho: OrthoContent, onBack: () -> Unit, onOpen: (String) -> Unit) {
    val current = ortho.tab.revision.current
    var rev by rememberSaveable { mutableStateOf(current) }
    val changes = ortho.tab.changes.filter { it.rev == rev }
    ScreenScaffold(title = "O que mudou na ortopedia", onBack = onBack) { padding ->
        LazyColumn(
            Modifier.padding(padding).fillMaxSize().testTag("orto-changes"),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 96.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                MutedText("O guia sempre mostra o texto mais novo; o anterior fica aqui, com o motivo e a fonte. O que saiu vem riscado e o que entrou, em verde. Para marcar Concordo / Discordo, use o site: Ortopedia › Revisões.")
            }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(ortho.tab.revision.list.reversed()) { r ->
                        val n = ortho.tab.changes.count { it.rev == r.n }
                        SuggestionChip(
                            onClick = { rev = r.n },
                            label = { Text("${r.label} · ${r.date.take(5)} · $n", fontWeight = if (r.n == rev) FontWeight.ExtraBold else FontWeight.Normal) },
                        )
                    }
                }
            }
            if (changes.isEmpty()) {
                item { MutedText(if (rev == 1) "A publicação: o texto inicial, sem mudanças registradas." else "Nenhuma mudança nesta revisão.") }
            }
            items(changes, key = { "${it.rev}-${it.slug}-${it.section}" }) { c ->
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                    border = CardDefaults.outlinedCardBorder(),
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text(c.title, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary, modifier = Modifier.clickable { onOpen(Routes.ortoTopic(c.slug)) })
                        MutedText(c.section)
                        Spacer(Modifier.size(6.dp))
                        ConciseLines(c.concise)
                        Spacer(Modifier.size(6.dp))
                        Text("Antes", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(c.before, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("Agora", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 4.dp))
                        Text(c.after, style = MaterialTheme.typography.bodySmall)
                        Text("Motivo", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 4.dp))
                        Text(c.why, style = MaterialTheme.typography.bodySmall)
                        if (c.alsoIn.isNotEmpty()) {
                            MutedText("Vale também em: " + c.alsoIn.mapNotNull { ortho.topic(it)?.title }.joinToString(", "), Modifier.padding(top = 4.dp))
                        }
                    }
                }
            }
            item {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 8.dp)) {
                    Icon(Icons.Filled.History, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.size(8.dp))
                    MutedText("Guia na ${ortho.revisionLabel(current)}")
                }
            }
        }
    }
}
