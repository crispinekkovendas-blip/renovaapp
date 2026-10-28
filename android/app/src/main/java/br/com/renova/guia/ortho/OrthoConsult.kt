package br.com.renova.guia.ortho

import br.com.renova.guia.data.OrthoContent
import br.com.renova.guia.data.OrthoRegion
import br.com.renova.guia.data.OrthoTopic

/*
 * A consulta guiada de ortopedia, igual à do site (src/lib/ortho-guide/consult.ts):
 * onde dói → alarme → condição → roteiro → nota SOAP. Só lógica, sem tela:
 * o ViewModel guarda o estado e a tela desenha.
 */

enum class ExamResult { POS, NEG, ND }

enum class ConsultStep(val label: String) {
    REGIAO("Onde dói"),
    ALARME("Alarme"),
    CONDICAO("Condição"),
    ROTEIRO("Roteiro"),
    NOTA("Nota"),
}

/** O que o médico marcou ao longo da consulta. */
data class ConsultAnswers(
    val region: String? = null,
    val trauma: Boolean? = null,
    /** "u:0" alarme universal, "r:1" da região. */
    val alarm: Set<String> = emptySet(),
    val topic: String? = null,
    val ask: Set<Int> = emptySet(),
    val askNote: String = "",
    val exam: Map<Int, ExamResult> = emptyMap(),
    val topicAlarm: Set<Int> = emptySet(),
    val rx: Set<Int> = emptySet(),
    val leave: String = "",
)

object OrthoConsult {
    /** Em que passo a consulta está, pelo que já foi respondido. */
    fun stepOf(a: ConsultAnswers): ConsultStep = when {
        a.region == null -> ConsultStep.REGIAO
        a.trauma == null -> ConsultStep.ALARME
        a.topic == null -> ConsultStep.CONDICAO
        else -> ConsultStep.ROTEIRO
    }

    /** Os alarmes marcados, em texto, para o aviso e para a nota. */
    fun alarmTexts(ortho: OrthoContent, region: OrthoRegion?, a: ConsultAnswers, topic: OrthoTopic?): List<String> {
        val out = mutableListOf<String>()
        for (key in a.alarm.sorted()) {
            val kind = key.substringBefore(":")
            val i = key.substringAfter(":").toIntOrNull() ?: continue
            val text = if (kind == "u") ortho.tab.universalAlarm.getOrNull(i) else region?.alarm?.getOrNull(i)
            if (text != null) out.add(text)
        }
        if (topic != null) for (i in a.topicAlarm.sorted()) topic.alarm.getOrNull(i)?.let(out::add)
        return out
    }

    private fun resultLabel(r: ExamResult) = when (r) {
        ExamResult.POS -> "POSITIVO"
        ExamResult.NEG -> "negativo"
        ExamResult.ND -> "não realizado"
    }

    /** A nota SOAP, pronta para colar no atendimento (mesmo texto que o site gera). */
    fun buildSoapNote(ortho: OrthoContent, region: OrthoRegion, topic: OrthoTopic, a: ConsultAnswers): String {
        val lines = mutableListOf<String>()
        val cid = if (topic.cid != "—") " (CID ${topic.cid})" else ""
        lines += "ORTOPEDIA — ${topic.title}$cid"
        lines += "Região: ${region.label}" + when (a.trauma) {
            null -> ""
            true -> " · com trauma"
            false -> " · sem trauma"
        }
        lines += ""

        lines += "S — Anamnese"
        val asked = a.ask.sorted().mapNotNull { topic.ask.getOrNull(it) }
        if (asked.isNotEmpty()) for (q in asked) lines += "- $q: SIM" else lines += "- (nenhuma pergunta marcada como positiva)"
        if (a.askNote.isNotBlank()) lines += "- Observações: ${a.askNote.trim()}"
        lines += ""

        lines += "O — Exame físico"
        val done = topic.exam.mapIndexedNotNull { i, e -> a.exam[i]?.takeIf { it != ExamResult.ND }?.let { e to it } }
        if (done.isNotEmpty()) {
            for ((e, r) in done) lines += "- ${e.name}: ${resultLabel(r)}" + if (r == ExamResult.POS) " (${e.positive})" else ""
        } else lines += "- (nenhuma manobra registrada)"
        val alarms = alarmTexts(ortho, region, a, topic)
        lines += if (alarms.isNotEmpty()) "- SINAIS DE ALARME: ${alarms.joinToString("; ")}" else "- Sem sinais de alarme."
        lines += ""

        lines += "A — Hipótese"
        lines += "- ${topic.title}" + if (topic.cid != "—") " — CID ${topic.cid}" else ""
        lines += ""

        lines += "P — Conduta"
        if (alarms.isNotEmpty()) lines += "- ALARME PRESENTE: conduta de urgência hoje (ver “Na urgência”); cirurgia ou regulação se indicado."
        topic.imaging.firstOrNull()?.let { lines += "- Imagem: $it" }
        topic.urgent.firstOrNull()?.let { lines += "- Na urgência: $it" }
        for (p in topic.plan.take(3)) lines += "- $p"
        val rx = a.rx.sorted().mapNotNull { topic.rx.getOrNull(it) }
        if (rx.isNotEmpty()) {
            lines += "- Receita:"
            for (r in rx) lines += "  · ${r.name} — ${r.posology}"
        }
        topic.immobilize?.firstOrNull()?.let { lines += "- Imobilização: $it" }
        lines += "- Cirurgia/regulação: ${topic.refer.firstOrNull().orEmpty()}"
        lines += "- Atestado: ${a.leave.trim().ifBlank { topic.leave }} · Retorno: ${topic.followup}"
        lines += ""
        lines += "Roteiro: Guia de ortopedia Renova, revisão ${ortho.tab.revision.current}."
        return lines.joinToString("\n")
    }
}
