package br.com.renova.guia.data

import br.com.renova.guia.search.GuideSearchEngine

/** O Guia de ortopedia com os atalhos que as telas usam: tópico por slug, capítulo, região, vizinhos e a busca só dele. */
class OrthoContent(val tab: OrthoTab, synonyms: Map<String, List<String>>) {
    val topics: List<OrthoTopic> = tab.chapters.flatMap { it.topics }
    private val bySlug = topics.associateBy { it.slug }
    val slugs: List<String> = topics.map { it.slug }

    /** As condições (com CID), sem as cinco páginas de base. */
    val conditions: List<OrthoTopic> = topics.filter { it.isCondition }

    /** O índice da busca da aba (montado na primeira vez; o repositório pede logo ao abrir). */
    val search: GuideSearchEngine by lazy { GuideSearchEngine(SearchData(synonyms, tab.search.docs, tab.search.items)) }

    fun topic(slug: String): OrthoTopic? = bySlug[slug]

    fun chapter(topic: OrthoTopic): OrthoChapter? = tab.chapters.firstOrNull { c -> c.topics.any { it.slug == topic.slug } }

    fun region(key: String): OrthoRegion? = tab.regions.firstOrNull { it.key == key }

    fun regionOf(slug: String): OrthoRegion? = tab.regions.firstOrNull { slug in it.topics }

    /** Os tópicos da região na ordem de leitura: com trauma, os de trauma primeiro; sem, os outros primeiro (consult.ts). */
    fun orderTopics(region: OrthoRegion, trauma: Boolean?): List<OrthoTopic> {
        val ordered = if (trauma == null) region.topics else {
            val yes = region.topics.filter { it in tab.traumaTopics }
            val no = region.topics.filter { it !in tab.traumaTopics }
            if (trauma) yes + no else no + yes
        }
        return ordered.mapNotNull { bySlug[it] }
    }

    /** As mudanças da revisão atual que tocam o tópico — diretas ou por receita de base compartilhada. */
    fun changesOf(slug: String, rev: Int = tab.revision.current): List<OrthoChange> =
        tab.changes.filter { it.rev == rev && (it.slug == slug || slug in it.alsoIn) }

    fun revisionLabel(n: Int): String {
        val r = tab.revision.list.firstOrNull { it.n == n } ?: return "${n}ª revisão"
        return "${r.label} (${r.date.take(5)})"
    }
}
