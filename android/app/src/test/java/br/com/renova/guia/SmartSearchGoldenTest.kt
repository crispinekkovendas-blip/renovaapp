package br.com.renova.guia

import br.com.renova.guia.data.GuideJson
import br.com.renova.guia.search.GuideSearch
import br.com.renova.guia.search.SmartSearch
import br.com.renova.guia.search.editDistance
import br.com.renova.guia.search.searchKey
import br.com.renova.guia.search.soundKey
import br.com.renova.guia.search.tokens
import kotlinx.serialization.Serializable
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs

/**
 * Paridade com o site: as mesmas consultas, os mesmos resultados, na mesma
 * ordem e com a mesma nota (search-golden.json vem do motor do site).
 */
class SmartSearchGoldenTest {
    @Serializable
    data class GoldenHit(val id: String, val score: Double, val complete: Boolean, val terms: List<String>)

    @Serializable
    data class GoldenQuery(val q: String, val hits: List<GoldenHit>, val total: Int, val suggestion: String? = null, val complete: String? = null)

    @Serializable
    data class GoldenRow(val id: String, val line: String? = null)

    @Serializable
    data class GoldenUnified(val q: String, val tab: String? = null, val rows: List<GoldenRow>)

    @Serializable
    data class GoldenNormalize(val `in`: String, val key: String, val tokens: List<String>)

    @Serializable
    data class Golden(val version: String, val normalize: List<GoldenNormalize>, val queries: List<GoldenQuery>, val unified: List<GoldenUnified>)

    private val golden: Golden = GuideJson.decodeFromString(Fixtures.text("search-golden.json"))
    private val engine = Fixtures.content.search

    @Test
    fun `o golden e o pacote são do mesmo guia`() {
        assertEquals(golden.version, Fixtures.bundle.version)
    }

    @Test
    fun `normaliza o texto como o site (acento, pontuação, diacríticos)`() {
        for (n in golden.normalize) {
            assertEquals("searchKey(\"${n.`in`}\")", n.key, searchKey(n.`in`))
            assertEquals("tokens(\"${n.`in`}\")", n.tokens, tokens(n.`in`))
        }
    }

    @Test
    fun `cada consulta acha os mesmos itens, na mesma ordem, com a mesma nota`() {
        val failures = mutableListOf<String>()
        for (g in golden.queries) {
            val result = engine.smart.search(engine.index, g.q)
            if (result.hits.size != g.total) failures += "\"${g.q}\": ${result.hits.size} resultados, o site acha ${g.total}"
            val ids = result.hits.take(g.hits.size).map { it.id }
            if (ids != g.hits.map { it.id }) {
                failures += "\"${g.q}\": ordem diferente\n  app:  $ids\n  site: ${g.hits.map { it.id }}"
                continue
            }
            g.hits.forEachIndexed { i, expected ->
                val hit = result.hits[i]
                if (abs(hit.score - expected.score) > 1e-9 * maxOf(1.0, abs(expected.score))) failures += "\"${g.q}\" ${hit.id}: nota ${hit.score} ≠ ${expected.score}"
                if (hit.complete != expected.complete) failures += "\"${g.q}\" ${hit.id}: complete ${hit.complete} ≠ ${expected.complete}"
                if (hit.terms.sorted() != expected.terms) failures += "\"${g.q}\" ${hit.id}: termos ${hit.terms.sorted()} ≠ ${expected.terms}"
            }
            if (result.suggestion != g.suggestion) failures += "\"${g.q}\": sugestão ${result.suggestion} ≠ ${g.suggestion}"
            val complete = engine.smart.completeWord(engine.index, g.q)
            if (complete != g.complete) failures += "\"${g.q}\": completa \"$complete\" ≠ \"${g.complete}\""
        }
        assertTrue(failures.joinToString("\n"), failures.isEmpty())
    }

    @Test
    fun `a busca única ordena e explica como a tela do site`() {
        val failures = mutableListOf<String>()
        for (g in golden.unified) {
            val rows = engine.query(g.q, tab = g.tab, limit = 10).rows
            val got = rows.map { it.item.id to it.line }
            val expected = g.rows.map { it.id to it.line }
            if (got != expected) failures += "\"${g.q}\" (aba ${g.tab}):\n  app:  $got\n  site: $expected"
        }
        assertTrue(failures.joinToString("\n"), failures.isEmpty())
    }

    @Test
    fun `peças do motor`() {
        assertEquals(1, editDistance("anafilaxia", "anafilaixa", 2))
        assertEquals(3, editDistance("abc", "xyz", 2))
        assertEquals(soundKey("anafilaxia"), soundKey("anafilacia"))
        val cid = GuideSearch.cidMatches(Fixtures.bundle.search.items, "n30")
        assertTrue(cid.toString(), cid.isNotEmpty() && cid.first().startsWith("receitas:") && cid.any { it.startsWith("drive:") })
        assertTrue(GuideSearch.cidMatches(Fixtures.bundle.search.items, "sepse").isEmpty())
        val parts = SmartSearch.highlight("Crise de Enxaqueca", listOf("enxaqueca"))
        assertEquals("Enxaqueca", parts.single { it.hit }.text)
    }
}
