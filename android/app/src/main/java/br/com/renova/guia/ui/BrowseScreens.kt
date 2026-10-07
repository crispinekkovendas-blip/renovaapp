package br.com.renova.guia.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import br.com.renova.guia.data.GuideContent
import br.com.renova.guia.data.Routes
import br.com.renova.guia.ui.components.CidChip
import br.com.renova.guia.ui.components.FilterChips
import br.com.renova.guia.ui.components.ListRow
import br.com.renova.guia.ui.components.SectionHeader

/*
 * As três abas para folhear: chips por grupo, capítulo ou seção, e uma linha
 * por item. A busca fica na aba Busca e procura nas três ao mesmo tempo.
 */

@Composable
fun ReceitasScreen(content: GuideContent, onOpen: (String) -> Unit) {
    var group by rememberSaveable { mutableStateOf<String?>(null) }
    val groups = content.bundle.receitas.groups.filter { g -> content.recipes.any { it.group == g } }
    ScreenScaffold(title = "Receitas prontas") { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            FilterChips(
                options = groups.map { g -> g to content.recipes.count { it.group == g } },
                total = content.recipes.size,
                selected = group,
                onSelect = { group = it },
            )
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.testTag("receitas-list"),
            ) {
                for (g in if (group != null) listOf(group!!) else groups) {
                    item(key = "h-$g") { SectionHeader(g) }
                    items(content.recipes.filter { it.group == g }, key = { it.id }) { recipe ->
                        ListRow(
                            title = AnnotatedString(recipe.name),
                            onClick = { onOpen(Routes.recipe(recipe.slug)) },
                            support = AnnotatedString(recipe.items.joinToString(" · ") { it.name }),
                            trailing = { CidChip(recipe.cid) },
                        )
                    }
                }
            }
        }
    }
}

/** "Noradrenalina (2 mg/ml - ampola de 4ml)" → "Noradrenalina": só o nome, para caber na linha. */
private fun shortDrug(drug: String): String =
    drug.replace(Regex("^\\d+[.)]\\s*"), "").split(Regex("\\s[(\\[–-]|\\s\\d"))[0].trim()

@Composable
fun PlantaoScreen(content: GuideContent, onOpen: (String) -> Unit) {
    var chapter by rememberSaveable { mutableStateOf<String?>(null) }
    val chapters = content.bundle.plantao.chapters
    ScreenScaffold(title = "Plantão e emergência") { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            FilterChips(
                options = chapters.map { it.title to it.topics.size },
                total = content.topics.size,
                selected = chapter,
                onSelect = { chapter = it },
            )
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.testTag("plantao-list"),
            ) {
                for (c in chapters.filter { chapter == null || it.title == chapter }) {
                    item(key = "h-${c.title}") { SectionHeader(c.title) }
                    items(c.topics, key = { it.id }) { topic ->
                        val preview = topic.blocks.filter { it.k == "drug" }.map { shortDrug(it.t) }.distinct().take(2).joinToString(" · ")
                        ListRow(
                            title = AnnotatedString(topic.title),
                            onClick = { onOpen(Routes.topic(topic.slug)) },
                            support = preview.takeIf { it.isNotBlank() }?.let { AnnotatedString(it) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DriveScreen(content: GuideContent, onOpen: (String) -> Unit) {
    var section by rememberSaveable { mutableStateOf<String?>(null) }
    val sections = content.bundle.drive.sections
    ScreenScaffold(title = "Drive de prescrições") { padding ->
        Column(Modifier.padding(padding).fillMaxSize()) {
            FilterChips(
                options = sections.map { it.title to it.entries.size },
                total = content.driveEntries.size,
                selected = section,
                onSelect = { section = it },
            )
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.testTag("drive-list"),
            ) {
                for (s in sections.filter { section == null || it.title == section }) {
                    item(key = "h-${s.title}") { SectionHeader(s.title) }
                    items(s.entries, key = { it.id }) { entry ->
                        val drugs = entry.blocks.flatMap { it.rx.orEmpty() }.map { it.name }.filter { it.isNotBlank() }.distinct().take(3).joinToString(" · ")
                        ListRow(
                            title = AnnotatedString(entry.title),
                            onClick = { onOpen(Routes.drive(entry.slug)) },
                            support = drugs.takeIf { it.isNotBlank() }?.let { AnnotatedString(it) },
                            trailing = entry.cid?.let { cid -> @Composable { CidChip(cid) } },
                        )
                    }
                }
            }
        }
    }
}
