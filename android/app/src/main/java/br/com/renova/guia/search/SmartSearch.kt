package br.com.renova.guia.search

import java.text.Normalizer
import kotlin.math.abs

/*
 * A busca do Guia clínico, igual à do site: porte linha a linha de
 * src/lib/normalize.ts e src/lib/smart-search.ts. Os testes de paridade
 * (SmartSearchGoldenTest) comparam com o motor do site, consulta a consulta —
 * mudou lá, muda aqui.
 *
 * Tolera erro de digitação, completa a palavra que ainda está sendo digitada,
 * entende sinônimo e abreviação e aprende com o que o médico abre.
 */

/**
 * Sem acento, minúsculo, pontuação virando espaço (normalize.ts). Laço à mão,
 * sem regex (o índice chama isto em todo o texto do guia): qualquer sequência
 * do que não é a-z ou 0-9 vira um espaço só, e as pontas saem — o mesmo que o
 * `replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()` do site.
 */
fun searchKey(value: String): String {
    val nfd = Normalizer.normalize(value, Normalizer.Form.NFD)
    val stripped = StringBuilder(nfd.length)
    var i = 0
    while (i < nfd.length) {
        val cp = nfd.codePointAt(i)
        if (!Diacritics.contains(cp)) stripped.appendCodePoint(cp)
        i += Character.charCount(cp)
    }
    val lower = stripped.toString().lowercase()
    val out = StringBuilder(lower.length)
    var gap = false
    for (c in lower) {
        if (c in 'a'..'z' || c in '0'..'9') {
            if (gap && out.isNotEmpty()) out.append(' ')
            gap = false
            out.append(c)
        } else {
            gap = true
        }
    }
    return out.toString()
}

private val STOP = (
    "de da do das dos e em a o as os um uma uns umas para por com sem se ou no na nos nas ao aos que caso via ate apos cada " +
        "mg ml mcg ui kg dia dias hora horas qual quais como quando quanto quantos quantas onde fazer faz devo tratar tratamento " +
        "conduta manejo paciente pacientes"
    ).split(" ").toHashSet()

/** Palavras de pergunta nunca são começo de termo médico, nem digitando. */
private val STOP_TYPED = setOf("qual", "quais", "como", "quando", "quanto", "onde")

private fun hasDigit(s: String): Boolean = s.any { it in '0'..'9' }

fun tokens(text: String): List<String> =
    searchKey(text).split(" ").filter { (it.length > 1 || hasDigit(it)) && it !in STOP }

/** `pattern` seguido de "e" ou "i" vira `replacement` (o `x(?=[ei])` do site), da esquerda para a direita. */
private fun beforeEi(s: String, pattern: String, replacement: Char): String {
    if (!s.contains(pattern)) return s
    val out = StringBuilder(s.length)
    var i = 0
    while (i < s.length) {
        val end = i + pattern.length
        if (s.startsWith(pattern, i) && end < s.length && (s[end] == 'e' || s[end] == 'i')) {
            out.append(replacement)
            i = end
        } else {
            out.append(s[i])
            i++
        }
    }
    return out.toString()
}

/**
 * Chave sonora do português ("anafilacia" ~ "anafilaxia"): a mesma sequência
 * de trocas do site, à mão (o índice calcula uma para cada palavra do guia).
 */
fun soundKey(word: String): String {
    var s = word.replace("ph", "f").replace("th", "t").replace("sh", "x").replace("ch", "x").replace("lh", "li").replace("nh", "ni")
    s = beforeEi(s, "qu", 'k')
    s = beforeEi(s, "gu", 'g')
    s = beforeEi(s, "c", 's')
    s = beforeEi(s, "g", 'j')
    s = beforeEi(s, "sc", 's')
    s = beforeEi(s, "xc", 's')
    s = s.replace("ç", "s")
    val mapped = StringBuilder(s.length)
    for (c in s) {
        mapped.append(
            when (c) {
                'k', 'q' -> 'c'
                'y' -> 'i'
                'w' -> 'v'
                'z', 'x' -> 's'
                else -> c
            },
        )
    }
    s = mapped.toString()
    if (s.startsWith("h")) s = s.substring(1)
    // Vogal + h: o h sai ("ah" → "a").
    val noH = StringBuilder(s.length)
    var i = 0
    while (i < s.length) {
        val c = s[i]
        noH.append(c)
        i += if ((c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') && i + 1 < s.length && s[i + 1] == 'h') 2 else 1
    }
    // Letra repetida vira uma só.
    val out = StringBuilder(noH.length)
    for (c in noH) if (out.isEmpty() || out[out.length - 1] != c) out.append(c)
    return out.toString()
}

private val SUFFIXES = listOf(
    "amentos", "imentos", "amento", "imento", "acoes", "icoes", "coes", "acao", "icao", "cao", "idos", "idas", "ados", "adas",
    "ivos", "ivas", "ido", "ida", "ado", "ada", "ivo", "iva", "oes", "ao", "ir", "ar", "er", "os", "as", "es", "o", "a", "e", "s",
)

/** Radical simples do português; nunca deixa menos de 4 letras. */
fun stem(word: String): String {
    for (suffix in SUFFIXES) {
        if (word.endsWith(suffix) && word.length - suffix.length >= 4) return word.substring(0, word.length - suffix.length)
    }
    return word
}

/** Distância Damerau-Levenshtein, desistindo cedo quando passa de `max`. */
fun editDistance(a: String, b: String, max: Int): Int {
    if (abs(a.length - b.length) > max) return max + 1
    val n = b.length
    var prev2 = IntArray(n + 1)
    var prev = IntArray(n + 1) { it }
    for (i in 1..a.length) {
        val cur = IntArray(n + 1)
        cur[0] = i
        var rowMin = cur[0]
        for (j in 1..n) {
            val cost = if (a[i - 1] == b[j - 1]) 0 else 1
            var v = minOf(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
            if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) v = minOf(v, prev2[j - 2] + 1)
            cur[j] = v
            if (v < rowMin) rowMin = v
        }
        if (rowMin > max) return max + 1
        prev2 = prev
        prev = cur
    }
    return prev[n]
}

class SearchField(val text: String, val weight: Double)

class SearchDoc(val id: String, val fields: List<SearchField>)

class Posting(val doc: Int, val w: Double)

class SearchIndex internal constructor(
    val ids: List<String>,
    /** Palavras do índice em ordem alfabética (para completar por prefixo). */
    val vocab: List<String>,
    /** Chave sonora de cada palavra de `vocab`, na mesma ordem. */
    internal val vocabSound: List<String>,
    val post: Map<String, List<Posting>>,
    val sound: Map<String, List<String>>,
    val stems: Map<String, List<String>>,
    val pop: Map<String, Double>,
)

class SearchHit(val id: String, val score: Double, val complete: Boolean, val terms: List<String>)

class SearchResult(val hits: List<SearchHit>, val suggestion: String?)

/** Pedaço de texto para destacar as palavras que casaram. */
data class TextPart(val text: String, val hit: Boolean)

private class Scored(val score: Double, val terms: List<String>)

private class DocAcc(var total: Double, var groups: Int, val terms: LinkedHashSet<String>)

private class Alternative(val words: List<String>, val factor: Double)

private class QueryGroup(val label: String, val alternatives: List<Alternative>)

/** O motor; os sinônimos vêm do pacote do guia (search-synonyms.ts). */
class SmartSearch(synonymTable: Map<String, List<String>>) {
    private val synonyms: Map<String, List<List<String>>> = LinkedHashMap<String, List<List<String>>>().apply {
        for ((key, values) in synonymTable) put(tokens(key).joinToString(" "), values.map { tokens(it) })
    }

    fun buildIndex(docs: List<SearchDoc>): SearchIndex {
        val post = LinkedHashMap<String, MutableList<Posting>>()
        val pop = HashMap<String, Double>()
        docs.forEachIndexed { d, doc ->
            val weights = LinkedHashMap<String, Double>()
            for (field in doc.fields) {
                for (t in tokens(field.text)) {
                    // O campo mais forte manda; repetir a palavra no corpo soma pouco.
                    val was = weights[t] ?: 0.0
                    weights[t] = maxOf(was, field.weight) + (if (was > 0) 0.1 else 0.0)
                }
            }
            for ((t, w) in weights) {
                post.getOrPut(t) { mutableListOf() }.add(Posting(d, minOf(w, 12.0)))
                pop[t] = (pop[t] ?: 0.0) + (if (w >= 5) 4.0 else 1.0)
            }
        }
        val vocab = post.keys.sorted()
        val vocabSound = vocab.map { soundKey(it) }
        val sound = LinkedHashMap<String, MutableList<String>>()
        vocab.forEachIndexed { i, t -> sound.getOrPut(vocabSound[i]) { mutableListOf() }.add(t) }
        val stems = LinkedHashMap<String, MutableList<String>>()
        for (t in vocab) {
            if (t.length < 5 || hasDigit(t)) continue
            stems.getOrPut(stem(t)) { mutableListOf() }.add(t)
        }
        return SearchIndex(docs.map { it.id }, vocab, vocabSound, post, sound, stems, pop)
    }

    /** Palavras do índice que casam com uma palavra da busca, com a qualidade de 0 a 1. */
    internal fun matchTerm(index: SearchIndex, q: String, typing: Boolean): LinkedHashMap<String, Double> {
        val out = LinkedHashMap<String, Double>()
        fun put(t: String, quality: Double) {
            if ((out[t] ?: 0.0) < quality) out[t] = quality
        }
        if (index.post.containsKey(q)) put(q, 1.0)
        val qs = soundKey(q)
        for (t in index.sound[qs] ?: emptyList()) put(t, 0.92)
        // Mesma família só com um começo comum de 5 letras.
        if (q.length >= 5) for (t in index.stems[stem(q)] ?: emptyList()) if (t.take(5) == q.take(5)) put(t, 0.8)

        // Começa com: a palavra que ainda está sendo digitada, ou abreviada de propósito ("ped", "intox").
        if ((typing && q.length >= 2) || q.length >= 3) {
            val quality = if (typing) 0.86 else 0.72
            var i = lowerBound(index.vocab, q)
            while (i < index.vocab.size && index.vocab[i].startsWith(q)) {
                put(index.vocab[i], quality)
                i++
            }
        }

        if (q.length >= 4) {
            val max = if (q.length >= 7) 2 else 1
            for ((i, t) in index.vocab.withIndex()) {
                if (abs(t.length - q.length) <= max) {
                    val d = minOf(editDistance(q, t, max), editDistance(qs, index.vocabSound[i], max))
                    if (d <= max) put(t, if (d == 1) 0.7 else 0.5)
                }
                // Ainda digitando e já errou: "anafilac" → "anafilaxia".
                if (typing && t.length > q.length && editDistance(q, t.substring(0, q.length), 1) <= 1) put(t, 0.55)
            }
        }
        return out
    }

    private fun parseQuery(query: String): List<QueryGroup> {
        val words = tokens(query).toMutableList()
        // A palavra em digitação entra mesmo sendo curta ou "vazia": "se" pode virar "sepse".
        val typed = searchKey(query).split(" ").last()
        if (!endsWithSpace(query) && typed.length >= 2 && typed !in STOP_TYPED && words.lastOrNull() != typed) words.add(typed)
        val groups = mutableListOf<QueryGroup>()
        var i = 0
        while (i < words.size) {
            // O sinônimo mais longo que começa aqui ("dor de cabeca" antes de "dor").
            var taken = 1
            var expansions: List<List<String>> = emptyList()
            var len = minOf(3, words.size - i)
            while (len >= 1) {
                val found = synonyms[words.subList(i, i + len).joinToString(" ")] ?: emptyList()
                if (found.isNotEmpty()) {
                    taken = len
                    expansions = found
                    break
                }
                len--
            }
            val own = words.subList(i, i + taken).toList()
            groups.add(QueryGroup(own.joinToString(" "), listOf(Alternative(own, 1.0)) + expansions.map { Alternative(it, 0.9) }))
            i += taken
        }
        return groups
    }

    fun search(index: SearchIndex, query: String, limit: Int = 60, boost: ((String) -> Double)? = null): SearchResult {
        val groups = parseQuery(query)
        if (groups.isEmpty()) return SearchResult(emptyList(), null)
        val typingLast = !endsWithSpace(query)
        val n = index.ids.size.toDouble()
        fun idf(t: String): Double = StrictMath.log(1 + n / (index.post[t]?.size?.toDouble() ?: n))

        val perDoc = LinkedHashMap<Int, DocAcc>()
        groups.forEachIndexed { gi, group ->
            val best = LinkedHashMap<Int, Scored>()
            val lastGroup = gi == groups.size - 1
            for (alt in group.alternatives) {
                // Cada palavra da alternativa precisa casar no mesmo documento.
                var acc: LinkedHashMap<Int, Scored>? = null
                alt.words.forEachIndexed { wi, word ->
                    val typing = typingLast && lastGroup && alt.factor == 1.0 && wi == alt.words.size - 1
                    val docScores = LinkedHashMap<Int, Scored>()
                    for ((term, quality) in matchTerm(index, word, typing)) {
                        val s0 = quality * idf(term)
                        for (p in index.post[term] ?: emptyList()) {
                            val s = s0 * p.w
                            val cur = docScores[p.doc]
                            if (cur == null || cur.score < s) docScores[p.doc] = Scored(s, listOf(term))
                        }
                    }
                    val previous = acc
                    acc = if (previous == null) {
                        docScores
                    } else {
                        val next = LinkedHashMap<Int, Scored>()
                        for ((d, v) in previous) {
                            val other = docScores[d]
                            if (other != null) next[d] = Scored(v.score + other.score, v.terms + other.terms)
                        }
                        next
                    }
                }
                for ((d, v) in acc ?: LinkedHashMap()) {
                    val s = v.score * alt.factor
                    val cur = best[d]
                    if (cur == null || cur.score < s) best[d] = Scored(s, v.terms)
                }
            }
            for ((d, v) in best) {
                val cur = perDoc.getOrPut(d) { DocAcc(0.0, 0, LinkedHashSet()) }
                cur.total += v.score
                cur.groups += 1
                cur.terms.addAll(v.terms)
            }
        }

        val need = groups.size
        // Quem casa com todas as partes vale inteiro; quem deixa uma de fora entra com desconto.
        val minGroups = need - (if (need > 1) 1 else 0)
        val hits = perDoc.entries
            .filter { it.value.groups >= minGroups }
            .map { (d, v) ->
                val id = index.ids[d]
                SearchHit(
                    id = id,
                    score = v.total * (if (v.groups == need) 1.0 else 0.55) + (boost?.invoke(id) ?: 0.0),
                    complete = v.groups == need,
                    terms = v.terms.toList(),
                )
            }
            .sortedByDescending { it.score }
        return SearchResult(hits.take(limit), if (hits.isEmpty()) correct(index, query) else null)
    }

    /** Cada palavra trocada pela mais provável do índice ("sepce choqe" → "sepse choque"). */
    fun correct(index: SearchIndex, query: String): String? {
        var changed = false
        val fixed = tokens(query).map { w ->
            if (index.post.containsKey(w)) return@map w
            var best: String? = null
            var bestScore = 0.0
            for ((t, quality) in matchTerm(index, w, false)) {
                val s = quality * StrictMath.log(2 + (index.pop[t] ?: 0.0))
                if (s > bestScore) {
                    best = t
                    bestScore = s
                }
            }
            if (best != null && best != w) changed = true
            best ?: w
        }
        return if (changed) fixed.joinToString(" ") else null
    }

    /** Como a palavra em digitação deve terminar (o texto fantasma que o Tab aceita). */
    fun completeWord(index: SearchIndex, query: String): String? {
        // Depois de espaço ou pontuação ("criança?") não há palavra sendo digitada.
        if (query.isNotEmpty() && !isLetterOrNumber(query.codePointBefore(query.length))) return null
        val typed = searchKey(query).split(" ").last()
        if (typed.length < 2) return null
        var best: String? = null
        var bestPop = -1.0
        var i = lowerBound(index.vocab, typed)
        while (i < index.vocab.size && index.vocab[i].startsWith(typed)) {
            val t = index.vocab[i]
            // Palavra de título pesa mais; palavra curta demais não é o que se procura.
            val p = (index.pop[t] ?: 0.0) * (if (t.length >= 4) 1.0 else 0.1)
            if (t.length > typed.length && p > bestPop) {
                best = t
                bestPop = p
            }
            i++
        }
        return best
    }

    companion object {
        private val WORD = Regex("[\\p{L}\\p{N}]+")

        /** Divide o texto para destacar as palavras que casaram; a comparação é sem acento. */
        fun highlight(text: String, terms: Collection<String>): List<TextPart> {
            if (terms.isEmpty()) return listOf(TextPart(text, false))
            val parts = mutableListOf<TextPart>()
            var last = 0
            for (m in WORD.findAll(text)) {
                val key = searchKey(m.value)
                val hit = key.length > 1 && terms.any { t -> key == t || (t.length >= 3 && key.startsWith(t)) }
                if (!hit) continue
                if (m.range.first > last) parts.add(TextPart(text.substring(last, m.range.first), false))
                parts.add(TextPart(m.value, true))
                last = m.range.last + 1
            }
            if (last < text.length) parts.add(TextPart(text.substring(last), false))
            return parts
        }

        /** A primeira linha com mais palavras que casaram — o trecho mostrado no resultado. */
        fun bestLine(lines: List<String>, terms: Collection<String>): String? {
            var best: String? = null
            var bestCount = 0
            for (line in lines) {
                val keys = tokens(line).toHashSet()
                var count = 0
                for (t in terms) if (t in keys) count++
                if (count > bestCount) {
                    best = line
                    bestCount = count
                    if (count == terms.size) break
                }
            }
            return best
        }
    }
}

/** Primeiro índice de `vocab` que começa com `prefix` (busca binária). */
private fun lowerBound(vocab: List<String>, prefix: String): Int {
    var lo = 0
    var hi = vocab.size
    while (lo < hi) {
        val mid = (lo + hi) ushr 1
        if (vocab[mid] < prefix) lo = mid + 1 else hi = mid
    }
    return lo
}

private fun endsWithSpace(query: String): Boolean = query.isNotEmpty() && query.last().isWhitespace()

private fun isLetterOrNumber(cp: Int): Boolean {
    if (Character.isLetter(cp)) return true
    val type = Character.getType(cp)
    return type == Character.DECIMAL_DIGIT_NUMBER.toInt() || type == Character.LETTER_NUMBER.toInt() || type == Character.OTHER_NUMBER.toInt()
}
