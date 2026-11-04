package br.com.renova.guia.data

import android.content.Context
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File
import java.util.concurrent.atomic.AtomicBoolean

sealed interface GuideState {
    data object Starting : GuideState
    data class LoggedOut(val message: String? = null) : GuideState
    data object Downloading : GuideState
    data class DownloadFailed(val message: String) : GuideState
    data class Ready(
        val content: GuideContent,
        val account: String,
        /** A última tentativa de sincronizar falhou por falta de conexão. */
        val offline: Boolean,
        val syncing: Boolean,
    ) : GuideState
}

/**
 * O guia no aparelho: entra com a conta do Renova, baixa o pacote, guarda e
 * abre sem internet. Sincroniza ao abrir o app (304 quando nada mudou); conta
 * desativada ou token vencido → sai e apaga o guia do aparelho.
 */
class GuideRepository(
    context: Context,
    private val api: ApiClient,
    private val tokens: TokenStore,
    private val prefs: UserPrefs,
    private val scope: CoroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
) {
    private val file = File(context.filesDir, FILE_NAME)
    /** As ilustrações dos procedimentos de ortopedia, baixadas uma vez e guardadas aqui. */
    private val spritesDir = File(context.filesDir, "sprites")
    private val syncLock = Mutex()
    private val started = AtomicBoolean(false)

    @Volatile
    private var lastSync = 0L

    private val _state = MutableStateFlow<GuideState>(GuideState.Starting)
    val state: StateFlow<GuideState> = _state.asStateFlow()

    /** Sobe a cada ilustração que chega: a tela do tópico recompõe e mostra a figura. */
    private val _spritesVersion = MutableStateFlow(0)
    val spritesVersion: StateFlow<Int> = _spritesVersion.asStateFlow()

    /** Onde fica (ou ficará) a cópia local de uma ilustração do pacote. */
    fun spriteFile(image: String): File = File(spritesDir, image.substringAfterLast('/'))

    /** Revisão nova que chegou nesta sincronização e o médico ainda não viu. */
    private val _newRevision = MutableStateFlow<Int?>(null)
    val newRevision: StateFlow<Int?> = _newRevision.asStateFlow()

    /** Uma vez por processo: abre o guia guardado e sincroniza. */
    fun start() {
        if (!started.compareAndSet(false, true)) return
        scope.launch {
            val account = tokens.load()
            if (account == null) {
                _state.value = GuideState.LoggedOut()
                return@launch
            }
            val cached = withContext(Dispatchers.IO) { readCached() }
            _state.value = if (cached != null) GuideState.Ready(cached, account.name, offline = false, syncing = true) else GuideState.Downloading
            cached?.let { warmUp(it) }
            sync()
        }
    }

    /**
     * null se entrou; senão, a mensagem para a tela. O download segue no
     * escopo do repositório: a tela de login sai de cena assim que o estado
     * vira Downloading, e o download não pode morrer junto com ela.
     */
    suspend fun login(email: String, password: String): String? {
        return when (val result = api.login(email, password)) {
            is LoginResult.Failed -> result.message
            is LoginResult.Ok -> {
                tokens.save(TokenStore.Account(result.token, result.expiresAt, result.name))
                _state.value = GuideState.Downloading
                scope.launch { sync() }
                null
            }
        }
    }

    fun syncInBackground() {
        scope.launch { sync() }
    }

    /** O app voltou para a frente: sincroniza se faz mais de 10 minutos. */
    fun onForeground() {
        if (_state.value is GuideState.Ready && System.currentTimeMillis() - lastSync > 10 * 60_000) syncInBackground()
    }

    suspend fun sync() = syncLock.withLock {
        val account = tokens.load()
        if (account == null) {
            logout()
            return@withLock
        }
        lastSync = System.currentTimeMillis()
        val current = (_state.value as? GuideState.Ready)?.content
        (_state.value as? GuideState.Ready)?.let { _state.value = it.copy(syncing = true) }
        when (val result = api.fetchBundle(account.token, current?.bundle?.version)) {
            is BundleResult.Fresh -> {
                val started = System.currentTimeMillis()
                val content = try {
                    withContext(Dispatchers.Default) { GuideContent(GuideJson.decodeFromString<GuideBundle>(result.json)) }
                } catch (e: Exception) {
                    Log.e(TAG, "pacote do guia inválido", e)
                    null
                }
                Log.i(TAG, "pacote ${result.json.length / 1024} KB lido em ${System.currentTimeMillis() - started} ms")
                val name = keepToken(account, result.renewed)
                if (content == null) {
                    fail(current, name, "O guia veio incompleto. Tente de novo.")
                } else {
                    withContext(Dispatchers.IO) { writeAtomically(result.json) }
                    announceRevision(content.bundle.revision.current)
                    _state.value = GuideState.Ready(content, name, offline = false, syncing = false)
                    warmUp(content)
                    fetchSprites(content)
                }
            }
            is BundleResult.NotModified -> {
                val name = keepToken(account, result.renewed)
                if (current != null) {
                    _state.value = GuideState.Ready(current, name, offline = false, syncing = false)
                    fetchSprites(current)
                }
            }
            is BundleResult.Unauthorized -> logout(result.message)
            is BundleResult.Failed -> fail(current, account.name, result.message)
        }
    }

    /** Monta o índice da busca logo depois de abrir o guia, fora da tela (a primeira busca já sai rápida). */
    private fun warmUp(content: GuideContent) {
        scope.launch {
            val started = System.currentTimeMillis()
            content.search
            Log.i(TAG, "índice da busca montado em ${System.currentTimeMillis() - started} ms")
        }
    }

    /**
     * Baixa as ilustrações animadas dos procedimentos que ainda não estão no
     * aparelho (37 SVG, ~1 MB ao todo) e apaga as que o pacote não cita mais.
     * Quando a versão das ilustrações muda no pacote, apaga tudo e baixa de
     * novo. Falha de rede só deixa a figura de fora; a próxima sincronização
     * tenta de novo.
     */
    private fun fetchSprites(content: GuideContent) {
        scope.launch {
            val wanted = content.ortho?.topics.orEmpty().flatMap { t -> t.procedures.orEmpty().mapNotNull { it.image } }
            if (wanted.isEmpty()) return@launch
            val version = content.ortho?.tab?.spritesVersion ?: 0
            if (prefs.spritesVersion != version) {
                spritesDir.deleteRecursively()
                prefs.spritesVersion = version
                _spritesVersion.value++
            }
            spritesDir.mkdirs()
            val keep = wanted.map { it.substringAfterLast('/') }.toSet()
            spritesDir.listFiles()?.filter { it.name !in keep }?.forEach { it.delete() }
            var got = 0
            for (image in wanted) {
                val dest = spriteFile(image)
                if (dest.exists()) continue
                if (api.download(image, dest)) {
                    got++
                    _spritesVersion.value++
                }
            }
            if (got > 0) Log.i(TAG, "$got ilustrações de procedimento baixadas")
        }
    }

    fun dismissNewRevision() {
        _newRevision.value?.let { prefs.lastSeenRevision = it }
        _newRevision.value = null
    }

    /** Sai da conta e apaga o guia do aparelho (o conteúdo licenciado não fica para trás). */
    fun logout(message: String? = null) {
        tokens.clear()
        file.delete()
        spritesDir.deleteRecursively()
        _newRevision.value = null
        _state.value = GuideState.LoggedOut(message)
    }

    private fun fail(current: GuideContent?, name: String, message: String) {
        _state.value = if (current != null) GuideState.Ready(current, name, offline = true, syncing = false) else GuideState.DownloadFailed(message)
    }

    private fun keepToken(account: TokenStore.Account, renewed: Renewed?): String {
        if (renewed == null) return account.name
        val name = renewed.name ?: account.name
        tokens.save(TokenStore.Account(renewed.token, renewed.expiresAt, name))
        return name
    }

    /** Na primeira instalação só anota a revisão; depois, avisa quando chega uma mais nova. */
    private fun announceRevision(current: Int) {
        val seen = prefs.lastSeenRevision
        if (seen == 0) prefs.lastSeenRevision = current else if (current > seen) _newRevision.value = current
    }

    private fun readCached(): GuideContent? = try {
        if (file.exists()) GuideContent(GuideJson.decodeFromString<GuideBundle>(file.readText())) else null
    } catch (_: Exception) {
        file.delete()
        null
    }

    private fun writeAtomically(json: String) {
        val tmp = File(file.parentFile, "$FILE_NAME.tmp")
        tmp.writeText(json)
        if (!tmp.renameTo(file)) {
            file.delete()
            tmp.renameTo(file)
        }
    }

    companion object {
        const val FILE_NAME = "guia.json"
        private const val TAG = "GuiaRenova"
    }
}
