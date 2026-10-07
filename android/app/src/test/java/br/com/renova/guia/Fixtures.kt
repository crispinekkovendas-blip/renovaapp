package br.com.renova.guia

import br.com.renova.guia.data.GuideBundle
import br.com.renova.guia.data.GuideContent
import br.com.renova.guia.data.GuideJson

/**
 * Os arquivos que scripts/app/export-fixtures.mjs gera a partir do site: o
 * pacote do guia e as respostas do motor de busca do site.
 */
object Fixtures {
    fun text(name: String): String {
        val stream = Fixtures::class.java.classLoader?.getResourceAsStream(name)
            ?: error("$name não encontrado: rode `node scripts/app/export-fixtures.mjs` na raiz do repositório")
        return stream.use { it.readBytes().toString(Charsets.UTF_8) }
    }

    val bundleJson: String by lazy { text("guia.json") }
    val bundle: GuideBundle by lazy { GuideJson.decodeFromString<GuideBundle>(bundleJson) }
    val content: GuideContent by lazy { GuideContent(bundle) }
}
