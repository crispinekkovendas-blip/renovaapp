@file:OptIn(ExperimentalMaterial3Api::class)

package br.com.renova.guia.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.renova.guia.data.RevisionHistory
import br.com.renova.guia.data.RevisionSlide
import br.com.renova.guia.ui.theme.GuideTheme
import kotlinx.coroutines.launch

/** O selo da revisão: a atual em âmbar, a publicação em verde, as do meio em azul. */
@Composable
fun RevisionBadge(rev: Int, current: Int, label: String) {
    val g = GuideTheme.colors
    val (bg, fg) = when (rev) {
        current -> g.revCurrentBg to g.revCurrentFg
        1 -> g.revFirstBg to g.revFirstFg
        else -> g.revMiddleBg to g.revMiddleFg
    }
    Pill(label, bg, fg)
}

/** O que a tela precisa saber das revisões para desenhar o histórico. */
class RevisionLabels(val current: Int, val label: (Int) -> String)

/**
 * O histórico de um trecho, na cor complementar do marca-texto: primeiro o
 * original (PDF, e-book ou receita publicada) e depois cada mudança — só o
 * que mudou, com o porquê a um toque. Arrasta para o lado.
 */
@Composable
fun HistorySheet(history: RevisionHistory, title: String, labels: RevisionLabels, startAtAlert: Boolean = false, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
        HistoryPager(history, title, labels, startAtAlert)
    }
}

@Composable
fun HistoryPager(history: RevisionHistory, title: String, labels: RevisionLabels, startAtAlert: Boolean = false) {
    val g = GuideTheme.colors
    val slides = history.slides
    if (slides.isEmpty()) return
    val originals = slides.count { it.kind == "original" }
    val start = if (startAtAlert) history.alert ?: 0 else 0
    val pager = rememberPagerState(initialPage = start.coerceIn(0, slides.size - 1)) { slides.size }
    val scope = rememberCoroutineScope()
    fun label(i: Int) = if (slides[i].kind == "original") {
        if (originals > 1) "Original ${i + 1} de $originals" else "Original"
    } else {
        "${i - originals + 1}ª mudança"
    }

    Column(
        Modifier
            .padding(horizontal = 16.dp)
            .padding(bottom = 28.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(g.historyBackground)
            .border(BorderStroke(1.dp, g.historyBorder), RoundedCornerShape(20.dp))
            .padding(12.dp)
            .testTag("history"),
    ) {
        Text("HISTÓRICO DESTE TRECHO", color = g.historyAccent, fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 0.8.sp)
        Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, maxLines = 3)
        Spacer(Modifier.size(6.dp))
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(label(pager.currentPage), color = g.historyAccent, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.ExtraBold)
            val slide = slides[pager.currentPage]
            if (slide.kind == "change" && slide.rev != null) RevisionBadge(slide.rev, labels.current, labels.label(slide.rev))
            val alert = history.alert
            if (alert != null && alert != pager.currentPage) {
                Pill(
                    "⚠ conferir",
                    g.tipBg,
                    g.tipFg,
                    Modifier.clickable { scope.launch { pager.animateScrollToPage(alert) } },
                )
            }
            Spacer(Modifier.weight(1f))
            Text("${pager.currentPage + 1}/${slides.size}", style = MaterialTheme.typography.labelMedium)
            IconButton(onClick = { scope.launch { pager.animateScrollToPage(pager.currentPage - 1) } }, enabled = pager.currentPage > 0) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Anterior", tint = g.historyAccent)
            }
            IconButton(onClick = { scope.launch { pager.animateScrollToPage(pager.currentPage + 1) } }, enabled = pager.currentPage < slides.size - 1) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Próximo", tint = g.historyAccent)
            }
        }
        HorizontalPager(state = pager, verticalAlignment = Alignment.Top, pageSpacing = 12.dp) { i ->
            SlideCard(slides[i])
        }
        if (slides.size > 1) {
            Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.Center) {
                repeat(slides.size) { i ->
                    Box(
                        Modifier
                            .padding(3.dp)
                            .size(if (i == pager.currentPage) 8.dp else 6.dp)
                            .clip(CircleShape)
                            .background(if (i == pager.currentPage) g.historyAccent else g.historyBorder)
                            .clickable { scope.launch { pager.animateScrollToPage(i) } },
                    )
                }
            }
        }
    }
}

@Composable
private fun SlideCard(slide: RevisionSlide) {
    val g = GuideTheme.colors
    Column(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(MaterialTheme.colorScheme.surfaceContainerLowest)
            .padding(12.dp),
    ) {
        if (slide.kind == "original") {
            slide.source?.let {
                Text(it.uppercase(), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            slide.title?.let { Text(it, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.ExtraBold) }
            Column(Modifier.heightIn(max = 320.dp).verticalScroll(rememberScrollState()).padding(top = 4.dp)) {
                for (line in slide.lines) Text(line, style = MaterialTheme.typography.bodySmall)
            }
            slide.note?.let {
                Spacer(Modifier.size(6.dp))
                Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        } else {
            ConciseLines(slide.concise)
            val why = slide.why
            if (why != null) {
                var open by remember { mutableStateOf(false) }
                Text(
                    (if (slide.tone == "note") "Aviso completo" else "Por quê") + if (open) " ▾" else " ›",
                    modifier = Modifier.padding(top = 8.dp).clickable { open = !open },
                    color = g.historyAccent,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                )
                if (open) Text(why, modifier = Modifier.padding(top = 4.dp), style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
