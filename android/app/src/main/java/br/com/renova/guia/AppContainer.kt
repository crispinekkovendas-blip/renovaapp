package br.com.renova.guia

import android.app.Application
import android.content.Context
import br.com.renova.guia.data.ApiClient
import br.com.renova.guia.data.GuideRepository
import br.com.renova.guia.data.TokenStore
import br.com.renova.guia.data.UserPrefs

/** Onde fica o servidor; os testes no emulador trocam por um servidor falso. */
object ServerConfig {
    @Volatile
    var baseUrl: String = BuildConfig.API_BASE_URL
}

/** As peças do app, uma de cada, criadas com o aplicativo. */
class AppContainer(context: Context) {
    val tokens = TokenStore(context)
    val prefs = UserPrefs(context)
    val api = ApiClient(baseUrl = { ServerConfig.baseUrl })
    val guide = GuideRepository(context, api, tokens, prefs)
}

class RenovaGuiaApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
