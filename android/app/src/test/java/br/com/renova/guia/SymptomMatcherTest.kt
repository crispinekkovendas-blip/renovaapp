package br.com.renova.guia

import br.com.renova.guia.search.SymptomMatcher
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** "Escutar o paciente": a queixa como o paciente fala leva à condição certa do guia. */
class SymptomMatcherTest {
    private val matcher = Fixtures.content.listener

    private fun top(text: String, n: Int = 3) = matcher.rank(text, n).map { it.condition.key }

    @Test
    fun `cada condição do pacote tem queixas e itens`() {
        val conditions = Fixtures.bundle.conditions
        assertTrue("poucas condições: ${conditions.size}", conditions.size >= 140)
        for (c in conditions) {
            assertTrue(c.key, c.items.isNotEmpty())
            assertTrue("${c.key}: só ${c.symptoms.size} queixas", c.symptoms.size >= 8)
            for (id in c.items) assertTrue(id, Fixtures.content.describe(id) != null)
        }
    }

    @Test
    fun `a fala do paciente leva à condição`() {
        val cases = mapOf(
            "doutor eu tô com uma dor de cabeça latejante só do lado direito, a luz incomoda e tô enjoada" to "enxaqueca",
            "tá ardendo pra fazer xixi e eu vou no banheiro toda hora, sai pouquinho" to "cistite",
            "uma dor no peito apertando que vai pro braço esquerdo e eu fiquei suando frio" to "coronariana",
            "tô com falta de ar e um chiado no peito, já usei a bombinha e não melhorou" to "asma",
            "meu filho tá com febre, chorando muito e puxando a orelha de noite" to "otite media",
            "uma coceira no corpo todo que piora de noite e todo mundo em casa tá coçando" to "escabiose",
            "começou uma dor em volta do umbigo que desceu pro lado direito da barriga, perdi a fome" to "apendicite",
            "o dedão do pé ficou vermelho, inchado e quente, dói até encostar o lençol" to "gota",
        )
        val failures = cases.mapNotNull { (text, key) ->
            val got = top(text)
            if (key in got) null else "\"$text\" → $got (esperava $key)"
        }
        assertTrue(failures.joinToString("\n"), failures.isEmpty())
    }

    @Test
    fun `mostra a queixa que casou`() {
        val m = matcher.rank("dor de cabeça latejante de um lado e luz incomoda", 1).first()
        assertEquals("enxaqueca", m.condition.key)
        assertTrue(m.evidence.toString(), m.evidence.isNotEmpty())
    }

    @Test
    fun `o que vem depois de sem e nao tem nao conta`() {
        val words = SymptomMatcher.positiveWords("tosse seca sem febre e não tem falta de ar, nega vômito; não consigo dormir")
        assertTrue("tosse" in words)
        assertFalse(words.toString(), "febre" in words)
        assertFalse(words.toString(), "falta" in words)
        assertFalse(words.toString(), "vomito" in words)
        assertTrue("'não consigo' não é negação", "dormir" in words)
    }

    @Test
    fun `fala vazia ou sem queixa nao inventa condicao`() {
        assertTrue(matcher.rank("").isEmpty())
        assertTrue(matcher.rank("bom dia doutor, tudo bem com o senhor?").isEmpty())
    }

    @Test
    fun `fala qualquer nunca derruba a escuta e responde rapido`() {
        // A escuta chama rank() a cada pausa da fala: um erro aqui fecharia o app.
        val phrases = Fixtures.bundle.conditions.flatMap { it.symptoms + it.names }
        val noise = listOf("", " ", "...", "?!", "123", "3,5", "39.8°", "sem", "não tem", "nega", "nao", "a", "é", "ã", "ç", "
", "doutora", "uhum", "tá", "né")
        val random = java.util.Random(7)
        var slowest = 0L
        repeat(2000) {
            val parts = (0 until 1 + random.nextInt(40)).map {
                if (random.nextInt(4) == 0) noise[random.nextInt(noise.size)] else phrases[random.nextInt(phrases.size)]
            }
            val text = parts.joinToString(if (random.nextBoolean()) " " else ", ")
            val start = System.nanoTime()
            val result = matcher.rank(text)
            slowest = maxOf(slowest, (System.nanoTime() - start) / 1_000_000)
            assertTrue(result.size <= 8)
        }
        // Uma consulta inteira (texto bem longo) também.
        val long = (0 until 400).joinToString(". ") { phrases[random.nextInt(phrases.size)] }
        matcher.rank(long)
        assertTrue("rank() lento demais: ${slowest} ms", slowest < 2000)
    }
}
