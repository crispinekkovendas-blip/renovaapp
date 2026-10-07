package br.com.renova.guia.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.io.IOException
import java.util.concurrent.TimeUnit

/*
 * O servidor do Renova: login do app, o pacote do guia (com versão, para não
 * baixar à toa) e a Super Inteligência, que responde aos poucos (NDJSON). A
 * chave do Gemini nunca passa pelo aparelho — a pergunta vai ao servidor.
 */

private val JSON_TYPE = "application/json; charset=utf-8".toMediaType()
private const val NO_CONNECTION = "Sem conexão com o servidor. Confira a internet e tente de novo."

@Serializable
private data class LoginBody(val email: String, val password: String)

@Serializable
private data class LoginReply(val token: String, val expiresAt: Long, val user: LoginUser)

@Serializable
private data class LoginUser(val name: String, val role: String)

@Serializable
data class AskTurn(val role: String, val content: String)

@Serializable
private data class AskBody(val question: String, val history: List<AskTurn>, val fresh: Boolean)

@Serializable
data class AskSource(
    val id: String,
    val slug: String,
    val topic: String,
    val section: String? = null,
    val source: String? = null,
    val href: String? = null,
)

@Serializable
private data class AskEventDto(
    val t: String,
    val q: String? = null,
    val d: String? = null,
    val m: String? = null,
    val at: String? = null,
    val items: List<AskSource>? = null,
)

sealed interface AskEvent {
    data class Search(val query: String) : AskEvent
    data class Text(val delta: String) : AskEvent
    data class Sources(val items: List<AskSource>) : AskEvent
    data class Error(val message: String, val unauthorized: Boolean = false) : AskEvent
    data class Cached(val at: String) : AskEvent
    data object Done : AskEvent
}

/** Uma linha do NDJSON da Super Inteligência → evento (linha estranha é ignorada). */
fun parseAskLine(line: String): AskEvent? {
    if (line.isBlank()) return null
    val dto = try {
        GuideJson.decodeFromString<AskEventDto>(line)
    } catch (_: Exception) {
        return null
    }
    return when (dto.t) {
        "search" -> AskEvent.Search(dto.q ?: "")
        "text" -> dto.d?.let { AskEvent.Text(it) }
        "sources" -> AskEvent.Sources(dto.items ?: emptyList())
        "error" -> AskEvent.Error(dto.m ?: "Não foi possível responder agora.")
        "cached" -> AskEvent.Cached(dto.at ?: "")
        "done" -> AskEvent.Done
        else -> null
    }
}

sealed interface LoginResult {
    data class Ok(val token: String, val expiresAt: Long, val name: String) : LoginResult
    data class Failed(val message: String) : LoginResult
}

sealed interface BundleResult {
    data class Fresh(val json: String, val renewed: Renewed?) : BundleResult
    data class NotModified(val renewed: Renewed?) : BundleResult
    /** 401/403: a conta saiu, foi desativada ou o token venceu. */
    data class Unauthorized(val message: String) : BundleResult
    data class Failed(val message: String) : BundleResult
}

/** O token renovado que vem em cada sincronização. */
data class Renewed(val token: String, val expiresAt: Long, val name: String?)

class ApiClient(
    private val baseUrl: () -> String,
    private val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        // A resposta da IA chega aos poucos; entre um pedaço e outro pode demorar.
        .readTimeout(90, TimeUnit.SECONDS)
        .build(),
) {
    private fun url(path: String) = baseUrl().trimEnd('/') + path

    suspend fun login(email: String, password: String): LoginResult = withContext(Dispatchers.IO) {
        val body = GuideJson.encodeToString(LoginBody(email.trim(), password)).toRequestBody(JSON_TYPE)
        val request = Request.Builder().url(url("/api/app/login")).post(body).build()
        try {
            client.newCall(request).execute().use { response ->
                val text = response.body?.string() ?: ""
                if (!response.isSuccessful) return@withContext LoginResult.Failed(errorMessage(text, response.code))
                val reply = GuideJson.decodeFromString<LoginReply>(text)
                LoginResult.Ok(reply.token, reply.expiresAt, reply.user.name)
            }
        } catch (_: IOException) {
            LoginResult.Failed(NO_CONNECTION)
        } catch (_: Exception) {
            LoginResult.Failed("Resposta inesperada do servidor. Tente de novo.")
        }
    }

    suspend fun fetchBundle(token: String, version: String?): BundleResult = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(url("/api/app/guia"))
            .header("Authorization", "Bearer $token")
            .apply { if (version != null) header("If-None-Match", "\"$version\"") }
            .get()
            .build()
        try {
            client.newCall(request).execute().use { response ->
                val renewed = renewed(response)
                when {
                    response.code == 304 -> BundleResult.NotModified(renewed)
                    response.code == 401 || response.code == 403 ->
                        BundleResult.Unauthorized(errorMessage(response.body?.string() ?: "", response.code))
                    response.isSuccessful -> BundleResult.Fresh(response.body?.string() ?: "", renewed)
                    else -> BundleResult.Failed("O servidor não respondeu (${response.code}). Tente de novo mais tarde.")
                }
            }
        } catch (_: IOException) {
            BundleResult.Failed(NO_CONNECTION)
        }
    }

    /** A pergunta à Super Inteligência; os eventos chegam enquanto a resposta é escrita. */
    fun ask(token: String, question: String, history: List<AskTurn>, fresh: Boolean = false): Flow<AskEvent> = callbackFlow {
        val body = GuideJson.encodeToString(AskBody(question, history, fresh)).toRequestBody(JSON_TYPE)
        val request = Request.Builder()
            .url(url("/api/guia/perguntar"))
            .header("Authorization", "Bearer $token")
            .post(body)
            .build()
        val call = client.newCall(request)
        launch(Dispatchers.IO) {
            try {
                call.execute().use { response ->
                    if (!response.isSuccessful) {
                        val message = errorMessage(response.body?.string() ?: "", response.code)
                        trySend(AskEvent.Error(message, unauthorized = response.code == 401))
                        return@use
                    }
                    val source = response.body?.source() ?: return@use
                    while (!source.exhausted()) {
                        val line = source.readUtf8Line() ?: break
                        parseAskLine(line)?.let { send(it) }
                    }
                }
            } catch (_: IOException) {
                if (!call.isCanceled()) trySend(AskEvent.Error(NO_CONNECTION))
            } finally {
                close()
            }
        }
        awaitClose { call.cancel() }
    }

    private fun renewed(response: Response): Renewed? {
        val token = response.header("x-renova-token") ?: return null
        val expires = response.header("x-renova-token-expires")?.toLongOrNull() ?: return null
        val name = response.header("x-renova-user")?.let { java.net.URLDecoder.decode(it, "UTF-8") }
        return Renewed(token, expires, name)
    }

    private fun errorMessage(body: String, code: Int): String {
        val fromServer = try {
            GuideJson.parseToJsonElement(body).jsonObject["error"]?.jsonPrimitive?.content
        } catch (_: Exception) {
            null
        }
        return fromServer ?: when (code) {
            401 -> "Sessão expirada. Entre novamente."
            403 -> "Sem acesso ao Guia clínico."
            429 -> "Muitas tentativas. Espere alguns minutos."
            else -> "O servidor não respondeu ($code). Tente de novo mais tarde."
        }
    }
}
