package br.com.renova.guia

import android.os.ParcelFileDescriptor
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.createEmptyComposeRule
import androidx.compose.ui.test.onAllNodesWithTag
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.performTextReplacement
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import br.com.renova.guia.data.GuideBundle
import br.com.renova.guia.data.GuideJson
import br.com.renova.guia.data.GuideRepository
import okhttp3.mockwebserver.Dispatcher
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import okhttp3.mockwebserver.RecordedRequest
import org.junit.After
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

/**
 * O app de ponta a ponta no emulador, contra um servidor falso (nada vai à
 * produção): login (errado e certo), download do guia, aviso de revisão nova,
 * busca única, tópico com histórico, receita, Drive, Super Inteligência,
 * "o que mudou" e o modo escuro. Cada passo vira uma foto da tela
 * (/sdcard/Download/renova), que o GitHub Actions publica.
 */
@OptIn(ExperimentalTestApi::class)
@RunWith(AndroidJUnit4::class)
class AppFlowTest {
    @get:Rule
    val compose = createEmptyComposeRule()

    private lateinit var server: MockWebServer
    private val bundleJson: String by lazy {
        InstrumentationRegistry.getInstrumentation().context.assets.open("guia.json").use { it.readBytes().toString(Charsets.UTF_8) }
    }
    private val bundle: GuideBundle by lazy { GuideJson.decodeFromString<GuideBundle>(bundleJson) }

    private val answer = listOf(
        """{"t":"search","q":"enxaqueca crise"}""",
        """{"t":"text","d":"Pela receita pronta: **sumatriptana 50 mg** no início da crise [[receita-crise-de-enxaqueca#0]].\n"}""",
        """{"t":"text","d":"- No guia de plantão: dipirona e metoclopramida EV [[enxaqueca#0]]\n"}""",
        """{"t":"sources","items":[{"id":"receita-crise-de-enxaqueca#0","slug":"crise-de-enxaqueca","topic":"Crise de enxaqueca","source":"receitas"},{"id":"enxaqueca#0","slug":"enxaqueca","topic":"Enxaqueca","source":"plantao"}]}""",
        """{"t":"done"}""",
    ).joinToString("\n", postfix = "\n")

    @Before
    fun setUp() {
        server = MockWebServer()
        server.dispatcher = object : Dispatcher() {
            override fun dispatch(request: RecordedRequest): MockResponse {
                val path = request.path ?: ""
                return when {
                    path.startsWith("/api/app/login") -> {
                        val body = request.body.readUtf8()
                        if (body.contains("medico@renova.test") && body.contains("senha-certa")) {
                            MockResponse().setBody("""{"token":"app.teste.ok","expiresAt":${System.currentTimeMillis() + 86_400_000},"user":{"name":"Dra. Teste","role":"profissional"}}""")
                        } else {
                            MockResponse().setResponseCode(401).setBody("""{"error":"E-mail ou senha incorretos."}""")
                        }
                    }
                    path.startsWith("/api/app/guia") -> {
                        val renewed = MockResponse()
                            .addHeader("x-renova-token", "app.teste.ok")
                            .addHeader("x-renova-token-expires", (System.currentTimeMillis() + 86_400_000).toString())
                            .addHeader("x-renova-user", "Dra.%20Teste")
                        if (request.getHeader("If-None-Match") == "\"${bundle.version}\"") renewed.setResponseCode(304) else renewed.setBody(bundleJson)
                    }
                    path.startsWith("/api/guia/perguntar") -> MockResponse().addHeader("content-type", "application/x-ndjson").setBody(answer)
                    else -> MockResponse().setResponseCode(404)
                }
            }
        }
        server.start()
        ServerConfig.baseUrl = server.url("/").toString()

        // Começa do zero: sem conta, sem guia no aparelho; a última revisão vista é a anterior (para o aviso aparecer).
        val app = ApplicationProvider.getApplicationContext<RenovaGuiaApp>()
        app.container.tokens.clear()
        File(app.filesDir, GuideRepository.FILE_NAME).delete()
        app.container.prefs.lastSeenRevision = bundle.revision.current - 1
        shell("mkdir -p /sdcard/Download/renova")
    }

    @After
    fun tearDown() {
        shell("cmd uimode night no")
        server.shutdown()
    }

    private fun shell(command: String) {
        val pfd = InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command)
        ParcelFileDescriptor.AutoCloseInputStream(pfd).use { it.readBytes() }
    }

    private fun shot(name: String) {
        compose.waitForIdle()
        Thread.sleep(700)
        shell("screencap -p /sdcard/Download/renova/$name.png")
    }

    private fun waitForText(text: String, timeout: Long = 20_000) {
        compose.waitUntil(timeout) { compose.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() }
    }

    private fun waitForTag(tag: String, timeout: Long = 20_000) {
        compose.waitUntil(timeout) { compose.onAllNodesWithTag(tag).fetchSemanticsNodes().isNotEmpty() }
    }

    @Test
    fun fluxoCompleto() {
        ActivityScenario.launch(MainActivity::class.java).use {
            // Login: senha errada mostra o erro; a certa baixa o guia.
            waitForTag("login-email")
            shot("01-login")
            compose.onNodeWithTag("login-email").performTextInput("medico@renova.test")
            compose.onNodeWithTag("login-password").performTextInput("senha-errada")
            compose.onNodeWithTag("login-submit").performClick()
            waitForTag("login-error")
            shot("02-login-senha-errada")
            compose.onNodeWithTag("login-password").performTextClearance()
            compose.onNodeWithTag("login-password").performTextInput("senha-certa")
            compose.onNodeWithTag("login-submit").performClick()

            // O guia chegou numa revisão mais nova que a última vista: aviso.
            waitForTag("see-changes", 180_000)
            shot("03-aviso-revisao-nova")
            compose.onNodeWithText("Depois").performClick()

            // Busca única: as três fontes juntas.
            waitForTag("search-field")
            shot("04-busca")
            compose.onNodeWithTag("search-field").performTextInput("enxaqueca")
            waitForText("Crise de enxaqueca", 90_000)
            shot("05-busca-enxaqueca")
            compose.onNodeWithTag("search-field").performTextReplacement("dor de cabeça latejante com enjoo")
            waitForText("Sintoma:", 60_000)
            shot("06-busca-sintoma")

            // Tópico do plantão: marca-texto e o histórico do trecho.
            compose.onNodeWithTag("results").performScrollToNode(hasText("Enxaqueca") and hasText("Plantão"))
            compose.onAllNodes(hasText("Enxaqueca") and hasText("Plantão")).onFirst().performClick()
            waitForText("Página")
            shot("07-topico-plantao")
            val alerts = compose.onAllNodesWithText("⚠ conferir — toque para ver o aviso").fetchSemanticsNodes()
            if (alerts.isNotEmpty()) {
                compose.onAllNodesWithText("⚠ conferir — toque para ver o aviso").onFirst().performScrollTo().performClick()
                waitForTag("history")
                shot("08-historico-do-trecho")
                InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK)
                compose.waitForIdle()
            }

            // Receitas prontas: a lista e uma receita.
            compose.onNodeWithTag("tab-receitas").performClick()
            waitForTag("receitas-list")
            shot("09-receitas")
            compose.onNodeWithTag("receitas-list").performScrollToNode(hasText("Crise de enxaqueca"))
            compose.onNodeWithText("Crise de enxaqueca").performClick()
            waitForText("ORIENTAÇÃO AO PACIENTE")
            shot("10-receita")

            // Drive: a lista e uma entrada.
            compose.onNodeWithTag("tab-drive").performClick()
            waitForTag("drive-list")
            shot("11-drive")
            compose.onNodeWithTag("drive-list").performScrollToNode(hasText("Enxaqueca"))
            compose.onAllNodesWithText("Enxaqueca").onFirst().performClick()
            waitForText("Histórico: do card original")
            shot("12-drive-entrada")

            // Plantão: a lista por capítulo.
            compose.onNodeWithTag("tab-plantao").performClick()
            waitForTag("plantao-list")
            shot("13-plantao")

            // Super Inteligência: pergunta e resposta com as fontes.
            compose.onNodeWithTag("tab-perguntar").performClick()
            waitForTag("ask-field")
            shot("14-perguntar")
            compose.onNodeWithTag("ask-field").performTextInput("Como tratar a crise de enxaqueca?")
            // Pelo "Enviar" do teclado: o botão ainda se move enquanto o teclado sobe.
            compose.onNodeWithTag("ask-field").performImeAction()
            waitForText("FONTES", 60_000)
            shot("15-resposta")

            // O que mudou no guia.
            // A aba Busca volta onde parou (o tópico aberto pela busca); tocar de novo volta ao começo.
            compose.onNodeWithTag("tab-busca").performClick()
            compose.waitForIdle()
            compose.onNodeWithTag("tab-busca").performClick()
            waitForTag("search-field")
            compose.onNodeWithTag("search-field").performTextClearance()
            waitForText("Ver o que cada revisão mudou")
            compose.onNodeWithText("Ver o que cada revisão mudou").performClick()
            waitForTag("changes")
            shot("16-o-que-mudou")

            // Escutar o paciente: o emulador não tem microfone — a queixa vai digitada, como o médico faria.
            InstrumentationRegistry.getInstrumentation().uiAutomation.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_BACK)
            waitForTag("listen-card")
            compose.onNodeWithTag("listen-card").performClick()
            waitForTag("listen-text")
            shot("18-escutar")
            compose.onNodeWithTag("listen-text").performTextInput(
                "doutora, tô com uma dor de cabeça latejante só do lado direito, a luz incomoda muito e tô enjoada desde ontem",
            )
            waitForText("CONDIÇÕES A CONSIDERAR", 90_000)
            waitForText("Enxaqueca", 30_000)
            shot("19-escutar-enxaqueca")
            compose.onNodeWithTag("listen-text").performTextClearance()
            compose.onNodeWithTag("listen-text").performTextInput(
                "meu filho tá com febre desde ontem, chorando muito e puxando a orelha, não dorme de noite",
            )
            waitForText("Otite", 60_000)
            shot("20-escutar-otite")

            // Modo escuro (plantão de madrugada).
            shell("cmd uimode night yes")
            Thread.sleep(2500)
            shot("17-modo-escuro")
        }
    }
}
