package br.com.renova.guia.data

import kotlinx.serialization.Serializable

/*
 * O Guia de ortopedia dentro do pacote (app-bundle.ts › AppOrtho): os tópicos
 * na ordem da consulta, as regiões e alarmes da consulta guiada, os atalhos
 * do primeiro dia, as revisões (antes, agora, motivo) e um índice de busca só
 * dele. Texto próprio da Renova — não é reprodução de livro.
 */

@Serializable
data class OrthoTab(
    val credit: OrthoCredit,
    val revision: RevisionInfo,
    val firstDay: List<OrthoShortcut> = emptyList(),
    val regions: List<OrthoRegion> = emptyList(),
    val universalAlarm: List<String> = emptyList(),
    val traumaTopics: List<String> = emptyList(),
    val chapters: List<OrthoChapter> = emptyList(),
    val changes: List<OrthoChange> = emptyList(),
    val search: OrthoSearch = OrthoSearch(),
)

@Serializable
data class OrthoCredit(
    val title: String,
    val revision: Int,
    val writtenAt: String,
    val revisedAt: String = "",
    val reviewedBy: String? = null,
)

/** Um atalho do primeiro dia ("O que não espera"). */
@Serializable
data class OrthoShortcut(val slug: String, val label: String, val hint: String)

/** Uma região do corpo na consulta guiada, com os tópicos dela e o alarme a conferir antes. */
@Serializable
data class OrthoRegion(
    val key: String,
    val label: String,
    val short: String,
    val topics: List<String>,
    val alarm: List<String> = emptyList(),
)

@Serializable
data class OrthoChapter(val title: String, val intro: String = "", val topics: List<OrthoTopic>)

@Serializable
data class OrthoTopic(
    val id: String,
    val slug: String,
    val title: String,
    val chapter: String = "",
    val aliases: List<String> = emptyList(),
    val cid: String = "—",
    val summary: String = "",
    val ask: List<String> = emptyList(),
    val exam: List<OrthoExam> = emptyList(),
    val alarm: List<String> = emptyList(),
    val imaging: List<String> = emptyList(),
    val plan: List<String> = emptyList(),
    val rx: List<OrthoRx> = emptyList(),
    val immobilize: List<String>? = null,
    val refer: List<String> = emptyList(),
    val leave: String = "",
    val followup: String = "",
    val pearls: List<String>? = null,
    val sources: List<String> = emptyList(),
    /** Quantas mudanças da revisão atual tocam o tópico (diretas ou por receita de base). */
    val revised: Int = 0,
) {
    /** As cinco páginas de base não têm CID; as condições têm. */
    val isCondition: Boolean get() = cid != "—"
}

@Serializable
data class OrthoExam(val name: String, val how: String, val positive: String)

@Serializable
data class OrthoRx(val name: String, val posology: String, val note: String? = null)

/** Uma mudança do guia: o trecho de antes, o de agora e o motivo. */
@Serializable
data class OrthoChange(
    val rev: Int,
    val slug: String,
    val title: String,
    val section: String,
    val before: String,
    val after: String,
    val why: String,
    val alsoIn: List<String> = emptyList(),
    val concise: List<ConciseLine> = emptyList(),
)

@Serializable
data class OrthoSearch(val docs: List<SearchDocDto> = emptyList(), val items: List<SearchItem> = emptyList())
