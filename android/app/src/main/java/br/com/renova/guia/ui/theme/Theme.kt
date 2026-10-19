package br.com.renova.guia.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

/*
 * As cores do Renova no tema "Tevet & Iyar" do site: azul-marinho de Tevet na
 * estrutura, oliva e bronze de Iyar no destaque. O escuro é escolha do médico
 * (menu ⋮ › Tema escuro), não do aparelho — igual ao botão do site.
 */

private val Light = lightColorScheme(
    primary = Color(0xFF2C4A6E),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFE3EAF3),
    onPrimaryContainer = Color(0xFF121A26),
    secondary = Color(0xFF36557A),
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFF3F6FA),
    onSecondaryContainer = Color(0xFF121A26),
    tertiary = Color(0xFF6F7A3A),
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFEBEED3),
    onTertiaryContainer = Color(0xFF383E21),
    background = Color(0xFFF5F6F8),
    onBackground = Color(0xFF1A2230),
    surface = Color(0xFFF5F6F8),
    onSurface = Color(0xFF1A2230),
    surfaceVariant = Color(0xFFF3F6FA),
    onSurfaceVariant = Color(0xFF5A6575),
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color(0xFFFBFCFD),
    surfaceContainer = Color(0xFFF3F6FA),
    surfaceContainerHigh = Color(0xFFEBEFF5),
    surfaceContainerHighest = Color(0xFFE3EAF3),
    outline = Color(0xFFC7D4E6),
    outlineVariant = Color(0xFFDFE4EC),
)

private val Dark = darkColorScheme(
    primary = Color(0xFF8FB1D9),
    onPrimary = Color(0xFF0F1A2A),
    primaryContainer = Color(0xFF27364D),
    onPrimaryContainer = Color(0xFFDDE6F2),
    secondary = Color(0xFFA9C4E4),
    onSecondary = Color(0xFF0F1A2A),
    secondaryContainer = Color(0xFF1C283A),
    onSecondaryContainer = Color(0xFFDDE6F2),
    tertiary = Color(0xFFB5C06F),
    onTertiary = Color(0xFF262B18),
    tertiaryContainer = Color(0xFF363D1F),
    onTertiaryContainer = Color(0xFFEBEFCF),
    background = Color(0xFF0F141B),
    onBackground = Color(0xFFE6EAF0),
    surface = Color(0xFF0F141B),
    onSurface = Color(0xFFE6EAF0),
    surfaceVariant = Color(0xFF1C283A),
    onSurfaceVariant = Color(0xFF96A2B3),
    surfaceContainerLowest = Color(0xFF0A0F16),
    surfaceContainerLow = Color(0xFF141B25),
    surfaceContainer = Color(0xFF18202A),
    surfaceContainerHigh = Color(0xFF1F2834),
    surfaceContainerHighest = Color(0xFF27313F),
    outline = Color(0xFF56739A),
    outlineVariant = Color(0xFF2A3546),
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

/** `dark` vem da escolha guardada no aparelho (UserPrefs.darkTheme). */
@Composable
fun RenovaTheme(dark: Boolean = false, content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalGuideColors provides if (dark) DarkGuide else LightGuide) {
        MaterialTheme(colorScheme = if (dark) Dark else Light, content = content)
    }
}

object GuideTheme {
    val colors: GuideColors
        @Composable get() = LocalGuideColors.current
}
