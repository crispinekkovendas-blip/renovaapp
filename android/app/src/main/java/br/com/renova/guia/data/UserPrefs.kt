package br.com.renova.guia.data

import android.content.Context
import br.com.renova.guia.search.searchKey
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlin.math.log2

/**
 * O que é do médico, neste aparelho: favoritos, o que abriu por último, as
 * buscas recentes e o caminho que a busca aprende (o que ele abriu depois de
 * cada busca — src/lib/search-history.ts). Nada disso vai para o servidor.
 */
class UserPrefs(context: Context) {
    private val prefs = context.getSharedPreferences("renova_prefs", Context.MODE_PRIVATE)
    private val listSerializer = ListSerializer(String.serializer())
    private val picksSerializer = MapSerializer(String.serializer(), MapSerializer(String.serializer(), Int.serializer()))

    private val _favorites = MutableStateFlow(readList(KEY_FAVORITES))
    val favorites: StateFlow<List<String>> = _favorites.asStateFlow()

    private val _recents = MutableStateFlow(readList(KEY_RECENTS))
    val recents: StateFlow<List<String>> = _recents.asStateFlow()

    private val _recentSearches = MutableStateFlow(readList(KEY_SEARCHES))
    val recentSearches: StateFlow<List<String>> = _recentSearches.asStateFlow()

    private var picks: Map<String, Map<String, Int>> = readPicks()

    var lastSeenRevision: Int
        get() = prefs.getInt(KEY_LAST_REVISION, 0)
        set(value) = prefs.edit().putInt(KEY_LAST_REVISION, value).apply()

    fun isFavorite(id: String) = id in _favorites.value

    fun toggleFavorite(id: String) {
        val next = if (id in _favorites.value) _favorites.value - id else listOf(id) + _favorites.value
        _favorites.value = next
        writeList(KEY_FAVORITES, next)
    }

    fun opened(id: String) {
        val next = (listOf(id) + _recents.value.filter { it != id }).take(MAX_RECENTS)
        _recents.value = next
        writeList(KEY_RECENTS, next)
    }

    /** O médico abriu `id` depois de buscar `query`: a busca passa a pôr o item mais alto. */
    fun rememberPick(query: String, id: String) {
        val q = query.trim()
        val key = searchKey(q)
        if (key.length < 2) return
        val ids = picks[key].orEmpty()
        val next = LinkedHashMap(picks)
        next[key] = ids + (id to ((ids[id] ?: 0) + 1))
        while (next.size > MAX_PICK_KEYS) next.remove(next.keys.first())
        picks = next
        prefs.edit().putString(KEY_PICKS, GuideJson.encodeToString(picksSerializer, next)).apply()

        val searches = (listOf(q) + _recentSearches.value.filter { searchKey(it) != key }).take(MAX_SEARCHES)
        _recentSearches.value = searches
        writeList(KEY_SEARCHES, searches)
    }

    fun clearRecentSearches() {
        _recentSearches.value = emptyList()
        writeList(KEY_SEARCHES, emptyList())
    }

    /** Quanto somar à nota de `id` para esta busca (memoryBoost do site). */
    fun boost(query: String, id: String): Double {
        val q = searchKey(query)
        if (q.length < 2) return 0.0
        var count = 0
        for ((key, ids) in picks) {
            val n = ids[id] ?: continue
            if (key == q) count += n * 2
            else if (key.startsWith(q) || (q.length >= 4 && q.startsWith(key))) count += n
        }
        return if (count > 0) 3 * log2(1.0 + count) else 0.0
    }

    private fun readList(key: String): List<String> = try {
        prefs.getString(key, null)?.let { GuideJson.decodeFromString(listSerializer, it) } ?: emptyList()
    } catch (_: Exception) {
        emptyList()
    }

    private fun writeList(key: String, list: List<String>) {
        prefs.edit().putString(key, GuideJson.encodeToString(listSerializer, list)).apply()
    }

    private fun readPicks(): Map<String, Map<String, Int>> = try {
        prefs.getString(KEY_PICKS, null)?.let { GuideJson.decodeFromString(picksSerializer, it) } ?: emptyMap()
    } catch (_: Exception) {
        emptyMap()
    }

    private companion object {
        const val KEY_FAVORITES = "favorites"
        const val KEY_RECENTS = "recents"
        const val KEY_SEARCHES = "searches"
        const val KEY_PICKS = "picks"
        const val KEY_LAST_REVISION = "last_revision"
        const val MAX_RECENTS = 12
        const val MAX_SEARCHES = 8
        const val MAX_PICK_KEYS = 300
    }
}
