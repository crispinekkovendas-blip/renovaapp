package br.com.renova.guia

import br.com.renova.guia.ask.Piece
import br.com.renova.guia.ask.citedIds
import br.com.renova.guia.ask.formatAnswer
import br.com.renova.guia.data.AskEvent
import br.com.renova.guia.data.Routes
import br.com.renova.guia.data.parseAskLine
import br.com.renova.guia.share.driveShareText
import br.com.renova.guia.share.plainMd
import br.com.renova.guia.share.recipeShareText
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class AppLogicTest {
    private val content = Fixtures.content

    @Test
    fun `o pacote abre e tem as três abas`() {
        assertEquals(73, content.recipes.size)
        assertEquals(122, content.topics.size)
        assertEquals(90, content.driveEntries.size)
        assertTrue(content.bundle.changes.first().rev == content.bundle.revision.current)
    }

    @Test
    fun `toda citação possível da Super Inteligência abre um item do app`() {
        for (r in content.recipes) assertEquals(Routes.recipe(r.slug), content.citationRoute("receita-${r.slug}#0"))
        for ((_, t) in content.topics) assertEquals(Routes.topic(t.slug), content.citationRoute("${t.slug}#3"))
        for ((_, e) in content.driveEntries) assertEquals(Routes.drive(e.slug), content.citationRoute("drive-${e.slug}#0"))
        assertNull(content.citationRoute("nao-existe#0"))
    }

    @Test
    fun `cada resultado da busca e cada grupo do o-que-mudou tem para onde ir`() {
        for (item in content.bundle.search.items) assertNotNull(item.id, content.describe(item.id))
        for (rev in content.bundle.changes) for (tab in rev.tabs) for (g in tab.groups) {
            g.target?.let { assertNotNull(it, content.describe(it)) }
        }
    }

    @Test
    fun `citações da resposta viram números na ordem em que aparecem`() {
        val answer = "Pela receita pronta: **sumatriptana 50 mg** [[receita-crise-de-enxaqueca#0]].\n" +
            "- No plantão: dipirona [[enxaqueca#0]] [[receita-crise-de-enxaqueca#0]]\n" +
            "- Grupo: [[enxaqueca#0], [drive-enxaqueca#0]]"
        assertEquals(listOf("receita-crise-de-enxaqueca#0", "enxaqueca#0", "drive-enxaqueca#0"), citedIds(answer))
        val lines = formatAnswer(answer)
        assertEquals(3, lines.size)
        assertTrue(lines[1].bullet)
        assertEquals(Piece.Bold("sumatriptana 50 mg"), lines[0].pieces[1])
        assertEquals(listOf(2, 1), lines[1].pieces.filterIsInstance<Piece.Cite>().map { it.number })
        assertEquals(listOf(2, 3), lines[2].pieces.filterIsInstance<Piece.Cite>().map { it.number })
    }

    @Test
    fun `linhas do NDJSON viram eventos`() {
        assertEquals(AskEvent.Search("enxaqueca"), parseAskLine("""{"t":"search","q":"enxaqueca"}"""))
        assertEquals(AskEvent.Text("Olá"), parseAskLine("""{"t":"text","d":"Olá"}"""))
        assertEquals(AskEvent.Done, parseAskLine("""{"t":"done"}"""))
        val sources = parseAskLine("""{"t":"sources","items":[{"id":"enxaqueca#0","slug":"enxaqueca","topic":"Enxaqueca","section":null,"source":"plantao","href":"/guia/plantao/enxaqueca"}]}""")
        assertEquals("Enxaqueca", (sources as AskEvent.Sources).items.single().topic)
        assertNull(parseAskLine(""))
        assertNull(parseAskLine("lixo"))
        assertNull(parseAskLine("""{"t":"desconhecido"}"""))
    }

    @Test
    fun `texto para o WhatsApp sai como a receita no papel`() {
        val recipe = content.recipes.first { it.name == "Crise de enxaqueca" }
        val text = recipeShareText(recipe)
        assertTrue(text, text.startsWith("*Crise de enxaqueca* (CID ${recipe.cid})"))
        assertTrue(text, text.contains("1. ${recipe.items[0].name}"))
        assertTrue(text, text.contains(recipe.items[0].posology))
        assertTrue(text.contains("confira antes de prescrever"))
        val entry = content.driveEntry("enxaqueca")!!.second
        val drive = driveShareText(entry)
        assertTrue(drive, drive.startsWith("*${entry.title}*"))
        assertTrue(drive, !drive.contains("**"))
        assertEquals("*Criança:* 10 mg/kg e _se dor_", plainMd("**Criança:** 10 mg/kg e *se dor*"))
    }

    @Test
    fun `anterior e próximo seguem a ordem do guia`() {
        val slugs = content.topicSlugs
        val (prev, next) = content.neighbors(slugs[1], slugs)
        assertEquals(slugs[0], prev)
        assertEquals(slugs[2], next)
        assertEquals(null to slugs[1], content.neighbors(slugs[0], slugs))
    }
}
