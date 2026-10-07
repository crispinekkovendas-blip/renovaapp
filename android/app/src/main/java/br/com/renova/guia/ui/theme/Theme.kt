package br.com.renova.guia.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/*
 * As cores do Renova (o tema "à moda Mevo" do site: roxo e rosa, papel
 * claro), com o modo escuro do aparelho para o plantão de madrugada.
 */

private val Light = lightColorScheme(
    primary = Color(0xFF3D0E6B),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE3DAF3),
    onPrimaryContainer = Color(0xFF3D0E6B),
    secondary = Color(0xFF6C3DB5),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFF2EEFB),
    onSecondaryContainer = Color(0xFF3D0E6B),
    tertiary = Color(0xFFC2185B),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFFFD6DC),
    onTertiaryContainer = Color(0xFF5C0A2C),
    background = Color(0xFFFFF8F9),
    onBackground = Color(0xFF2B2633),
    surface = Color(0xFFFFF8F9),
    onSurface = Color(0xFF2B2633),
    surfaceVariant = Color(0xFFF7F3FC),
    onSurfaceVariant = Color(0xFF5E5868),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFFFFCFD),
    surfaceContainer = Color(0xFFF9F5FC),
    surfaceContainerHigh = Color(0xFFF4EFFA),
    surfaceContainerHighest = Color(0xFFEFE9F7),
    outline = Color(0xFFCBBFE6),
    outlineVariant = Color(0xFFE3DAF3),
)

private val Dark = darkColorScheme(
    primary = Color(0xFFD9BEFF),
    onPrimary = Color(0xFF2A0850),
    primaryContainer = Color(0xFF4A1C85),
    onPrimaryContainer = Color(0xFFF2EEFB),
    secondary = Color(0xFFCBBFE6),
    onSecondary = Color(0xFF2A0850),
    secondaryContainer = Color(0xFF34284A),
    onSecondaryContainer = Color(0xFFF2EEFB),
    tertiary = Color(0xFFFFB1C1),
    onTertiary = Color(0xFF5C0A2C),
    tertiaryContainer = Color(0xFF7A1D44),
    onTertiaryContainer = Color(0xFFFFD6DC),
    background = Color(0xFF16121C),
    onBackground = Color(0xFFECE6F3),
    surface = Color(0xFF16121C),
    onSurface = Color(0xFFECE6F3),
    surfaceVariant = Color(0xFF2A2433),
    onSurfaceVariant = Color(0xFFCBC3D6),
    surfaceContainerLowest = Color(0xFF110D16),
    surfaceContainerLow = Color(0xFF1C1723),
    surfaceContainer = Color(0xFF211B29),
    surfaceContainerHigh = Color(0xFF2A2433),
    surfaceContainerHighest = Color(0xFF332C3D),
    outline = Color(0xFF6E6680),
    outlineVariant = Color(0xFF433B50),
)

/** As cores do guia que o Material não tem: marca-texto, histórico, fontes, diferenças. */
@Immutable
data class GuideColors(
    val highlight: Color,
    val historyBackground: Color,
    val historyBorder: Color,
    val historyAccent: Color,
    val receitasBg: Color,
    val receitasFg: Color,
    val plantaoBg: Color,
    val plantaoFg: Color,
    val driveBg: Color,
    val driveFg: Color,
    val del: Color,
    val ins: Color,
    val insBg: Color,
    val warnBg: Color,
    val warnFg: Color,
    val tipBg: Color,
    val tipFg: Color,
    val pedBg: Color,
    val pedFg: Color,
    val revCurrentBg: Color,
    val revCurrentFg: Color,
    val revFirstBg: Color,
    val revFirstFg: Color,
    val revMiddleBg: Color,
    val revMiddleFg: Color,
)

private val LightGuide = GuideColors(
    highlight = Color(0xB3FFE970),
    historyBackground = Color(0xFFF2F4FF),
    historyBorder = Color(0xFFC3CAF7),
    historyAccent = Color(0xFF2B3BB5),
    receitasBg = Color(0xFFD1FAE5),
    receitasFg = Color(0xFF065F46),
    plantaoBg = Color(0xFFFFE4E6),
    plantaoFg = Color(0xFF9F1239),
    driveBg = Color(0xFFE0F2FE),
    driveFg = Color(0xFF075985),
    del = Color(0xFF9F1239),
    ins = Color(0xFF064E3B),
    insBg = Color(0xFFECFDF5),
    warnBg = Color(0xFFFFF1F2),
    warnFg = Color(0xFF881337),
    tipBg = Color(0xFFFFFBEB),
    tipFg = Color(0xFF78350F),
    pedBg = Color(0xFFF0F9FF),
    pedFg = Color(0xFF0C4A6E),
    revCurrentBg = Color(0xFFFFFBEB),
    revCurrentFg = Color(0xFF78350F),
    revFirstBg = Color(0xFFECFDF5),
    revFirstFg = Color(0xFF065F46),
    revMiddleBg = Color(0xFFF0F9FF),
    revMiddleFg = Color(0xFF0C4A6E),
)

private val DarkGuide = GuideColors(
    highlight = Color(0x5CFFD54F),
    historyBackground = Color(0xFF1E2240),
    historyBorder = Color(0xFF3A428A),
    historyAccent = Color(0xFFA9B4FF),
    receitasBg = Color(0xFF0B3B2E),
    receitasFg = Color(0xFFA7F3D0),
    plantaoBg = Color(0xFF4C0519),
    plantaoFg = Color(0xFFFECDD3),
    driveBg = Color(0xFF0C3A55),
    driveFg = Color(0xFFBAE6FD),
    del = Color(0xFFFDA4AF),
    ins = Color(0xFFA7F3D0),
    insBg = Color(0xFF0B3B2E),
    warnBg = Color(0xFF3B0A1A),
    warnFg = Color(0xFFFECDD3),
    tipBg = Color(0xFF3A2A06),
    tipFg = Color(0xFFFDE68A),
    pedBg = Color(0xFF0C2A3D),
    pedFg = Color(0xFFBAE6FD),
    revCurrentBg = Color(0xFF3A2A06),
    revCurrentFg = Color(0xFFFDE68A),
    revFirstBg = Color(0xFF0B3B2E),
    revFirstFg = Color(0xFFA7F3D0),
    revMiddleBg = Color(0xFF0C2A3D),
    revMiddleFg = Color(0xFFBAE6FD),
)

val LocalGuideColors = staticCompositionLocalOf { LightGuide }

@Composable
fun RenovaTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    CompositionLocalProvider(LocalGuideColors provides if (dark) DarkGuide else LightGuide) {
        MaterialTheme(colorScheme = if (dark) Dark else Light, content = content)
    }
}

object GuideTheme {
    val colors: GuideColors
        @Composable get() = LocalGuideColors.current
}
