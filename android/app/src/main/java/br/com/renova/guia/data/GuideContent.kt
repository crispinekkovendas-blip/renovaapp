package br.com.renova.guia.data

import br.com.renova.guia.search.GuideSearchEngine
import br.com.renova.guia.search.SymptomMatcher

/** O pacote com os atalhos que as telas usam: achar por slug, anterior e próximo, o índice da busca. */
class GuideContent(val bundle: GuideBundle) {
    val recipes: List<Recipe> = bundle.receitas.items
    private val recipeById = recipes.associateBy { it.id }
    private val recipeBySlug = recipes.associateBy { it.slug }

    val topics: List<Pair<Chapter, Topic>> = bundle.plantao.chapters.flatMap { c -> c.topics.map { c to it } }
    private val topicBySlug = topics.associateBy { it.second.slug }

    val driveEntries: List<Pair<DriveSection, DriveEntry>> = bundle.drive.sections.flatMap { s -> s.entries.map { s to it } }
    private val driveBySlug = driveEntries.associateBy { it.second.slug }

    /** O índice da busca: montado na primeira vez que alguém pede (o repositório já pede logo ao abrir, fora da tela). */
    val search: GuideSearchEngine by lazy { GuideSearchEngine(bundle.search) }

    /** O "Escutar o paciente" (montado na primeira vez que se abre a tela). */
    val listener: SymptomMatcher by lazy { SymptomMatcher(bundle.conditions) }

    fun recipe(slug: String): Recipe? = recipeBySlug[slug]
    /** A receita pelo id da busca ("receitas:Crise de enxaqueca"). */
    fun recipeById(id: String): Recipe? = recipeById[id]
    fun topic(slug: String): Pair<Chapter, Topic>? = topicBySlug[slug]
    fun driveEntry(slug: String): Pair<DriveSection, DriveEntry>? = driveBySlug[slug]

    fun neighbors(slug: String, list: List<String>): Pair<String?, String?> {
        val i = list.indexOf(slug)
        if (i < 0) return null to null
        return list.getOrNull(i - 1) to list.getOrNull(i + 1)
    }

    val topicSlugs: List<String> = topics.map { it.second.slug }
    val driveSlugs: List<String> = driveEntries.map { it.second.slug }

    /** Título e fonte de um item pelo id da busca ("plantao:sepse-e-choque-septico"). */
    fun describe(id: String): ItemRef? {
        val source = id.substringBefore(":")
        val key = id.substringAfter(":")
        return when (source) {
            "receitas" -> recipeById[id]?.let { ItemRef(id, "receitas", it.name, it.group, Routes.recipe(it.slug)) }
            "plantao" -> topicBySlug[key]?.let { (c, t) -> ItemRef(id, "plantao", t.title, c.title, Routes.topic(t.slug)) }
            "drive" -> driveBySlug[key]?.let { (s, e) -> ItemRef(id, "drive", e.title, s.title, Routes.drive(e.slug)) }
            else -> null
        }
    }

    /** A rota de uma citação da Super Inteligência: "sepse-e-choque-septico#1", "receita-…#0", "drive-…#0". */
    fun citationRoute(citationId: String): String? {
        val slug = citationId.substringBefore("#")
        return when {
            slug.startsWith("receita-") -> recipe(slug.removePrefix("receita-"))?.let { Routes.recipe(it.slug) }
            slug.startsWith("drive-") -> driveEntry(slug.removePrefix("drive-"))?.let { Routes.drive(it.second.slug) }
            else -> topic(slug)?.let { Routes.topic(it.second.slug) }
        }
    }

    fun revisionLabel(n: Int): String {
        val r = bundle.revision.list.firstOrNull { it.n == n } ?: return "${n}ª revisão"
        return "${r.label} (${r.date.take(5)})"
    }
}

/** Um item do guia para listas (favoritos, recentes, resultados). */
data class ItemRef(val id: String, val source: String, val title: String, val where: String, val route: String)

/** As rotas do app (Navigation Compose). */
object Routes {
    const val BUSCA = "busca"
    const val RECEITAS = "receitas"
    const val PLANTAO = "plantao"
    const val DRIVE = "drive"
    const val PERGUNTAR = "perguntar"
    const val MUDANCAS = "mudancas"
    const val SOBRE = "sobre"
    const val ESCUTAR = "escutar"
    const val RECIPE = "receita/{slug}"
    const val TOPIC = "topico/{slug}"
    const val DRIVE_ENTRY = "entrada/{slug}"

    fun recipe(slug: String) = "receita/$slug"
    fun topic(slug: String) = "topico/$slug"
    fun drive(slug: String) = "entrada/$slug"
}
