package br.com.renova.guia.share

import br.com.renova.guia.data.DriveEntry
import br.com.renova.guia.data.Recipe

/*
 * O texto para mandar no WhatsApp ou copiar: a receita como sai no papel,
 * com *negrito* do WhatsApp no nome. Sem dado de paciente — é o modelo.
 */

fun recipeShareText(recipe: Recipe, withOrientation: Boolean = false): String = buildString {
    append("*").append(recipe.name).append("*")
    if (recipe.cid.isNotBlank()) append(" (CID ").append(recipe.cid).append(")")
    append("\n")
    recipe.items.forEachIndexed { i, item ->
        append("\n").append(i + 1).append(". ").append(item.name)
        if (item.quantity.isNotBlank()) append(" — ").append(item.quantity)
        append("\n   ").append(item.posology)
        if (item.route.isNotBlank()) append(" (").append(item.route).append(")")
    }
    if (withOrientation && recipe.orientation != null) {
        append("\n\n*Orientações*\n").append(recipe.orientation.text.trim())
    }
    append("\n\n— Guia clínico Renova · ponto de partida para adulto sem comorbidade; confira antes de prescrever.")
}

fun driveShareText(entry: DriveEntry): String = buildString {
    append("*").append(entry.title).append("*")
    entry.cid?.let { append(" (CID ").append(it).append(")") }
    append("\n")
    for (block in entry.blocks) {
        when (block.k) {
            "rx" -> for (item in block.rx.orEmpty()) {
                item.heading?.let { append("\n").append(it.uppercase()) }
                if (item.name.isNotBlank()) {
                    append("\n").append(item.n ?: "•").append(". ").append(item.name)
                    item.quantity?.let { append(" — ").append(it) }
                    for (line in item.posology) append("\n   ").append(if (line.or) "ou" else line.t)
                }
            }
            "warn" -> append("\n\n⚠️ ").append(plainMd(block.t.orEmpty()))
            "p" -> append("\n\n").append(plainMd(block.t.orEmpty()))
            "ul", "ol" -> block.items.orEmpty().forEachIndexed { i, item ->
                append("\n").append(if (block.k == "ol") "${i + 1}." else "•").append(" ").append(plainMd(item.t))
            }
            "table" -> {
                append("\n")
                for (row in block.rows.orEmpty()) append("\n").append(row.joinToString(" | ") { plainMd(it.t) })
            }
        }
    }
    append("\n\n— Drive de prescrições revisado (Guia clínico Renova); confira antes de prescrever.")
}

private val MD_ITALIC = Regex("(?<![*\\w])\\*([^*\\s][^*]*)\\*(?![*\\w])")
private val MD_BOLD = Regex("\\*\\*([^*]+)\\*\\*")

/** Markdown mínimo do Drive (**negrito**, *itálico*) → o negrito e o itálico do WhatsApp (itálico antes, para o negrito novo não virar itálico). */
fun plainMd(text: String): String = text.replace(MD_ITALIC, "_$1_").replace(MD_BOLD, "*$1*")
