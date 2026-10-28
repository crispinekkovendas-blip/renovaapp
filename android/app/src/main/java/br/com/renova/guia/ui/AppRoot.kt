package br.com.renova.guia.ui

import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Healing
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import br.com.renova.guia.AppContainer
import br.com.renova.guia.ask.AskViewModel
import br.com.renova.guia.data.GuideContent
import br.com.renova.guia.data.GuideState
import br.com.renova.guia.data.ItemRef
import br.com.renova.guia.data.Routes
import br.com.renova.guia.ortho.ConsultViewModel
import br.com.renova.guia.ui.components.AssistantContext
import br.com.renova.guia.ui.components.AssistantFab
import br.com.renova.guia.ui.components.AssistantSheet
import br.com.renova.guia.ui.components.CrashNotice
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Button

private data class Tab(val route: String, val label: String, val icon: ImageVector, val tag: String)

private val TABS = listOf(
    Tab(Routes.BUSCA, "Busca", Icons.Filled.Search, "tab-busca"),
    Tab(Routes.RECEITAS, "Receitas", Icons.Filled.Medication, "tab-receitas"),
    Tab(Routes.PLANTAO, "Plantão", Icons.Filled.LocalHospital, "tab-plantao"),
    Tab(Routes.DRIVE, "Drive", Icons.Filled.Folder, "tab-drive"),
    Tab(Routes.ORTOPEDIA, "Ortopedia", Icons.Filled.Healing, "tab-ortopedia"),
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
    // A Super Inteligência da folha (botão em toda tela) tem conversa própria, com o contexto da tela.
    val assistantVm: AskViewModel = viewModel(key = "assistant") {
        AskViewModel(container.api, container.tokens) { container.guide.logout("Sessão expirada. Entre novamente.") }
    }
    val consultVm: ConsultViewModel = viewModel()
    var assistantOpen by rememberSaveable { mutableStateOf(false) }
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
        // A IA em toda tela, menos na aba dela (que já é a conversa).
        floatingActionButton = { if (route != Routes.PERGUNTAR) AssistantFab { assistantOpen = true } },
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
            composable(Routes.ORTOPEDIA) {
                val ortho = content.ortho
                if (ortho != null) OrthoHomeScreen(ortho, prefs, ::openRoute) else NoOrthoScreen { container.guide.syncInBackground() }
            }
            composable(Routes.ORTO_TOPIC) { entry ->
                content.ortho?.let { ortho ->
                    OrthoTopicScreen(
                        ortho,
                        prefs,
                        entry.arguments?.getString("slug").orEmpty(),
                        onBack = { nav.popBackStack() },
                        onOpen = { r -> if (r.startsWith("orto/")) { idOfRoute(r, ready)?.let(prefs::opened); replaceDetail(nav, r) } else open(r) },
                    )
                }
            }
            composable(Routes.ORTO_CONSULTA, arguments = listOf(navArgument("slug") { defaultValue = "" })) { entry ->
                content.ortho?.let { ortho ->
                    OrthoConsultScreen(
                        ortho,
                        consultVm,
                        startAt = entry.arguments?.getString("slug")?.takeIf { it.isNotBlank() },
                        onBack = { nav.popBackStack() },
                        onOpen = ::openRoute,
                    )
                }
            }
            composable(Routes.ORTO_MUDANCAS) {
                content.ortho?.let { ortho -> OrthoChangesScreen(ortho, onBack = { nav.popBackStack() }, onOpen = ::openRoute) }
            }
            composable(Routes.ESCUTAR) {
                ListenScreen(content, onOpen = ::openRoute, onAsk = { q -> askVm.ask(q); tab = Routes.PERGUNTAR; selectTab(Routes.PERGUNTAR) }, onBack = { nav.popBackStack() })
            }
            composable(Routes.SOBRE) {
                AboutScreen(ready, onBack = { nav.popBackStack() }, onSync = { container.guide.syncInBackground() }, onLogout = { container.guide.logout() })
            }
        }
    }

    if (assistantOpen) {
        AssistantSheet(
            content,
            assistantVm,
            assistantContext(route, backStack?.arguments?.getString("slug"), content, consultVm),
            ready.offline,
            onOpenRoute = { r -> assistantOpen = false; openRoute(r) },
            onDismiss = { assistantOpen = false },
        )
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
        route.startsWith("orto/") -> ready.content.ortho?.topic(slug)?.id
        else -> null
    }
}

/** O pacote guardado é de antes da ortopedia: sincronizar traz a aba. */
@Composable
private fun NoOrthoScreen(onSync: () -> Unit) {
    ScreenScaffold(title = "Ortopedia") { padding ->
        Column(Modifier.padding(padding).fillMaxSize().padding(16.dp)) {
            Text("O guia guardado neste aparelho ainda não tem a ortopedia. Sincronize com internet para baixar.")
            Button(onClick = onSync, modifier = Modifier.padding(top = 12.dp)) { Text("Sincronizar agora") }
        }
    }
}

/**
 * O que a tela atual diz à Super Inteligência e as perguntas prontas para
 * ela: num tópico de ortopedia, as manobras e a receita dele; na consulta
 * guiada, a região, a condição e o passo; nas outras abas, o item aberto.
 */
private fun assistantContext(route: String?, slug: String?, content: GuideContent, consult: ConsultViewModel): AssistantContext {
    val ortho = content.ortho
    val generic = listOf("Qual a dose de dipirona para adulto?", "O que é sinal de alarme em dor lombar?", "Como peço o raio-X de joelho?")
    val key = slug.orEmpty()
    return when {
        route == Routes.ORTO_TOPIC && ortho != null -> {
            val t = ortho.topic(key) ?: return AssistantContext("Ortopedia", generic)
            AssistantContext(
                "Ortopedia › ${t.title}",
                listOfNotNull(
                    t.exam.firstOrNull()?.let { "Como faço a manobra “${it.name}” e o que significa?" },
                    "O que não posso deixar passar neste caso?",
                    if (t.rx.isNotEmpty()) "Monte a receita para adulto sem comorbidade" else null,
                    "Quantos dias de atestado e quando encaminhar?",
                ),
            )
        }
        route == Routes.ORTO_CONSULTA && ortho != null -> {
            val a = consult.answers.value
            val t = a.topic?.let(ortho::topic)
            val region = a.region?.let(ortho::region)
            val label = "Ortopedia › Consulta guiada" + (region?.let { " · ${it.label}" } ?: "") + (t?.let { " · ${it.title}" } ?: "") + " · passo ${consult.step.value.label}"
            AssistantContext(
                label,
                if (t != null) listOf("Explique as manobras do exame de ${t.title}", "Com o que marquei, o que mais devo perguntar?", "Monte a receita e os dias de atestado")
                else listOf("Como diferencio as condições desta região?", "Quais sinais de alarme não posso perder aqui?"),
            )
        }
        route == Routes.ORTOPEDIA -> AssistantContext("Ortopedia (índice)", listOf("Por onde começo numa consulta de ortopedia?", "Como peço o raio-X de joelho?", "O que encaminho no mesmo dia?"))
        route == Routes.ORTO_MUDANCAS -> AssistantContext("Ortopedia › O que mudou", listOf("Resuma o que mudou na última revisão da ortopedia"))
        route == Routes.TOPIC -> AssistantContext("Plantão › ${content.topic(key)?.second?.title.orEmpty()}", listOf("Resuma a conduta deste tópico", "E em criança?"))
        route == Routes.RECIPE -> AssistantContext("Receita pronta › ${content.recipe(key)?.name.orEmpty()}", listOf("Alternativa se houver alergia?", "O que orientar ao paciente?"))
        route == Routes.DRIVE_ENTRY -> AssistantContext("Drive › ${content.driveEntry(key)?.second?.title.orEmpty()}", listOf("Dose para criança de 15 kg?", "Resuma a conduta"))
        else -> AssistantContext(
            when (route) {
                Routes.RECEITAS -> "Receitas prontas"
                Routes.PLANTAO -> "Plantão e emergência"
                Routes.DRIVE -> "Drive de prescrições"
                Routes.ESCUTAR -> "Escutar o paciente"
                Routes.MUDANCAS -> "O que mudou no guia"
                else -> "Guia clínico"
            },
            generic,
        )
    }
}
