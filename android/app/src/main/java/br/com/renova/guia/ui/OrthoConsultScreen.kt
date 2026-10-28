@file:OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)

package br.com.renova.guia.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.renova.guia.data.OrthoContent
import br.com.renova.guia.data.OrthoRegion
import br.com.renova.guia.data.OrthoTopic
import br.com.renova.guia.data.Routes
import br.com.renova.guia.ortho.ConsultAnswers
import br.com.renova.guia.ortho.ConsultStep
import br.com.renova.guia.ortho.ConsultViewModel
import br.com.renova.guia.ortho.ExamResult
import br.com.renova.guia.ortho.OrthoConsult
import br.com.renova.guia.ui.components.CidChip
import br.com.renova.guia.ui.components.MutedText
import br.com.renova.guia.ui.components.copyText
import br.com.renova.guia.ui.components.shareText
import br.com.renova.guia.ui.theme.GuideTheme

/**
 * A consulta guiada de ortopedia: cinco passos na ordem em que o médico
 * atende, para quem nunca atendeu ortopedia. `startAt` (vindo de "Atender
 * com este roteiro") pula ao roteiro do tópico.
 */
@Composable
fun OrthoConsultScreen(ortho: OrthoContent, vm: ConsultViewModel, startAt: String?, onBack: () -> Unit, onOpen: (String) -> Unit) {
    val answers by vm.answers.collectAsState()
    val step by vm.step.collectAsState()
    LaunchedEffect(startAt) {
        if (!startAt.isNullOrBlank() && ortho.topic(startAt) != null) vm.startAt(startAt, ortho.regionOf(startAt)?.key)
    }
    val region = answers.region?.let(ortho::region)
    val topic = answers.topic?.let(ortho::topic)
    val alarms = OrthoConsult.alarmTexts(ortho, region, answers, topic)

    ScreenScaffold(
        title = "Atender agora",
        onBack = onBack,
        actions = { TextButton(onClick = { vm.reset() }) { Text("Nova consulta") } },
    ) { padding ->
        Column(Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 96.dp)) {
            StepBar(step, vm::reached) { vm.goTo(it) }
            if (alarms.isNotEmpty() && step != ConsultStep.NOTA) AlarmBanner(alarms) { onOpen(Routes.ortoTopic("quando-encaminhar-no-mesmo-dia")) }
            when (step) {
                ConsultStep.REGIAO -> RegionStep(ortho, answers.region) { vm.pickRegion(it) }
                ConsultStep.ALARME -> region?.let { AlarmStep(ortho, it, answers, vm) }
                ConsultStep.CONDICAO -> region?.let { ConditionStep(ortho, it, answers, vm, onOpen) }
                ConsultStep.ROTEIRO -> topic?.let { ScriptStep(it, answers, vm, onOpen) }
                ConsultStep.NOTA -> if (region != null && topic != null) NoteStep(OrthoConsult.buildSoapNote(ortho, region, topic, answers), topic, onOpen, onReset = vm::reset)
            }
        }
    }
}

@Composable
private fun StepBar(current: ConsultStep, reached: (ConsultStep) -> Boolean, onGo: (ConsultStep) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(vertical = 8.dp).testTag("consult-steps")) {
        items(ConsultStep.entries) { s ->
            FilterChip(
                selected = s == current,
                enabled = reached(s),
                onClick = { onGo(s) },
                label = { Text("${s.ordinal + 1} ${s.label}") },
            )
        }
    }
}

@Composable
private fun AlarmBanner(alarms: List<String>, onOpenReferral: () -> Unit) {
    val g = GuideTheme.colors
    Column(Modifier.padding(bottom = 10.dp).fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(g.warnBg).padding(12.dp)) {
        Text("⚠ SINAL DE ALARME MARCADO — ENCAMINHAR NO MESMO DIA", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.ExtraBold, color = g.warnFg)
        for (a in alarms) Text("• $a", style = MaterialTheme.typography.bodySmall, color = g.warnFg, modifier = Modifier.padding(top = 2.dp))
        Text(
            "O que fazer antes de o paciente sair →",
            modifier = Modifier.padding(top = 6.dp).clickable(onClick = onOpenReferral),
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = g.warnFg,
        )
    }
}

@Composable
private fun StepTitle(title: String, hint: String? = null) {
    Text(title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.ExtraBold, modifier = Modifier.padding(top = 4.dp))
    if (hint != null) MutedText(hint, Modifier.padding(bottom = 8.dp))
}

// ── 1. Onde dói ────────────────────────────────────────────────────────

@Composable
private fun RegionStep(ortho: OrthoContent, selected: String?, onPick: (String) -> Unit) {
    StepTitle("Onde dói?", "pergunte e peça para apontar com um dedo")
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        for (r in ortho.tab.regions) {
            Card(
                onClick = { onPick(r.key) },
                colors = CardDefaults.cardColors(containerColor = if (r.key == selected) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLowest),
                border = CardDefaults.outlinedCardBorder(),
                modifier = Modifier.width(160.dp).testTag("region-${r.key}"),
            ) {
                Column(Modifier.padding(12.dp)) {
                    Text(r.label, fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.bodyMedium)
                    MutedText("${r.topics.size} ${if (r.topics.size == 1) "condição" else "condições"}")
                }
            }
        }
    }
    MutedText("Dor na nádega que desce pela perna é coluna lombar; dor na virilha é quadril; dor na lateral do quadril é quadril também (bursa).", Modifier.padding(top = 10.dp))
}

// ── 2. Alarme ──────────────────────────────────────────────────────────

@Composable
private fun AlarmStep(ortho: OrthoContent, region: OrthoRegion, a: ConsultAnswers, vm: ConsultViewModel) {
    StepTitle("Antes de tudo: ${region.label.lowercase()}", "30 segundos que separam o que você resolve hoje do que vai para a cirurgia")
    Text("Houve trauma (queda, torção, pancada)?", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp))
    Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        FilterChip(selected = a.trauma == true, onClick = { vm.setTrauma(true) }, label = { Text("Sim, houve trauma") }, modifier = Modifier.testTag("trauma-sim"))
        FilterChip(selected = a.trauma == false, onClick = { vm.setTrauma(false) }, label = { Text("Não, começou sozinho") }, modifier = Modifier.testTag("trauma-nao"))
    }
    Text("Marque o que estiver presente", fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 14.dp, bottom = 4.dp))
    region.alarm.forEachIndexed { i, text -> AlarmCheck(text, "r:$i" in a.alarm) { vm.toggleAlarm("r:$i") } }
    ortho.tab.universalAlarm.forEachIndexed { i, text -> AlarmCheck(text, "u:$i" in a.alarm, muted = true) { vm.toggleAlarm("u:$i") } }
    if (a.trauma == null) {
        MutedText("Responda se houve trauma para seguir.", Modifier.padding(top = 10.dp))
    } else {
        Button(onClick = { vm.goTo(ConsultStep.CONDICAO) }, modifier = Modifier.padding(top = 14.dp).testTag("alarm-next")) {
            Text(if (a.alarm.isEmpty()) "Nenhum alarme — escolher a condição →" else "Seguir mesmo assim →")
        }
    }
}

@Composable
private fun AlarmCheck(text: String, on: Boolean, muted: Boolean = false, onToggle: () -> Unit) {
    val g = GuideTheme.colors
    Row(
        Modifier.padding(top = 6.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .background(if (on) g.warnBg else if (muted) MaterialTheme.colorScheme.surfaceContainerLow else MaterialTheme.colorScheme.surfaceContainerLowest)
            .clickable(onClick = onToggle).padding(end = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked = on, onCheckedChange = { onToggle() })
        Text(text, style = MaterialTheme.typography.bodySmall, color = if (on) g.warnFg else MaterialTheme.colorScheme.onSurface)
    }
}

// ── 3. Condição ────────────────────────────────────────────────────────

@Composable
private fun ConditionStep(ortho: OrthoContent, region: OrthoRegion, a: ConsultAnswers, vm: ConsultViewModel, onOpen: (String) -> Unit) {
    StepTitle("Qual condição combina?", "leia o resumo e como o paciente fala; escolha a que mais parece")
    for (t in ortho.orderTopics(region, a.trauma)) {
        Card(
            onClick = { vm.pickTopic(t.slug) },
            colors = CardDefaults.cardColors(containerColor = if (t.slug == a.topic) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLowest),
            border = CardDefaults.outlinedCardBorder(),
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp).testTag("cond-${t.slug}"),
        ) {
            Column(Modifier.padding(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(t.title, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                    if (t.isCondition) CidChip(t.cid)
                }
                Text(t.summary, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                MutedText("Como fala: " + t.aliases.take(4).joinToString(" · "), Modifier.padding(top = 4.dp))
            }
        }
    }
    Text(
        "Nenhuma combina? Abra o índice e busque por como o paciente descreve.",
        modifier = Modifier.padding(top = 10.dp).clickable { onOpen(Routes.ORTOPEDIA) },
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.secondary,
        fontWeight = FontWeight.Bold,
    )
}

// ── 4. Roteiro ─────────────────────────────────────────────────────────

@Composable
private fun ScriptStep(topic: OrthoTopic, a: ConsultAnswers, vm: ConsultViewModel, onOpen: (String) -> Unit) {
    StepTitle(topic.title, if (topic.isCondition) "CID ${topic.cid}" else null)
    Text(
        topic.summary,
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.secondaryContainer).padding(10.dp),
        fontWeight = FontWeight.SemiBold,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSecondaryContainer,
    )
    Text(
        "Página completa do tópico →",
        modifier = Modifier.padding(top = 6.dp).clickable { onOpen(Routes.ortoTopic(topic.slug)) },
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.secondary,
        fontWeight = FontWeight.Bold,
    )

    var n = 1
    Block(n++, "Pergunte", "marque o que o paciente confirmar") {
        topic.ask.forEachIndexed { i, q -> CheckRow(q, i in a.ask) { vm.toggleAsk(i) } }
        OutlinedTextField(
            value = a.askNote,
            onValueChange = vm::setAskNote,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp).testTag("ask-note"),
            placeholder = { Text("Observações da anamnese (vão para a nota)") },
            minLines = 2,
            shape = RoundedCornerShape(12.dp),
        )
    }
    if (topic.exam.isNotEmpty()) {
        val done = a.exam.values.count { it != ExamResult.ND }
        Block(n++, "Examine", "$done de ${topic.exam.size} manobras registradas") {
            topic.exam.forEachIndexed { i, e ->
                ExamCard(e) {
                    Row(Modifier.padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        for ((r, label) in listOf(ExamResult.POS to "Positivo", ExamResult.NEG to "Negativo", ExamResult.ND to "Não fiz")) {
                            FilterChip(selected = a.exam[i] == r, onClick = { vm.setExam(i, r) }, label = { Text(label) }, modifier = Modifier.testTag("exam-$i-${r.name.lowercase()}"))
                        }
                    }
                }
            }
        }
    }
    Block(n++, "Alarme desta condição", "marque se presente") {
        topic.alarm.forEachIndexed { i, t -> AlarmCheck(t, i in a.topicAlarm) { vm.toggleTopicAlarm(i) } }
    }
    if (topic.imaging.isNotEmpty()) Block(n++, "Imagem", "o que pedir e como escrever") { Bullets(topic.imaging) }
    Block(n++, "Conduta", "na urgência, o que fazer e explicar ao paciente") {
        topic.urgent.firstOrNull()?.let { Text("Na urgência: $it", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 6.dp)) }
        Bullets(topic.plan)
        topic.immobilize?.takeIf { it.isNotEmpty() }?.let { Text("Imobilizar: " + it.joinToString(" "), style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 6.dp)) }
    }
    if (topic.rx.isNotEmpty()) {
        Block(n++, "Receita", "marque o que vai prescrever — adulto sem comorbidade") {
            topic.rx.forEachIndexed { i, r ->
                Row(
                    Modifier.padding(top = 4.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp))
                        .background(if (i in a.rx) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLowest)
                        .clickable { vm.toggleRx(i) }.padding(end = 10.dp),
                    verticalAlignment = Alignment.Top,
                ) {
                    Checkbox(checked = i in a.rx, onCheckedChange = { vm.toggleRx(i) }, modifier = Modifier.testTag("rx-$i"))
                    Column(Modifier.padding(top = 12.dp, bottom = 8.dp)) {
                        Text(r.name, fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.bodyMedium)
                        Text(r.posology, style = MaterialTheme.typography.bodySmall)
                        r.note?.let { MutedText(it, Modifier.padding(top = 2.dp)) }
                    }
                }
            }
        }
    }
    Block(n, "Cirurgia e regulação, atestado e retorno") {
        Bullets(topic.refer)
        OutlinedTextField(
            value = a.leave,
            onValueChange = vm::setLeave,
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp).testTag("leave"),
            label = { Text("Atestado (sugestão: ${topic.leave})") },
            placeholder = { Text(topic.leave) },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
        )
        MutedText("Retorno: ${topic.followup}", Modifier.padding(top = 6.dp))
    }
    Button(onClick = { vm.goTo(ConsultStep.NOTA) }, modifier = Modifier.padding(top = 16.dp).testTag("to-note")) { Text("Gerar a nota para o prontuário →") }
}

@Composable
private fun Block(n: Int, title: String, hint: String? = null, content: @Composable () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(24.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                    Text("$n", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.onPrimary)
                }
                Text(title.uppercase(), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.ExtraBold, color = MaterialTheme.colorScheme.secondary)
            }
            if (hint != null) MutedText(hint, Modifier.padding(top = 2.dp))
            Spacer(Modifier.size(4.dp))
            content()
        }
    }
}

@Composable
private fun CheckRow(text: String, on: Boolean, onToggle: () -> Unit) {
    Row(
        Modifier.padding(top = 4.dp).fillMaxWidth().clip(RoundedCornerShape(12.dp))
            .background(if (on) MaterialTheme.colorScheme.secondaryContainer else MaterialTheme.colorScheme.surfaceContainerLowest)
            .clickable(onClick = onToggle).padding(end = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Checkbox(checked = on, onCheckedChange = { onToggle() })
        Text(text, style = MaterialTheme.typography.bodySmall)
    }
}

// ── 5. Nota ────────────────────────────────────────────────────────────

@Composable
private fun NoteStep(note: String, topic: OrthoTopic, onOpen: (String) -> Unit, onReset: () -> Unit) {
    val context = LocalContext.current
    StepTitle("Nota SOAP", "copie e cole no atendimento do paciente, no Renova")
    Text(
        note,
        modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(MaterialTheme.colorScheme.surfaceContainerLowest).padding(12.dp).testTag("soap-note"),
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
        lineHeight = 17.sp,
    )
    Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = { copyText(context, topic.title, note) }, modifier = Modifier.testTag("copy-note")) {
            Icon(Icons.Filled.ContentCopy, contentDescription = null)
            Spacer(Modifier.size(6.dp))
            Text("Copiar a nota")
        }
        OutlinedButton(onClick = { shareText(context, note) }) {
            Icon(Icons.Filled.Share, contentDescription = null)
            Spacer(Modifier.size(6.dp))
            Text("Enviar")
        }
    }
    Row(Modifier.padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        TextButton(onClick = { onOpen(Routes.ortoTopic(topic.slug)) }) { Text("Reler o tópico") }
        TextButton(onClick = onReset) { Text("Nova consulta") }
    }
    MutedText("Receita, atestado e encaminhamento saem pela ficha do paciente no site do Renova, com o texto daqui como guia.", Modifier.padding(top = 8.dp))
}
