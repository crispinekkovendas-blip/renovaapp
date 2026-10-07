package br.com.renova.guia.search

import br.com.renova.guia.data.SearchData
import br.com.renova.guia.data.SearchItem

/*
 * A busca única do Guia clínico (src/lib/guide-search.ts): receitas prontas,
 * plantão e Drive num índice só, CID primeiro, e o trecho que explica cada
 * resultado.
 */

object GuideSearch {
    /** CID digitado ("N30", "j03.9"): casa pelo começo do código. */
    private val CID = Regex("^[a-z]\\d{1,2}(\\.?\\d)?$", RegexOption.IGNORE_CASE)
    private val CID_SEPARATOR = Regex("\\s*/\\s*")
    private val SPACE_OR_DOT = Regex("[\\s.]")

    /** Receitas e entradas do Drive cujo CID começa com o que foi digitado (o plantão não tem CID). */
    fun cidMatches(items: List<SearchItem>, query: String): List<String> {
        val q = query.trim()
        if (!CID.matches(q)) return emptyList()
        val code = q.uppercase().replace(SPACE_OR_DOT, "")
        fun has(cid: String?) = (cid ?: "").replace(".", "").split(CID_SEPARATOR).any { it.startsWith(code) }
        return items.filter { it.source == "receitas" && has(it.cid) }.map { it.id } +
            items.filter { it.source == "drive" && has(it.cid) }.map { it.id }
    }

    /** Na mesma relevância, a aba aberta vem antes. */
    fun orderHits(hits: List<SearchHit>, tab: String?): List<SearchHit> {
        fun weight(h: SearchHit) = h.score * (if (tab != null && h.id.startsWith("$tab:")) 1.15 else 1.0)
        return hits.sortedByDescending { weight(it) }
    }

    /** O trecho que explica o resultado e as palavras a destacar: as que casaram e as digitadas. */
    fun resultSnippet(item: SearchItem, terms: List<String>, query: String): Pair<String?, List<String>> {
        val marks = (terms + tokens(query)).distinct()
        val line = if (marks.isNotEmpty()) SmartSearch.bestLine(item.lines, marks) else null
        return Pair(if (line != null && line != item.title) line else null, marks)
    }
}

/** Um resultado pronto para a lista. */
class GuideResult(
    val item: SearchItem,
    /** Palavras a destacar no título e no trecho. */
    val marks: List<String>,
    val line: String?,
    /** Casou com todas as partes da busca (senão, "casa com parte da busca"). */
    val complete: Boolean,
)

class GuideResults(val rows: List<GuideResult>, val suggestion: String?) {
    companion object {
        val EMPTY = GuideResults(emptyList(), null)
    }
}

/** O índice montado a partir do pacote (leva uns décimos de segundo: monte fora da tela). */
class GuideSearchEngine(data: SearchData) {
    val smart = SmartSearch(data.synonyms)
    val index: SearchIndex = smart.buildIndex(data.docs.map { d -> SearchDoc(d.id, d.fields.map { SearchField(it.text, it.weight) }) })
    val items: List<SearchItem> = data.items
    private val byId = items.associateBy { it.id }

    fun query(query: String, tab: String? = null, boost: ((String) -> Double)? = null, limit: Int = 60): GuideResults {
        val q = query.trim()
        if (q.isEmpty()) return GuideResults.EMPTY
        val result = smart.search(index, query, boost = boost)
        val byCid = GuideSearch.cidMatches(items, q)
        val seen = byCid.toHashSet()
        val ordered = byCid.map { Triple(it, emptyList<String>(), true) } +
            GuideSearch.orderHits(result.hits, tab).filter { it.id !in seen }.map { Triple(it.id, it.terms, it.complete) }
        val rows = ordered.take(limit).mapNotNull { (id, terms, complete) ->
            val item = byId[id] ?: return@mapNotNull null
            val (line, marks) = GuideSearch.resultSnippet(item, terms, q)
            GuideResult(item, marks, line, complete)
        }
        return GuideResults(rows, result.suggestion)
    }

    fun completeWord(query: String): String? = smart.completeWord(index, query)
}
