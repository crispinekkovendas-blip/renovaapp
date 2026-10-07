package br.com.renova.guia

import br.com.renova.guia.data.ApiClient
import br.com.renova.guia.data.AskEvent
import br.com.renova.guia.data.BundleResult
import br.com.renova.guia.data.LoginResult
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.runTest
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/** O cliente contra um servidor falso: login, sincronização com versão e a resposta aos poucos. */
class ApiClientTest {
    private lateinit var server: MockWebServer
    private lateinit var api: ApiClient

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        api = ApiClient(baseUrl = { server.url("/").toString() })
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun `login devolve o token ou a mensagem do servidor`() = runTest {
        server.enqueue(MockResponse().setBody("""{"token":"app.x.y","expiresAt":123,"user":{"name":"Dra. Ana","role":"profissional"}}"""))
        assertEquals(LoginResult.Ok("app.x.y", 123, "Dra. Ana"), api.login(" ana@clinica.com ", "segredo"))
        val sent = server.takeRequest()
        assertEquals("/api/app/login", sent.path)
        assertTrue(sent.body.readUtf8().contains("\"email\":\"ana@clinica.com\""))

        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"E-mail ou senha incorretos."}"""))
        assertEquals(LoginResult.Failed("E-mail ou senha incorretos."), api.login("ana@clinica.com", "errada"))
    }

    @Test
    fun `sincronização manda a versão e entende 304, 200 e 401`() = runTest {
        server.enqueue(MockResponse().setResponseCode(304).addHeader("x-renova-token", "app.novo.z").addHeader("x-renova-token-expires", "999").addHeader("x-renova-user", "Dra.%20Ana"))
        val notModified = api.fetchBundle("app.velho.z", "abc123") as BundleResult.NotModified
        assertEquals("app.novo.z", notModified.renewed?.token)
        assertEquals("Dra. Ana", notModified.renewed?.name)
        val sent = server.takeRequest()
        assertEquals("Bearer app.velho.z", sent.getHeader("Authorization"))
        assertEquals("\"abc123\"", sent.getHeader("If-None-Match"))

        server.enqueue(MockResponse().setBody("""{"version":"v2"}"""))
        assertTrue(api.fetchBundle("t", null) is BundleResult.Fresh)

        server.enqueue(MockResponse().setResponseCode(401).setBody("""{"error":"Sessão expirada. Entre novamente."}"""))
        assertEquals(BundleResult.Unauthorized("Sessão expirada. Entre novamente."), api.fetchBundle("t", "v2"))

        server.enqueue(MockResponse().setResponseCode(500))
        assertTrue(api.fetchBundle("t", "v2") is BundleResult.Failed)
    }

    @Test
    fun `a resposta da Super Inteligência chega evento por evento`() = runTest {
        val body = listOf(
            """{"t":"search","q":"enxaqueca"}""",
            """{"t":"text","d":"Sumatriptana [[receita-crise-de-enxaqueca#0]]"}""",
            """{"t":"sources","items":[{"id":"receita-crise-de-enxaqueca#0","slug":"crise-de-enxaqueca","topic":"Crise de enxaqueca"}]}""",
            """{"t":"done"}""",
        ).joinToString("\n", postfix = "\n")
        server.enqueue(MockResponse().setBody(body).addHeader("content-type", "application/x-ndjson"))
        val events = api.ask("t", "Enxaqueca?", emptyList()).toList()
        assertEquals(4, events.size)
        assertEquals(AskEvent.Search("enxaqueca"), events[0])
        assertEquals(AskEvent.Done, events[3])
        assertEquals("Bearer t", server.takeRequest().getHeader("Authorization"))

        server.enqueue(MockResponse().setResponseCode(429).setBody("""{"error":"Muitas perguntas seguidas."}"""))
        assertEquals(listOf(AskEvent.Error("Muitas perguntas seguidas.")), api.ask("t", "Outra?", emptyList()).toList())
    }
}
