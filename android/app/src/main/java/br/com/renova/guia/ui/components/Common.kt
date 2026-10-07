package br.com.renova.guia.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import br.com.renova.guia.data.ConciseLine
import br.com.renova.guia.search.SmartSearch
import br.com.renova.guia.ui.theme.GuideTheme

/** O nome de cada fonte, como no site. */
fun sourceTag(source: String): String = when (source) {
    "receitas" -> "Receita pronta"
    "plantao" -> "Plantão"
    "drive" -> "Drive"
    else -> source
}

fun sourceFilterLabel(source: String): String = when (source) {
    "receitas" -> "Receitas prontas"
    "plantao" -> "Plantão"
    "drive" -> "Drive"
    else -> source
}

/** A etiqueta colorida da fonte: verde receita, rosa plantão, azul Drive. */
@Composable
fun SourcePill(source: String, modifier: Modifier = Modifier) {
    val g = GuideTheme.colors
    val (bg, fg) = when (source) {
        "receitas" -> g.receitasBg to g.receitasFg
        "plantao" -> g.plantaoBg to g.plantaoFg
        else -> g.driveBg to g.driveFg
    }
    Pill(sourceTag(source), bg, fg, modifier)
}

@Composable
fun Pill(text: String, background: Color, foreground: Color, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier = modifier
            .clip(RoundedCornerShape(50))
            .background(background)
            .padding(horizontal = 8.dp, vertical = 2.dp),
        color = foreground,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        maxLines = 1,
    )
}

/** O CID num chip pequeno; com marca-texto quando mudou. */
@Composable
fun CidChip(cid: String, marked: Boolean = false) {
    val bg = if (marked) GuideTheme.colors.highlight else MaterialTheme.colorScheme.secondaryContainer
    Pill(cid, bg, MaterialTheme.colorScheme.onSecondaryContainer)
}

/** Texto com as palavras da busca em destaque. */
@Composable
fun searchHighlighted(text: String, marks: List<String>): AnnotatedString {
    val bg = MaterialTheme.colorScheme.primaryContainer
    return buildAnnotatedString {
        for (part in SmartSearch.highlight(text, marks)) {
            if (part.hit) withStyle(SpanStyle(background = bg, fontWeight = FontWeight.SemiBold)) { append(part.text) } else append(part.text)
        }
    }
}

private val MD = Regex("\\*\\*[^*]+\\*\\*|\\*[^*\\s][^*]*\\*")

/** Markdown mínimo do Drive: **negrito** e *itálico*; com marca-texto quando o trecho mudou. */
@Composable
fun md(text: String, marked: Boolean = false): AnnotatedString {
    val highlight = GuideTheme.colors.highlight
    val inner = buildAnnotatedString {
        var last = 0
        for (m in MD.findAll(text)) {
            if (m.range.first > last) append(text.substring(last, m.range.first))
            val v = m.value
            if (v.startsWith("**")) {
                withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(v.substring(2, v.length - 2)) }
            } else {
                withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(v.substring(1, v.length - 1)) }
            }
            last = m.range.last + 1
        }
        if (last < text.length) append(text.substring(last))
    }
    return if (!marked) inner else buildAnnotatedString { withStyle(SpanStyle(background = highlight)) { append(inner) } }
}

/** Texto inteiro com marca-texto (o que a revisão mudou). */
@Composable
fun marked(text: String, on: Boolean): AnnotatedString {
    if (!on) return AnnotatedString(text)
    val highlight = GuideTheme.colors.highlight
    return buildAnnotatedString { withStyle(SpanStyle(background = highlight)) { append(text) } }
}

/** Uma linha do "o que mudou": o que saiu riscado, o que entrou em verde, "→" entre os dois. */
@Composable
fun concise(line: ConciseLine): AnnotatedString {
    val g = GuideTheme.colors
    val muted = MaterialTheme.colorScheme.onSurfaceVariant
    val strong = MaterialTheme.colorScheme.onSurface
    return buildAnnotatedString {
        line.label?.let { withStyle(SpanStyle(fontWeight = FontWeight.Bold, color = strong)) { append("$it: ") } }
        line.parts.forEachIndexed { i, p ->
            val prev = line.parts.getOrNull(i - 1)
            if (p.k == "ins" && prev?.k == "del") {
                withStyle(SpanStyle(color = muted)) { append(" → ") }
            } else if (i > 0 && p.sp) {
                append(" ")
            }
            when (p.k) {
                "del" -> withStyle(SpanStyle(color = g.del, textDecoration = TextDecoration.LineThrough)) { append(p.t) }
                "ins" -> withStyle(SpanStyle(color = g.ins, background = g.insBg, fontWeight = FontWeight.SemiBold)) { append(p.t) }
                else -> withStyle(SpanStyle(color = muted)) { append(p.t) }
            }
        }
    }
}

@Composable
fun ConciseLines(lines: List<ConciseLine>, modifier: Modifier = Modifier, max: Int = Int.MAX_VALUE) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        for (line in lines.take(max)) {
            Row {
                Box(
                    Modifier
                        .padding(top = 7.dp, end = 8.dp)
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.outline),
                )
                Text(concise(line), style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

/** Título de seção em versalete, como no site. */
@Composable
fun SectionHeader(text: String, modifier: Modifier = Modifier) {
    Text(
        text.uppercase(),
        modifier = modifier.padding(top = 18.dp, bottom = 8.dp),
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.ExtraBold,
        letterSpacing = 1.2.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

/** Chips para folhear (capítulo, grupo, seção, fonte): "Todos" e um por opção, com a contagem. */
@Composable
fun FilterChips(
    options: List<Pair<String, Int>>,
    total: Int,
    selected: String?,
    onSelect: (String?) -> Unit,
    label: (String) -> String = { it },
    contentPadding: PaddingValues = PaddingValues(horizontal = 16.dp),
) {
    LazyRow(contentPadding = contentPadding, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        item {
            FilterChip(selected = selected == null, onClick = { onSelect(null) }, label = { Text("Todos $total") })
        }
        items(options, key = { it.first }) { (key, count) ->
            FilterChip(selected = selected == key, onClick = { onSelect(key) }, label = { Text("${label(key)} $count") })
        }
    }
}

/** Uma linha de lista: título, etiquetas embaixo e um texto de apoio. */
@Composable
fun ListRow(
    title: AnnotatedString,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    meta: (@Composable () -> Unit)? = null,
    support: AnnotatedString? = null,
    trailing: (@Composable () -> Unit)? = null,
) {
    Card(
        onClick = onClick,
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLowest),
        border = CardDefaults.outlinedCardBorder(),
    ) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Text(title, modifier = Modifier.weight(1f), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                if (trailing != null) {
                    Spacer(Modifier.width(8.dp))
                    trailing()
                }
            }
            if (meta != null) {
                Spacer(Modifier.size(4.dp))
                meta()
            }
            if (support != null) {
                Spacer(Modifier.size(4.dp))
                Text(
                    support,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
fun MetaRow(content: @Composable () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { content() }
}

@Composable
fun MutedText(text: String, modifier: Modifier = Modifier) {
    Text(text, modifier = modifier, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
}

@Composable
fun CenteredProgress(text: String) {
    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        CircularProgressIndicator()
        Spacer(Modifier.size(16.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** Um bloco clicável de "ver mais" discreto. */
@Composable
fun LinkText(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Text(
        text,
        modifier = modifier
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp, horizontal = 4.dp),
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.secondary,
    )
}
