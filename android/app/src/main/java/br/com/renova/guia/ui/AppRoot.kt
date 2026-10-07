package br.com.renova.guia.ui

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.LocalHospital
import androidx.compose.material.icons.filled.Medication
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import br.com.renova.guia.AppContainer
import br.com.renova.guia.ask.AskViewModel
import br.com.renova.guia.data.GuideState
import br.com.renova.guia.data.ItemRef
import br.com.renova.guia.data.Routes
import br.com.renova.guia.ui.components.CrashNotice

private data class Tab(val route: String, val label: String, val icon: ImageVector, val tag: String)

private val TABS = listOf(
    Tab(Routes.BUSCA, "Busca", Icons.Filled.Search, "tab-busca"),
    Tab(Routes.RECEITAS, "Receitas", Icons.Filled.Medication, "tab-receitas"),
    Tab(Routes.PLANTAO, "Plantão", Icons.Filled.LocalHospital, "tab-plantao"),
    Tab(Routes.DRIVE, "Drive", Icons.Filled.Folder, "tab-drive"),
    Tab(Routes.PERGUNTAR, "Perguntar", Icons.Filled.AutoAwesome, "tab-perguntar"),
)

/** O app inteiro: login, download do guia ou as abas, conforme o estado. */
@Composable
fun AppRoot(container: AppContainer) {
    val state by container.guide.state.collectAsStateWithLifecycle()
    when (val s = state) {
        GuideState.Starting -> DownloadingScreen()
        is GuideState.LoggedOut -> LoginScreen(s.message) { email, password -> container.guide.login(email, password) }
        GuideState.Downloading -> DownloadingScreen()
        is GuideState.DownloadFailed -> DownloadFailedScreen(s.message, onRetry = { container.guide.syncInBackground() }, onLogout = { container.guide.logout() })
        is GuideState.Ready -> MainScaffold(container, s)
    }
    CrashNotice()
}

@Composable
private fun MainScaffold(container: AppContainer, ready: GuideState.Ready) {
    val nav = rememberNavController()
    val content = ready.content
    val prefs = container.prefs
    val askVm: AskViewModel = viewModel {
        AskViewModel(container.api, container.tokens) { container.guide.logout("Sessão expirada. Entre novamente.") }
    }
    val newRevision by container.guide.newRevision.collectAsStateWithLifecycle()
    val backStack by nav.currentBackStackEntryAsState()
    val route = backStack?.destination?.route
    var tab by rememberSaveable { mutableStateOf(Routes.BUSCA) }
    LaunchedEffect(route) { if (TABS.any { it.route == route }) tab = route!! }

    fun open(route: String) = nav.navigate(route) { launchSingleTop = true }
    fun openItem(ref: ItemRef) {
        prefs.opened(ref.id)
        open(ref.route)
    }
    fun selectTab(target: String) = nav.navigate(target) {
        popUpTo(nav.graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = true
    }
    fun openRoute(route: String) {
        idOfRoute(route, ready)?.let(prefs::opened)
        open(route)
    }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainer) {
                for (t in TABS) {
                    NavigationBarItem(
                        selected = tab == t.route,
                        onClick = {
                            // Tocar na aba em que já está volta ao começo dela (a lista, ou a busca).
                            if (tab == t.route) nav.popBackStack(t.route, inclusive = false) else { tab = t.route; selectTab(t.route) }
                        },
                        icon = { Icon(t.icon, contentDescription = null) },
                        label = { Text(t.label) },
                        modifier = Modifier.testTag(t.tag),
                    )
                }
            }
        },
    ) { padding ->
        NavHost(nav, startDestination = Routes.BUSCA, modifier = Modifier.padding(padding).consumeWindowInsets(padding)) {
            composable(Routes.BUSCA) {
                HomeScreen(
                    ready = ready,
                    prefs = prefs,
                    onOpen = ::openItem,
                    onAsk = { q -> askVm.ask(q); tab = Routes.PERGUNTAR; selectTab(Routes.PERGUNTAR) },
                    onNavigate = { r -> if (TABS.any { it.route == r }) { tab = r; selectTab(r) } else open(r) },
                    onSync = { container.guide.syncInBackground() },
                )
            }
            composable(Routes.RECEITAS) { ReceitasScreen(content, ::openRoute) }
            composable(Routes.PLANTAO) { PlantaoScreen(content, ::openRoute) }
            composable(Routes.DRIVE) { DriveScreen(content, ::openRoute) }
            composable(Routes.PERGUNTAR) { AskScreen(content, askVm, ready.offline, ::openRoute) }
            composable(Routes.RECIPE) { entry ->
                RecipeScreen(content, prefs, entry.arguments?.getString("slug").orEmpty(), onBack = { nav.popBackStack() })
            }
            composable(Routes.TOPIC) { entry ->
                TopicScreen(content, prefs, entry.arguments?.getString("slug").orEmpty(), onBack = { nav.popBackStack() }, onOpen = { r -> replaceDetail(nav, r) })
            }
            composable(Routes.DRIVE_ENTRY) { entry ->
                DriveEntryScreen(content, prefs, entry.arguments?.getString("slug").orEmpty(), onBack = { nav.popBackStack() }, onOpen = { r -> replaceDetail(nav, r) })
            }
            composable(Routes.MUDANCAS) { ChangesScreen(content, onBack = { nav.popBackStack() }, onOpenItem = ::openRoute) }
            composable(Routes.ESCUTAR) {
                ListenScreen(content, onOpen = ::openRoute, onAsk = { q -> askVm.ask(q); tab = Routes.PERGUNTAR; selectTab(Routes.PERGUNTAR) }, onBack = { nav.popBackStack() })
            }
            composable(Routes.SOBRE) {
                AboutScreen(ready, onBack = { nav.popBackStack() }, onSync = { container.guide.syncInBackground() }, onLogout = { container.guide.logout() })
            }
        }
    }

    newRevision?.let { rev ->
        NewRevisionDialog(
            content,
            rev,
            onSee = { container.guide.dismissNewRevision(); open(Routes.MUDANCAS) },
            onDismiss = { container.guide.dismissNewRevision() },
        )
    }
}

/** Anterior/próximo troca o item na mesma posição da pilha (voltar vai para a lista, não para o item anterior). */
private fun replaceDetail(nav: NavHostController, route: String) {
    nav.navigate(route) {
        nav.currentDestination?.id?.let { popUpTo(it) { inclusive = true } }
        launchSingleTop = true
    }
}

/** O id (para os recentes) de uma rota de detalhe. */
private fun idOfRoute(route: String, ready: GuideState.Ready): String? {
    val slug = route.substringAfter("/", "")
    return when {
        route.startsWith("receita/") -> ready.content.recipe(slug)?.id
        route.startsWith("topico/") -> ready.content.topic(slug)?.second?.id
        route.startsWith("entrada/") -> ready.content.driveEntry(slug)?.second?.id
        else -> null
    }
}
