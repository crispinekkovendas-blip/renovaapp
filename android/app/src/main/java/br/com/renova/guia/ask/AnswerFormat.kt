package br.com.renova.guia.ask

/*
 * O texto da resposta da Super Inteligência: parágrafos, tópicos com "- ",
 * **negrito** só nas doses e as citações [[id]] de cada trecho do guia
 * (src/lib/guide-citations.ts). Aqui o texto vira pedaços; a tela desenha.
 */

/** Uma citação ou um grupo delas: [[a#1]], [[a#1], [b#2]], [[a#1, b#2]]. */
private val CITATION = Regex("\\[\\[?[a-z0-9-]+#\\d+\\]?(?:\\s*[,;]?\\s*\\[?[a-z0-9-]+#\\d+\\]?)*\\]\\]?")
private val CITATION_ID = Regex("[a-z0-9-]+#\\d+")
private val BOLD = Regex("\\*\\*([^*]+)\\*\\*")

/** As citações do texto, na ordem em que aparecem, sem repetir. */
fun citedIds(text: String): List<String> {
    val ids = mutableListOf<String>()
    for (group in CITATION.findAll(text)) {
        for (id in CITATION_ID.findAll(group.value)) if (id.value !in ids) ids.add(id.value)
    }
    return ids
}

sealed interface Piece {
    data class Plain(val text: String) : Piece
    data class Bold(val text: String) : Piece
    /** Número da fonte (1, 2…) e o id do trecho citado. */
    data class Cite(val number: Int, val id: String) : Piece
}

/** Uma linha da resposta: tópico ("- ") ou parágrafo, com os pedaços. */
data class AnswerLine(val bullet: Boolean, val pieces: List<Piece>)

fun formatAnswer(text: String): List<AnswerLine> {
    val order = citedIds(text)
    return text.split("\n").map { it.trimEnd() }.filter { it.isNotBlank() }.map { raw ->
        val bullet = raw.trimStart().startsWith("- ") || raw.trimStart().startsWith("* ")
        val line = if (bullet) raw.trimStart().drop(2) else raw
        AnswerLine(bullet, pieces(line, order))
    }
}

private fun pieces(line: String, order: List<String>): List<Piece> {
    val out = mutableListOf<Piece>()
    var last = 0
    for (m in CITATION.findAll(line)) {
        if (m.range.first > last) out.addAll(boldPieces(line.substring(last, m.range.first)))
        for (id in CITATION_ID.findAll(m.value)) out.add(Piece.Cite(order.indexOf(id.value) + 1, id.value))
        last = m.range.last + 1
    }
    if (last < line.length) out.addAll(boldPieces(line.substring(last)))
    return out
}

private fun boldPieces(text: String): List<Piece> {
    val out = mutableListOf<Piece>()
    var last = 0
    for (m in BOLD.findAll(text)) {
        if (m.range.first > last) out.add(Piece.Plain(text.substring(last, m.range.first)))
        out.add(Piece.Bold(m.groupValues[1]))
        last = m.range.last + 1
    }
    if (last < text.length) out.add(Piece.Plain(text.substring(last)))
    return out
}
