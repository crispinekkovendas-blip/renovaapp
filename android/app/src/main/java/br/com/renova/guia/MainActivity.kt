package br.com.renova.guia

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import br.com.renova.guia.ui.AppRoot
import br.com.renova.guia.ui.theme.RenovaTheme

class MainActivity : ComponentActivity() {
    private val container get() = (application as RenovaGuiaApp).container

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        container.guide.start()
        setContent {
            RenovaTheme {
                AppRoot(container)
            }
        }
    }

    override fun onStart() {
        super.onStart()
        // De volta ao app depois de um tempo: confere se o guia mudou (304 quando não mudou).
        container.guide.onForeground()
    }
}
