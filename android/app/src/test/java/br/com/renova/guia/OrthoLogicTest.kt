package br.com.renova.guia

import br.com.renova.guia.data.Routes
import br.com.renova.guia.ortho.ConsultAnswers
import br.com.renova.guia.ortho.ConsultStep
import br.com.renova.guia.ortho.ExamResult
import br.com.renova.guia.ortho.OrthoConsult
import br.com.renova.guia.share.orthoShareText
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** O Guia de ortopedia no app: o pacote, a busca da aba, as citações, a consulta guiada e a nota SOAP. */
class OrthoLogicTest {
    private val content get() = Fixtures.content
    private val ortho get() = content.ortho ?: error("o pacote não trouxe a ortopedia: rode `node scripts/app/export-fixtures.mjs`")

    @Test
    fun `o pacote traz a ortopedia inteira, com regiões e atalhos apontando para tópicos reais`() {
        assertEquals(54, ortho.topics.size)
        assertEquals(46, ortho.conditions.size)
        assertEquals(3, ortho.tab.revision.current)
        // A 3ª revisão: todo tópico tem "na urgência", "no retorno" e "cirurgia e regulação" (que começa por "Sai da sua mão").
        for (t in ortho.topics) {
            assertTrue(t.slug, t.urgent.isNotEmpty() && t.clinic.isNotEmpty() && t.refer.first().startsWith("Sai da sua mão"))
        }
        val ombro = ortho.topic("luxacao-e-instabilidade-do-ombro")!!
        assertTrue(ombro.procedures!!.any { it.name.contains("Cunningham") && it.steps.size >= 3 && it.whenTo.isNotBlank() })
        assertEquals("trauma-grave", ortho.regionOf("fratura-exposta")!!.key)
        val slugs = ortho.slugs.toSet()
        for (r in ortho.tab.regions) for (s in r.topics) assertTrue("${r.key}: $s", s in slugs)
        for (s in ortho.tab.firstDay) assertTrue(s.slug, s.slug in slugs)
        for (s in ortho.tab.traumaTopics) assertTrue(s, s in slugs)
        for (c in ortho.tab.changes) assertTrue(c.slug, c.slug in slugs)
        assertTrue(ortho.topic("lombalgia-aguda")!!.revised >= 1)
        assertTrue(ortho.changesOf("lombalgia-aguda", 2).any { it.section.contains("Tramadol") })
        assertTrue(ortho.changesOf("lombalgia-aguda").any { it.section == "Encaminhar → Cirurgia e regulação" })
    }

    @Test
    fun `citação da ortopedia abre o tópico, e o id da busca descreve o item`() {
        for (t in ortho.topics) {
            assertEquals(Routes.ortoTopic(t.slug), content.citationRoute("orto-${t.slug}#1"))
            val ref = content.describe(t.id)
            assertNotNull(t.id, ref)
            assertEquals("ortopedia", ref!!.source)
            assertEquals(Routes.ortoTopic(t.slug), ref.route)
        }
        assertNull(content.citationRoute("orto-nao-existe#0"))
        for (item in ortho.tab.search.items) assertNotNull(item.id, content.describe(item.id))
    }

    @Test
    fun `a busca da aba acha por como o paciente fala, pela manobra e pelo remédio`() {
        fun top(q: String) = ortho.search.query(q).rows.firstOrNull()?.item?.id
        assertEquals("ortopedia:entorse-de-tornozelo", top("torceu o pe"))
        assertEquals("ortopedia:halux-valgo-e-metatarsalgia", top("joanete"))
        assertEquals("ortopedia:entorse-de-joelho-ligamentos", top("lachman"))
        assertEquals("ortopedia:crise-de-gota", top("podagra"))
        assertTrue(ortho.search.query("colchicina").rows.any { it.item.id == "ortopedia:crise-de-gota" })
        assertEquals("ortopedia:entorse-de-tornozelo", top("S93.4"))
    }

    @Test
    fun `com trauma os tópicos de trauma vêm primeiro e sem trauma por último`() {
        val joelho = ortho.region("joelho")!!
        assertEquals("entorse-de-joelho-ligamentos", ortho.orderTopics(joelho, true).first().slug)
        assertEquals("osteoartrite-de-joelho", ortho.orderTopics(joelho, false).first().slug)
        assertEquals(joelho.topics, ortho.orderTopics(joelho, null).map { it.slug })
        assertEquals("articulacao-quente", ortho.regionOf("crise-de-gota")!!.key)
    }

    @Test
    fun `o passo segue o que foi respondido`() {
        assertEquals(ConsultStep.REGIAO, OrthoConsult.stepOf(ConsultAnswers()))
        assertEquals(ConsultStep.ALARME, OrthoConsult.stepOf(ConsultAnswers(region = "joelho")))
        assertEquals(ConsultStep.CONDICAO, OrthoConsult.stepOf(ConsultAnswers(region = "joelho", trauma = false)))
        assertEquals(ConsultStep.ROTEIRO, OrthoConsult.stepOf(ConsultAnswers(region = "joelho", trauma = false, topic = "lesao-meniscal")))
    }

    @Test
    fun `a nota SOAP traz o que foi marcado, o alarme e a receita escolhida — igual ao site`() {
        val region = ortho.region("tornozelo-pe")!!
        val topic = ortho.topic("entorse-de-tornozelo")!!
        val answers = ConsultAnswers(
            region = "tornozelo-pe",
            trauma = true,
            alarm = setOf("u:1"),
            topic = "entorse-de-tornozelo",
            ask = setOf(0),
            askNote = "Torceu jogando futebol ontem.",
            exam = mapOf(0 to ExamResult.NEG, 1 to ExamResult.POS, 2 to ExamResult.ND),
            rx = setOf(0, 2),
            leave = "7 dias",
        )
        val note = OrthoConsult.buildSoapNote(ortho, region, topic, answers)
        assertTrue(note.startsWith("ORTOPEDIA — Entorse de tornozelo (CID S93.4)"))
        assertTrue(note.contains("com trauma"))
        assertTrue(note.contains("S — Anamnese\n- Como torceu"))
        assertTrue(note.contains(": SIM"))
        assertTrue(note.contains("Observações: Torceu jogando futebol ontem."))
        assertTrue(note.contains("- Regra de Ottawa: negativo"))
        assertTrue(note.contains("- Palpação ligamentar: POSITIVO ("))
        assertFalse(note.contains("Gaveta anterior e inclinação talar"))
        assertTrue(note.contains("SINAIS DE ALARME: " + ortho.tab.universalAlarm[1].take(20)))
        assertTrue(note.contains("ALARME PRESENTE: conduta de urgência hoje"))
        assertTrue(note.contains("- Na urgência: "))
        assertTrue(note.contains("- Cirurgia/regulação: Sai da sua mão"))
        assertTrue(note.contains("· Dipirona 1 g — "))
        assertTrue(note.contains("· Naproxeno 500 mg — "))
        assertFalse(note.contains("· Paracetamol"))
        assertTrue(note.contains("Atestado: 7 dias · Retorno: "))
        assertTrue(note.endsWith("Roteiro: Guia de ortopedia Renova, revisão 3."))

        val empty = OrthoConsult.buildSoapNote(ortho, ortho.region("lombar")!!, ortho.topic("lombalgia-aguda")!!, ConsultAnswers(region = "lombar", trauma = false, topic = "lombalgia-aguda"))
        assertTrue(empty.contains("nenhuma pergunta marcada"))
        assertTrue(empty.contains("nenhuma manobra registrada"))
        assertTrue(empty.contains("Sem sinais de alarme"))
        assertFalse(empty.contains("ALARME PRESENTE"))
    }

    @Test
    fun `o texto para compartilhar um tópico traz alarme, conduta e receita`() {
        val text = orthoShareText(ortho.topic("crise-de-gota")!!)
        assertTrue(text.startsWith("*Crise de gota*"))
        assertTrue(text.contains("CID M10.9"))
        assertTrue(text.contains("⚠"))
        assertTrue(text.contains("Colchicina 0,5 mg"))
        assertTrue(text.contains("Guia de ortopedia Renova"))
    }
}
