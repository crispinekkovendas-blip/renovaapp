package br.com.renova.guia.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import br.com.renova.guia.BuildConfig
import br.com.renova.guia.data.GuideContent
import br.com.renova.guia.data.GuideState
import br.com.renova.guia.data.RevisionChanges
import br.com.renova.guia.ui.components.ConciseLines
import br.com.renova.guia.ui.components.MutedText
import br.com.renova.guia.ui.components.RevisionBadge
import br.com.renova.guia.ui.components.SectionHeader
import br.com.renova.guia.ui.components.sourceFilterLabel

private const val MAX_LINES = 4

/** O que cada revisão mudou, por aba e por item — a atual aberta, as anteriores a um toque. */
@Composable
fun ChangesScreen(content: GuideContent, onBack: () -> Unit, onOpenItem: (String) -> Unit) {
    val current = content.bundle.revision.current
    var open by remember { mutableStateOf(setOf(current)) }
    ScreenScaffold(title = "O que mudou no guia", onBack = onBack) { padding ->
        LazyColumn(
            Modifier.padding(padding).fillMaxSize().testTag("changes"),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                MutedText("A versão em uso é sempre a mais nova. Em cada item, o que saiu vem riscado e o que entrou, em verde; no próprio texto, o que mudou fica em amarelo, com o histórico a um toque.")
            }
            for (rev in content.bundle.changes) {
                val isOpen = rev.rev in open
                item(key = "rev-${rev.rev}") {
                    Row(
                        Modifier.fillMaxWidth().padding(top = 12.dp).clickable { open = if (isOpen) open - rev.rev else open + rev.rev },
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        RevisionBadge(rev.rev, current, content.revisionLabel(rev.rev))
                        MutedText(rev.tabs.joinToString(" · ") { "${sourceFilterLabel(it.tab)}: ${it.count}" }, Modifier.weight(1f))
                        Text(if (isOpen) "▾" else "›", fontWeight = FontWeight.Bold)
                    }
                }
                if (isOpen) {
                    for (tab in rev.tabs) {
                        item(key = "rev-${rev.rev}-${tab.tab}") { SectionHeader(sourceFilterLabel(tab.tab)) }
                        itemsIndexed(tab.groups, key = { i, _ -> "rev-${rev.rev}-${tab.tab}-$i" }) { _, group ->
                            val target = group.target?.let { content.describe(it) }
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
                                border = CardDefaults.outlinedCardBorder(),
                            ) {
                                Column(Modifier.padding(12.dp)) {
                                    Text(
                                        group.title,
                                        fontWeight = FontWeight.Bold,
                                        color = if (target != null) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurface,
                                        modifier = if (target != null) Modifier.clickable { onOpenItem(target.route) } else Modifier,
                                    )
                                    Spacer(Modifier.size(4.dp))
                                    ConciseLines(group.lines, max = MAX_LINES)
                                    val extra = group.lines.size - MAX_LINES
                                    if (extra > 0 && target != null) {
                                        Text(
                                            "+ $extra ${if (extra == 1) "mudança" else "mudanças"} — abrir",
                                            modifier = Modifier.padding(top = 6.dp).clickable { onOpenItem(target.route) },
                                            color = MaterialTheme.colorScheme.secondary,
                                            fontWeight = FontWeight.Bold,
                                            style = MaterialTheme.typography.labelLarge,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Aviso quando a sincronização trouxe uma revisão nova do guia. */
@Composable
fun NewRevisionDialog(content: GuideContent, rev: Int, onSee: () -> Unit, onDismiss: () -> Unit) {
    val changes: RevisionChanges? = content.bundle.changes.firstOrNull { it.rev == rev }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Guia atualizado: ${content.revisionLabel(rev)}") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("O guia que está neste aparelho foi revisado.")
                changes?.tabs?.forEach { Text("• ${sourceFilterLabel(it.tab)}: ${it.count}", style = MaterialTheme.typography.bodySmall) }
                MutedText("O que mudou fica em amarelo no próprio texto, com o histórico a um toque.")
            }
        },
        confirmButton = { Button(onClick = onSee, modifier = Modifier.testTag("see-changes")) { Text("Ver o que mudou") } },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Depois") } },
    )
}

/** A conta, a versão do guia e os créditos. */
@Composable
fun AboutScreen(ready: GuideState.Ready, onBack: () -> Unit, onSync: () -> Unit, onLogout: () -> Unit) {
    val content = ready.content
    var confirm by remember { mutableStateOf(false) }
    ScreenScaffold(title = "Sobre e conta", onBack = onBack) { padding ->
        Column(
            Modifier.padding(padding).fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest), border = CardDefaults.outlinedCardBorder()) {
                Column(Modifier.padding(16.dp).fillMaxWidth()) {
                    Text(ready.account.ifBlank { "Conta do Renova" }, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    MutedText("Guia na ${content.revisionLabel(content.bundle.revision.current)} · pacote ${content.bundle.version.take(8)}")
                    MutedText(
                        when {
                            ready.syncing -> "Sincronizando…"
                            ready.offline -> "Sem conexão na última tentativa: usando o guia guardado."
                            else -> "Em dia com o servidor."
                        },
                    )
                    MutedText("App ${BuildConfig.VERSION_NAME}")
                    Row(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = onSync) { Text("Sincronizar agora") }
                        OutlinedButton(onClick = { confirm = true }) { Text("Sair da conta") }
                    }
                }
            }
            val plantao = content.bundle.plantao.credit
            SectionHeader("Créditos")
            Text(
                "${plantao.title}, ${plantao.edition} (${plantao.publisher}). Reproduzido com autorização dos autores: ${plantao.authors.joinToString(", ")}. " +
                    "Revisão Renova desde ${plantao.reviewedAt}.",
                style = MaterialTheme.typography.bodySmall,
            )
            val drive = content.bundle.drive.credit
            Text(
                "Lista de condições do ${drive.basedOn}; os cards originais são reproduzidos com autorização da autora. As receitas, doses e orientações foram reescritas pela revisão Renova em ${drive.reviewedAt}, com apoio de IA, a partir de diretrizes públicas.",
                style = MaterialTheme.typography.bodySmall,
            )
            Text(
                "O guia apoia a decisão do médico e não a substitui: confira alergias, gestação, função renal e hepática, peso e idade, e o protocolo da instituição. A Super Inteligência responde só com o guia, pelo servidor do Renova; não digite dados de paciente.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
    if (confirm) {
        AlertDialog(
            onDismissRequest = { confirm = false },
            title = { Text("Sair da conta?") },
            text = { Text("O guia guardado neste aparelho é apagado. Para usar de novo, é preciso entrar e baixar outra vez (com internet).") },
            confirmButton = { Button(onClick = { confirm = false; onLogout() }) { Text("Sair") } },
            dismissButton = { TextButton(onClick = { confirm = false }) { Text("Cancelar") } },
        )
    }
}
