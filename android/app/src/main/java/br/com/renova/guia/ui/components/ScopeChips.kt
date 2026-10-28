package br.com.renova.guia.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp

/*
 * O escopo da pergunta à Super Inteligência, como o médico escolhe: tudo,
 * só o Plantão (receitas prontas, emergência e Drive) ou só a Ortopedia.
 * O valor vai no corpo da pergunta (`scope`); null é o guia inteiro.
 */

const val SCOPE_PLANTAO = "plantao"
const val SCOPE_ORTOPEDIA = "ortopedia"

private val SCOPES = listOf(null to "Tudo", SCOPE_PLANTAO to "Plantão", SCOPE_ORTOPEDIA to "Ortopedia")

fun scopeLabel(scope: String?): String = SCOPES.firstOrNull { it.first == scope }?.second ?: "Tudo"

@Composable
fun ScopeChips(value: String?, onChange: (String?) -> Unit, contentPadding: PaddingValues = PaddingValues(horizontal = 16.dp)) {
    LazyRow(
        contentPadding = contentPadding,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.testTag("scope-chips"),
    ) {
        item { MutedText("Procurar em") }
        for ((key, label) in SCOPES) {
            item(key = key ?: "tudo") {
                FilterChip(selected = value == key, onClick = { onChange(key) }, label = { Text(label) }, modifier = Modifier.testTag("scope-${key ?: "tudo"}"))
            }
        }
    }
}
