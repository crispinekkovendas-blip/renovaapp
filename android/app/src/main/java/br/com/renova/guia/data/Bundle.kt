package br.com.renova.guia.data

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/*
 * O pacote do Guia clínico que o servidor monta (src/lib/app-bundle.ts): as
 * três abas prontas para desenhar, a busca e o que cada revisão mudou. Fica
 * guardado no aparelho e funciona sem internet.
 */

val GuideJson = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
}

@Serializable
data class GuideBundle(
    val version: String,
    val revision: RevisionInfo,
    val receitas: ReceitasTab,
    val plantao: PlantaoTab,
    val drive: DriveTab,
    val search: SearchData,
    val changes: List<RevisionChanges> = emptyList(),
    /** Para o "Escutar o paciente": cada condição com todos os nomes e queixas e os itens das três abas. */
    val conditions: List<GuideCondition> = emptyList(),
)

@Serializable
data class GuideCondition(
    val key: String,
    val label: String,
    val names: List<String> = emptyList(),
    val symptoms: List<String> = emptyList(),
    val items: List<String> = emptyList(),
    /** O que perguntar ou examinar para confirmar a hipótese. */
    val confirm: List<String> = emptyList(),
    /** Sinais de alarme que mudam a conduta. */
    val alarm: List<String> = emptyList(),
)

@Serializable
data class RevisionInfo(val current: Int, val list: List<RevisionMeta>)

@Serializable
data class RevisionMeta(val n: Int, val date: String, val label: String)

@Serializable
data class ReceitasTab(val groups: List<String>, val items: List<Recipe>)

@Serializable
data class Recipe(
    val id: String,
    val slug: String,
    val name: String,
    val cid: String,
    val group: String,
    val items: List<RecipeItem>,
    val orientation: Orientation? = null,
    val history: RevisionHistory? = null,
)

@Serializable
data class RecipeItem(
    val name: String,
    val quantity: String,
    val posology: String,
    val route: String = "",
    val tarja: String? = null,
    val marked: Boolean = false,
)

@Serializable
data class Orientation(val name: String, val text: String)

@Serializable
data class PlantaoTab(val credit: PlantaoCredit, val chapters: List<Chapter>)

@Serializable
data class PlantaoCredit(
    val title: String,
    val edition: String,
    val publisher: String,
    val authors: List<String>,
    val reviewedAt: String,
)

@Serializable
data class Chapter(val title: String, val topics: List<Topic>)

@Serializable
data class Topic(
    val id: String,
    val slug: String,
    val title: String,
    val page: Int,
    val titleHistory: RevisionHistory? = null,
    val revised: Int = 0,
    val blocks: List<TopicBlock>,
)

/** Um trecho do tópico: sub, route, drug, drugnote, text, strong, ped, tip, plus, grid, table. */
@Serializable
data class TopicBlock(
    val k: String,
    val t: String = "",
    val rows: List<List<String>>? = null,
    val history: RevisionHistory? = null,
)

@Serializable
data class DriveTab(val credit: DriveCredit, val sections: List<DriveSection>)

@Serializable
data class DriveCredit(val basedOn: String, val original: String, val reviewedAt: String)

@Serializable
data class DriveSection(val title: String, val entries: List<DriveEntry>)

@Serializable
data class DriveEntry(
    val id: String,
    val slug: String,
    val title: String,
    val cid: String? = null,
    val cidMarked: Boolean = false,
    val statusLabel: String = "",
    val blocks: List<DriveBlock>,
    val source: MarkedText? = null,
    val history: RevisionHistory? = null,
)

/** Um trecho do Drive: rx (receita item por item), p, warn, ul, ol, table. */
@Serializable
data class DriveBlock(
    val k: String,
    val t: String? = null,
    val marked: Boolean = false,
    val items: List<MarkedText>? = null,
    val rows: List<List<MarkedText>>? = null,
    val rx: List<RxItem>? = null,
)

@Serializable
data class MarkedText(val t: String, val marked: Boolean = false)

@Serializable
data class RxItem(
    val heading: String? = null,
    val n: Int? = null,
    val name: String = "",
    val quantity: String? = null,
    val marked: Boolean = false,
    val posology: List<RxLine> = emptyList(),
)

@Serializable
data class RxLine(val t: String, val marked: Boolean = false, val or: Boolean = false)

/** O histórico de um trecho: o original e cada mudança; `alert` é o slide do aviso pendente. */
@Serializable
data class RevisionHistory(val slides: List<RevisionSlide>, val alert: Int? = null)

@Serializable
data class RevisionSlide(
    /** "original" ou "change". */
    val kind: String,
    val source: String? = null,
    val title: String? = null,
    val lines: List<String> = emptyList(),
    val note: String? = null,
    val rev: Int? = null,
    val concise: List<ConciseLine> = emptyList(),
    val why: String? = null,
    /** "fix", "note" ou "withdrawn". */
    val tone: String? = null,
)

@Serializable
data class ConciseLine(val label: String? = null, val parts: List<DiffPart>)

/** eq (igual), del (saiu), ins (entrou), gap (…). */
@Serializable
data class DiffPart(val k: String, val t: String, val sp: Boolean = false)

@Serializable
data class SearchData(val synonyms: Map<String, List<String>>, val docs: List<SearchDocDto>, val items: List<SearchItem>)

@Serializable
data class SearchDocDto(val id: String, val fields: List<SearchFieldDto>)

@Serializable
data class SearchFieldDto(val text: String, val weight: Double)

/** O que a lista de resultados mostra de um item. `source`: receitas, plantao ou drive. */
@Serializable
data class SearchItem(
    val id: String,
    val source: String,
    val title: String,
    val where: String,
    val cid: String? = null,
    val lines: List<String>,
)

@Serializable
data class RevisionChanges(val rev: Int, val tabs: List<TabChanges>)

@Serializable
data class TabChanges(val tab: String, val count: String, val groups: List<ChangeGroup>)

@Serializable
data class ChangeGroup(val title: String, val target: String? = null, val lines: List<ConciseLine>)
