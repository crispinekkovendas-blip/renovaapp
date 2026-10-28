package br.com.renova.guia.share

import br.com.renova.guia.data.OrthoTopic

/** Um tópico de ortopedia como texto para o WhatsApp ou a área de transferência: resumo, alarme, conduta, receita, encaminhar e atestado. */
fun orthoShareText(topic: OrthoTopic): String = buildString {
    append("*").append(topic.title).append("*")
    if (topic.isCondition) append(" — CID ").append(topic.cid)
    append("\n").append(topic.summary).append("\n")
    if (topic.alarm.isNotEmpty()) {
        append("\n*Alarme*\n")
        for (a in topic.alarm) append("⚠ ").append(a).append("\n")
    }
    if (topic.plan.isNotEmpty()) {
        append("\n*Conduta*\n")
        for (p in topic.plan) append("• ").append(p).append("\n")
    }
    if (topic.rx.isNotEmpty()) {
        append("\n*Receita (adulto sem comorbidade)*\n")
        topic.rx.forEachIndexed { i, r -> append(i + 1).append(". ").append(r.name).append(" — ").append(r.posology).append("\n") }
    }
    topic.immobilize?.takeIf { it.isNotEmpty() }?.let { append("\n*Imobilizar*\n").append(it.joinToString("\n")).append("\n") }
    if (topic.refer.isNotEmpty()) {
        append("\n*Encaminhar*\n")
        for (r in topic.refer) append("• ").append(r).append("\n")
    }
    append("\nAtestado: ").append(topic.leave).append("\nRetorno: ").append(topic.followup).append("\n")
    append("\n_Guia de ortopedia Renova — roteiro de primeira consulta; confira com o protocolo do serviço._")
}
