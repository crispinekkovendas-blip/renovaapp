package br.com.renova.guia.search

import br.com.renova.guia.data.GuideCondition
import kotlin.math.ln

/**
 * "Escutar o paciente": a fala (ou o que o médico digitou) vira uma lista de
 * condições do guia a considerar, cada uma com as queixas que casaram.
 *
 * Cada condição tem dezenas de frases de queixa (clinical-terms + o
 * vocabulário ampliado). Uma frase conta quando a maior parte das palavras
 * dela — pesadas pela raridade entre as condições — aparece na fala, com
 * tolerância a variação ("inchou" ~ "inchado", "enjoada" ~ "enjoo"). Frases
 * parecidas da mesma condição somam com desconto. O que vem depois de "sem",
 * "nega", "não tem", "não teve"… não conta.
 *
 * Apoio à decisão: diz onde olhar no guia, não dá diagnóstico.
 */
class SymptomMatcher(conditions: List<GuideCondition>) {
    /** Uma palavra da frase com as variantes já calculadas (calcular a cada busca deixava a escuta lenta). */
    private class Tok(val t: String) {
        val stemKey: String? = if (t.length >= 5) stem(t) else null
        val soundK: String? = if (t.length >= 4) soundKey(t) else null
        val rootKey: String? = if (t.length >= 5) root(t) else null
    }

    private class Phrase(val text: String, words: List<String>, val isName: Boolean) {
        val toks: List<String> = words
        val keys: List<Tok> = words.map { Tok(it) }
    }

    private class Cond(val condition: GuideCondition, val phrases: List<Phrase>)

    data class Match(
        val condition: GuideCondition,
        val score: Double,
        /** As queixas (ou nomes) da condição que casaram com a fala, da mais forte para a mais fraca. */
        val evidence: List<String>,
    )

    private val conds: List<Cond> = conditions.map { c ->
        val phrases = c.names.map { Phrase(it, canonTokens(it), true) } + c.symptoms.map { Phrase(it, canonTokens(it), false) }
        Cond(c, phrases.filter { it.toks.isNotEmpty() })
    }

    /** Em quantas condições cada palavra aparece: a rara pesa mais. */
    private val weight: Map<String, Double> = run {
        val df = HashMap<String, Int>()
        for (c in conds) for (t in c.phrases.flatMapTo(HashSet()) { it.toks }) df[t] = (df[t] ?: 0) + 1
        val n = conds.size.toDouble().coerceAtLeast(1.0)
        df.mapValues { (_, d) -> ln(1 + n / d) }
    }

    private class Heard(val words: Set<String>) {
        val stems: Set<String> = words.filter { it.length >= 5 }.mapTo(HashSet()) { stem(it) }
        val sounds: Set<String> = words.filter { it.length >= 4 }.mapTo(HashSet()) { soundKey(it) }
        val roots: Set<String> = words.mapTo(HashSet()) { root(it) }

        fun has(k: Tok): Boolean =
            k.t in words || (k.stemKey != null && k.stemKey in stems) || (k.soundK != null && k.soundK in sounds) || (k.rootKey != null && k.rootKey in roots)
    }

    fun rank(transcript: String, limit: Int = 8): List<Match> {
        // Consulta longa: as últimas ~2.000 letras bastam e mantêm a escuta rápida.
        val text = if (transcript.length > MAX_CHARS) transcript.substring(transcript.length - MAX_CHARS) else transcript
        val heard = Heard(positiveWords(text))
        if (heard.words.isEmpty()) return emptyList()
        val out = ArrayList<Match>()
        for (c in conds) {
            val scored = ArrayList<Pair<Phrase, Double>>()
            for (p in c.phrases) {
                var total = 0.0
                var got = 0.0
                for (k in p.keys) {
                    val w = weight[k.t] ?: 1.0
                    total += w
                    if (heard.has(k)) got += w
                }
                if (got == 0.0 || total == 0.0) continue
                val coverage = got / total
                if (coverage < MIN_COVERAGE) continue
                // Frase de uma palavra só vale se a palavra for rara e não curta ("dor" sozinha não diz nada).
                if (p.toks.size == 1 && (p.toks[0].length < 4 || (weight[p.toks[0]] ?: 0.0) < MIN_SINGLE_WEIGHT)) continue
                val value = coverage * coverage * got * (if (p.isName) NAME_BONUS else 1.0)
                scored.add(p to value)
            }
            if (scored.isEmpty()) continue
            scored.sortByDescending { it.second }
            var score = 0.0
            for ((i, s) in scored.take(MAX_PHRASES).withIndex()) score += s.second * Math.pow(DECAY, i.toDouble())
            if (score < MIN_SCORE) continue
            val evidence = scored.map { it.first.text }.distinctBy { searchKey(it) }.take(5)
            out.add(Match(c.condition, score, evidence))
        }
        out.sortByDescending { it.score }
        return out.take(limit)
    }

    companion object {
        private const val MIN_COVERAGE = 0.6
        private const val MIN_SINGLE_WEIGHT = 2.0
        private const val NAME_BONUS = 1.5
        private const val DECAY = 0.75
        private const val MAX_PHRASES = 12
        private const val MIN_SCORE = 1.5
        private const val MAX_CHARS = 2000

        /** Palavras do dia a dia que valem pela mesma ideia ("xixi ardendo" ~ "ardência para urinar"). */
        private val CANON: Map<String, String> = buildMap {
            for (w in listOf("xixi", "mijo", "mijar", "mijando", "urinar", "urina", "urinando", "urinou")) put(w, "urina")
            for (w in listOf("ardendo", "arde", "ardeu", "ardor", "ardencia", "ardida", "ardido", "ardidas")) put(w, "arde")
            for (w in listOf("queimando", "queimacao", "queima", "queimor", "queimou")) put(w, "queima")
            for (w in listOf("barriga", "abdome", "abdomen", "abdominal", "bucho")) put(w, "barriga")
            for (w in listOf("vomito", "vomitos", "vomitando", "vomitar", "vomitei", "vomitou", "golfando", "golfar")) put(w, "vomito")
            for (w in listOf("enjoo", "enjoada", "enjoado", "enjoando", "nausea", "nauseas", "nauseada", "enjoos")) put(w, "enjoo")
            for (w in listOf("cansaco", "cansada", "cansado", "cansando", "canseira")) put(w, "cansa")
            for (w in listOf("inchado", "inchada", "inchaco", "inchou", "inchando", "inchados", "inchadas", "inchacao")) put(w, "incha")
            for (w in listOf("coceira", "cocando", "cocar", "coca", "cocei", "cocava", "comichao")) put(w, "coca")
            for (w in listOf("tontura", "tonta", "tonto", "tonteira", "zonzo", "zonza", "zonzeira", "vertigem")) put(w, "tontura")
            for (w in listOf("dor", "dores", "doi", "doendo", "dolorido", "dolorida", "doeu", "doia")) put(w, "dor")
            for (w in listOf("febre", "febril", "febrao")) put(w, "febre")
            for (w in listOf("tosse", "tossindo", "tossir", "tossiu", "tosses")) put(w, "tosse")
            for (w in listOf("sangue", "sangrando", "sangramento", "sangrou", "sangra")) put(w, "sangue")
        }

        /** As palavras de um texto, já trocadas pela forma comum. */
        fun canonTokens(text: String): List<String> = tokens(text).map { CANON[it] ?: it }

        private val NEGATORS = setOf("sem", "nega", "negou", "negando", "nunca")
        private val NEG_VERBS = setOf("tem", "teve", "tenho", "tive", "sente", "sentiu", "sinto", "senti", "apresenta", "apresentou", "houve")

        /** As palavras da fala, tirando as negadas ("sem febre", "não tem tosse", "nega vômito"). */
        fun positiveWords(transcript: String): Set<String> {
            val words = searchKey(transcript).split(" ").filter { it.isNotEmpty() }
            val keep = ArrayList<String>(words.size)
            var negate = 0
            var i = 0
            while (i < words.size) {
                val w = words[i]
                when {
                    w in NEGATORS -> negate = 3
                    w == "nao" && i + 1 < words.size && words[i + 1] in NEG_VERBS -> {
                        negate = 3
                        i++
                    }
                    negate > 0 -> negate--
                    else -> keep.add(w)
                }
                i++
            }
            return canonTokens(keep.joinToString(" ")).toSet()
        }

        private val ENDINGS = listOf(
            "aram", "eram", "iram", "ando", "endo", "indo", "ados", "adas", "acao", "aco", "ado", "ada", "ava",
            "ou", "ei", "ia", "ar", "er", "ir", "ao", "s", "o", "a", "e",
        )

        /** Raiz grosseira do verbo e do adjetivo falados ("inchou" ~ "inchado", "faltando" ~ "falta"). */
        fun root(w: String): String {
            if (w.length < 5) return w
            for (e in ENDINGS) if (w.endsWith(e) && w.length - e.length >= 4) return w.substring(0, w.length - e.length)
            return w
        }
    }
}
