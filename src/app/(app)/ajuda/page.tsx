import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { SectionTitle } from "@/components/ui";

export const metadata = { title: "Ajuda e novidades" };

/** Link e rótulo andam juntos: um passo tem os dois ou nenhum. */
type Step = { title: string; body: string } & ({ href: string; cta: string } | { href?: never; cta?: never });

const STEPS: readonly Step[] = [
  {
    title: "Atender um paciente",
    body: "Busque o paciente em Início ou em Meus pacientes, abra a ficha e clique em “Novo atendimento”. Queixa, exame, hipótese e conduta ficam no prontuário; o retorno em N dias entra em Agenda › Retornos.",
    href: "/pacientes",
    cta: "Meus pacientes",
  },
  {
    title: "Emitir atestado, encaminhamento, laudo ou orientações",
    body: "Na ficha, escolha o tipo na fileira de pílulas. Monte um ou mais documentos, revise e clique em “Emitir e enviar”: o paciente recebe uma mensagem só, com o link do portal e um código de autenticidade por documento.",
  },
  {
    title: "Receita digital",
    body: "A receita continua na Memed, assinada digitalmente. O botão “Prescrição digital” abre o módulo dentro da ficha; a receita emitida aparece na lista de Documentos.",
  },
  {
    title: "Modelos e protocolos",
    body: "Textos prontos com campos que se preenchem sozinhos. Um protocolo guarda vários documentos de uma vez (atestado + encaminhamento + orientações, por exemplo). Salve pelo compositor (“Salvar como protocolo”) ou em Configurações › Modelos.",
    href: "/configuracoes/modelos",
    cta: "Modelos",
  },
  {
    title: "Portal do paciente",
    body: "Cada paciente tem um link pessoal (botão “Portal” na ficha) com a próxima consulta, confirmar/cancelar, documentos, recibos e pedidos de remarcação, renovação e pré-consulta. Com o código de acesso ligado em Configurações, o portal pede os 4 últimos dígitos do celular.",
  },
  {
    title: "App Android do Guia clínico",
    body: "O guia no celular, sem internet, com a Super Inteligência e o “Escutar o paciente”. Baixe o APK mais novo em Guia clínico › App Android (no computador, aponte a câmera do celular para o QR) e entre com a mesma conta do site.",
    href: "/guia/app",
    cta: "App Android",
  },
  {
    title: "Conferir um documento",
    body: "Quem recebe um atestado impresso confere o código em /validar (também pelo QR da folha). Aparece só que o documento existe, para quem, por quem e quando — nunca o conteúdo.",
    href: "/validar",
    cta: "Abrir /validar",
  },
];

const NEWS: readonly { date: string; items: readonly string[] }[] = [
  {
    date: "7 de outubro de 2026",
    items: [
      "O app Android fica sempre no site: Guia clínico › App Android tem o botão para baixar a versão mais nova, as duas anteriores, o passo a passo de instalação e, no computador, um QR para abrir a página no celular.",
    ],
  },
  {
    date: "6 de outubro de 2026",
    items: [
      "Vocabulário do Guia clínico ampliado: cada condição ganhou dezenas de queixas do jeito que o paciente conta — coloquial e regional, na fala da mãe de uma criança ou de um idoso —, com localização, irradiação, o que piora e o que melhora, sinais associados. A Super Inteligência e o “Escutar o paciente” do app acham a condição a partir dessas palavras (a busca por palavra do site continua com os nomes e sintomas escritos à mão). Gerado com IA a partir do guia; serve só para achar, não é texto do guia.",
      "App Android: “Escutar o paciente”. O celular ouve a queixa (ou o médico digita) e mostra as condições do guia que combinam, com as queixas que casaram e os itens de Receitas, Plantão e Drive. Apoio à decisão, não diagnóstico; nada é gravado e o texto fica só na tela — à Super Inteligência vai só a lista de queixas, se o médico quiser.",
    ],
  },
  {
    date: "2 de outubro de 2026",
    items: [
      "App Android do Guia clínico (Guia Renova): entre com a mesma conta do site e o guia inteiro — receitas prontas, plantão e Drive — fica no celular e abre sem internet. A busca é a mesma do site (nome popular, sintoma vago, CID); a Super Inteligência responde com a fonte de cada trecho e aceita pergunta por voz. Favoritos, abertos por último, enviar ou copiar a receita para o WhatsApp, aviso quando chega revisão nova do guia e modo escuro. Instalação por link (APK).",
      "Uma busca só no Guia clínico: a caixa no alto das três abas procura nas receitas prontas, no plantão e no Drive ao mesmo tempo. Os resultados vêm numa lista só, cada um com a fonte (Receita pronta, Plantão ou Drive) e a linha que explica por que apareceu; na mesma relevância, a aba aberta vem antes, e os chips filtram por fonte. A receita abre ali mesmo; o tópico do plantão e a entrada do Drive abrem a página deles, e voltar devolve os resultados. Em qualquer aba a mesma barra também pergunta à Super Inteligência. Trocar de aba ficou mais leve: o guia chega uma vez só.",
      "A Super Inteligência agora responde com as três abas do guia: além do plantão, as receitas prontas e o Drive de prescrições. Ela diz de qual fonte vem cada conduta, usa a que combina com o cenário (pronto-socorro ou consultório), mostra as duas quando diferem e lembra que a receita pronta é ponto de partida para adulto sem comorbidade. Cada fonte abre no lugar certo — o tópico do plantão, a receita aberta nas Receitas prontas ou a condição no Drive. A caixa de pergunta está no alto das três abas.",
      "A busca das três abas e a Super Inteligência entendem nome popular, grafia comum e sintoma vago: cada condição ganhou outros nomes (enxaqueca = migrânea, “migranha”, hemicrania; cobreiro = herpes-zóster; pano branco = pitiríase versicolor; chumbinho = organofosforado) e os sintomas como o paciente conta (“dor de cabeça latejante com enjoo”, “ardência pra fazer xixi”, “coceira que piora à noite”). Na lista de resultados aparece o nome ou o sintoma que casou.",
      "Os avisos “⚠ conferir” e os avisos do histórico aparecem com o texto inteiro, sem cortar na primeira frase.",
      "Histórico no próprio texto do guia: o que a revisão mudou vem com marca-texto amarelo e, logo embaixo, um carrossel na cor complementar que começa no original — a linha do PDF do guia de plantão, o card do e-book Drive de Prescrições (reproduzido com autorização da autora) ou a receita como foi publicada — e segue 1ª mudança, 2ª mudança e assim por diante. Cada mudança mostra só o trecho trocado (o antigo riscado, o novo em verde); o porquê fica a um toque.",
      "No plantão, aviso pendente aparece como “⚠ conferir” no topo do carrossel do trecho, sempre visível; o toque leva direto ao aviso.",
      "Correção: a receita pronta de anemia por falta de ferro, publicada na 4ª revisão, saía por engano com 1 comprimido em dias alternados. Agora sai como estava registrado: 2 comprimidos juntos (80 mg de ferro) 1 vez ao dia, 180 comprimidos.",
      "Guia clínico mais limpo: mesmo cabeçalho nas três abas; Receitas prontas por grupo, em linhas compactas (condição, CID e remédios) que abrem a receita e a orientação ao paciente; o Drive mostra os remédios de cada condição; o Plantão ganhou chips por capítulo. Com texto na busca, ela cobre a aba inteira.",
      "No alto de cada aba, “Revisões · ver mais” resume o que cada revisão mudou, item por item. A página Revisões — com motivo, antes e agora, Concordo/Discordo e “Copiar discordâncias” — saiu das abas e abre por ali.",
    ],
  },
  {
    date: "1º de outubro de 2026",
    items: [
      "4ª revisão do Guia clínico, revendo tudo de novo — inclusive as revisões anteriores. Plantão: 136 trechos corrigidos, 96 avisos “Conferir” e 8 avisos retirados, em 93 tópicos (ex.: soro antiveneno em 3, 6 ou 12 ampolas pelo PCDT 2025, irradiação de hemocomponente para qualquer grau de parentesco, amoxicilina + clavulanato da criança conforme a suspensão, nitroprussiato na dose máxima por no máximo 10 minutos).",
      "Receitas prontas na 4ª revisão: 30 receitas ficaram marcadas com ✎. Em 9 mudou a própria receita (ex.: pielonefrite com ceftriaxona antes do ciprofloxacino, anemia com 80 mg de ferro por dia, dispepsia só com omeprazol, dengue sem o paracetamol junto da dipirona); 7 passaram a ter outra orientação ao paciente; as outras 14 receberam a correção de uma orientação que compartilham. Orientações novas: início de antidepressivo, crise de asma, sarna e piolho, urticária, herpes genital e infecção nos rins. Corrigidas: antibiótico, IST, dengue e pressão alta (que agora avisa sobre gravidez).",
      "Drive de prescrições na 4ª revisão: 19 mudanças em 18 entradas (ex.: CID que só existia na versão americana, losartana e captopril vetados na gestante, teto da prednisolona por idade na asma da criança, dipirona não abaixo de 3 meses ou 5 kg, fenitoína no máximo 50 mg/min).",
      "Em Revisões, cada mudança tem “Concordo” e “Discordo” (fica salvo neste aparelho), e “Copiar discordâncias” monta a mensagem para mandar à equipe. Quando uma revisão corrige a anterior, o selo mostra a sequência inteira, e o aviso trocado ou retirado aparece com o motivo.",
      "Nova aba Guia clínico › Revisões: tudo o que cada revisão mudou nas Receitas prontas, no Plantão e no Drive, com o que era antes, o que ficou e o motivo, filtrável por revisão e por aba. A versão em uso é sempre a mais nova; a anterior fica registrada para o médico conferir e decidir.",
      "3ª revisão do Guia clínico: 48 mudanças no Plantão (38 correções e 10 avisos em 32 tópicos — ex.: dipirona injetável no máximo 5 g/dia, penicilina pediátrica na leptospirose, prasugrel 60 mg = 6 comprimidos de 10 mg, potássio < 3,5 na cetoacidose, cápsulas onde o guia dizia comprimido). Também 3 receitas prontas (pneumonia com amoxicilina 1 g de 8/8 h, entorse só com gel, onicomicose com a quantidade certa) e 2 entradas do Drive. A revisão também conferiu as correções anteriores e refez uma delas (paracetamol + cafeína na gestação).",
      "Cada trecho corrigido mais de uma vez mostra o histórico inteiro no selo; cada receita mostra “Como era / Como ficou” linha a linha.",
      "Nova aba no Guia clínico: Drive de prescrições. São 90 condições de consultório revistas uma a uma pelas diretrizes atuais (34 refeitas, 45 ajustadas, 11 mantidas). Cada uma traz a receita pronta para copiar, a dose de criança, os cuidados, o que mudou em relação ao Drive original e a fonte.",
      "Receitas prontas revisadas de novo: 23 receitas mudaram e ganharam o selo “✎ Revisada em 01/10”, que mostra o que mudou agora e o que tinha mudado na publicação (30/09). Exemplos: sinusite com amoxicilina na 1ª linha, crise de asma com budesonida + formoterol, gota com a dose de ataque baixa da colchicina e herpes labial com valaciclovir de 1 dia. Há também uma receita nova para candidíase na gestante.",
      "Plantão e emergência com 2ª revisão: mais 34 trechos corrigidos e 43 avisos “Conferir” (ex.: ipratrópio 20 mcg por jato, terlipressina 2 mg de 4/4 h, ondansetrona 4 mg/2 mL, faixa de adrenalina em BIC por diluição, exemplo da morfina em BIC). Cada selo diz se a correção é da publicação (✓ 30/09) ou de agora (✎ 01/10).",
      "Super Inteligência com memória: uma pergunta que já foi feita — mesmo escrita de outro jeito — volta na hora e sem custo, com a data em que foi respondida e o botão “Perguntar de novo”. Só reaproveita quando as palavras clínicas e os números são os mesmos: “criança” × “adulto” ou “20 kg” × “30 kg” sempre vão à IA.",
      "Perguntar ao guia (Plantão e emergência): escreva a dúvida em texto livre — “dose de adrenalina na anafilaxia em criança de 20 kg?” — e a IA (Gemini) acha os trechos pelo sentido e pela palavra e responde só com o texto do guia, citando o trecho de cada informação (toque no número para abrir o tópico). Se o guia não traz a resposta, ela diz que não traz. Aceita perguntas de seguimento. Não digite dados do paciente.",
      "Busca inteligente no Guia clínico (Receitas prontas e Plantão): entende erro de digitação (“anafilacia”, “sepce”), sigla e apelido (IAM, AVC, IOT, “nora”, “pressão alta”, “dor de cabeça”), nome comercial (Novalgina, Rivotril, Lasix) e abreviação (“ped”, “intox”). Enquanto você digita, o resto da palavra aparece em cinza: Tab completa.",
      "Os resultados vêm em ordem de relevância, com o trecho que casou destacado; ↑ ↓ e Enter abrem sem tirar a mão do teclado. Sem nada parecido, aparece “Você quis dizer…”.",
      "A busca aprende com você: o que você acabou abrindo depois de uma busca (e das tentativas antes dela) passa a vir primeiro nas próximas. Buscas recentes aparecem ao tocar no campo. Fica só neste aparelho.",
      "Plantão e emergência no celular: os cartões do índice não passam mais da tela.",
    ],
  },
  {
    date: "30 de setembro de 2026",
    items: [
      "Guia clínico › Plantão e emergência: o Guia de Prescrições da Emergência (2ª edição) inteiro, reproduzido com autorização dos autores, para consultar no hospital — 122 tópicos, de arritmias e sepse a intubação, intoxicações e acidentes com animais, com diluições e doses pediátricas. A revisão corrigiu 58 trechos (dose, diluição, digitação), cada um marcado com “Corrigido” e o texto original, e marcou 18 para conferência.",
      "Novo na barra lateral: Guia clínico. As receitas prontas por condição para consultar sem abrir uma ficha — busca por condição, medicamento ou CID, filtro por grupo, o que sai no papel e a orientação ao paciente que acompanha.",
      "27 receitas prontas novas, agora 72:pielonefrite, cólica renal, tricomoníase, herpes genital (primeiro episódio e recorrência), doença inflamatória pélvica, orquiepididimite, sífilis tardia, sangramento menstrual aumentado, pneumonia com comorbidade, DPOC, otite externa, diarreia aguda, H. pylori, crise hemorroidária, gota (início do alopurinol), furúnculo, pitiríase versicolor, dermatite seborreica, onicomicose, larva migrans, oxiuríase, próstata aumentada, osteoporose, varizes, dengue e enjoo de viagem.",
      "Posologias prontas para mais 10 apresentações, entre elas valaciclovir, ácido mefenâmico, racecadotrila, Saccharomyces boulardii, sais de reidratação oral, diosmina + hesperidina, pomada para hemorroidas, alendronato, gotas otológicas de ciprofloxacino + hidrocortisona e tiabendazol pomada.",
      "Seis orientações novas ao paciente, com sinais de alerta: dengue, infecção urinária, cólica renal, hemorroidas, conjuntivite e IST (com parcerias e exames). Para usar, clique em “Instalar modelos prontos” em Configurações › Modelos: entram só as que faltam, sem mexer nas que você editou.",
    ],
  },
  {
    date: "29 de setembro de 2026",
    items: [
      "Os tipos de documento ficam numa barra estreita à esquerda, como a do YouTube: ícone e nome, sempre à vista enquanto você rola. Passe o mouse em cima e ela abre por cima da tela, com o nome inteiro e o que é cada tipo; tire o mouse e ela recolhe. No celular, a mesma fileira de lado.",
      "Os modelos viraram quadradinhos, 6 por fileira, com o nome curto (sem repetir o tipo). A aba “Mais usados” mostra primeiro os que mais saíram nos seus documentos; “Todos” mostra a lista inteira, com os protocolos.",
      "Receituário, um medicamento por vez: escolha na busca, ajuste no cartão e clique em “Enviar para a receita” — o cartão fecha e o medicamento fica na folha. Para mudar, clique nele na folha ou na linha “Na receita”.",
      "A folha do receituário agora também monta a receita: arraste um medicamento da busca, dos “mais receitados” ou das receitas prontas direto para a folha.",
      "Clique num medicamento na folha para achar o cartão dele no editor; passe o mouse para subir, descer, editar ou tirar ali mesmo, ou arraste para mudar a ordem.",
      "Ao incluir um medicamento, a prévia vai sozinha para o papel em que ele sai (simples ou Controle Especial) e ele pisca. “Ver na folha” em cada cartão faz o caminho de volta.",
      "No computador, a prévia mostra a folha inteira, e a faixa com as páginas numeradas fica sempre à vista embaixo. Clique na porcentagem para ajustar à largura e de novo para voltar à folha inteira.",
    ],
  },
  {
    date: "28 de setembro de 2026",
    items: [
      "“Emitir documento” abre como pop-up por cima da ficha: fica claro onde a tarefa começa e termina. Fechar (×, Esc ou clique fora) guarda tudo como rascunho.",
      "Rascunhos na aba Documentos da ficha, com data, hora e quem montou: “Continuar” reabre exatamente como ficou; “Excluir” pede confirmação. Emitir apaga o rascunho.",
      "Documentos emitidos com filtro por tipo e ordem (mais recentes, mais antigos, por tipo).",
      "Ficha do paciente mais simples: nome e contato no alto, “Novo atendimento” e “Emitir documento”, e abas — Resumo, Atendimentos, Documentos e Mais. O resto está no menu “···”.",
      "Receituário com posologia a um clique: ao buscar um medicamento comum (mais de 200 apresentações), a dose usual de adulto da bula aparece logo abaixo. Um clique e ele entra na receita com posologia, quantidade e via.",
      "“Receitas prontas” por condição: 45 pontos de partida (resfriado, sinusite, cistite, lombalgia, escabiose, hipertensão…), com busca por nome ou CID. Tudo entra na lista para você revisar e ajustar.",
      "“Seus mais receitados”: o que você já receitou volta como atalho, com a sua posologia, e aparece como “Como você já receitou” na lista de posologias.",
      "A posologia já vem escolhida ao adicionar o medicamento: toque no cartão para trocar por outra pronta, ou em “Editar” para escrever a sua.",
      "Prévia como no Canva: uma página por vez, com as miniaturas numeradas embaixo (clique para ir até ela), setas e ← → do teclado, zoom com a porcentagem e “Tela cheia”, com a opção de ver todas as páginas lado a lado. O Controle Especial aparece com as duas vias.",
      "Quase 600 posologias prontas: cada medicamento tem de 2 a 5 opções (5, 7, 10 ou 14 dias; se dor ou horário fixo; pela manhã ou à noite; dose inicial ou de manutenção).",
      "Prévia do receituário corrigida: mostra cada papel que vai sair de verdade (simples e Controle Especial separados, com as vias), avisa quando um medicamento de tarja preta não sai ali e não corta mais a lista.",
      "Perfil, Histórico, Modelos e Ajuda saíram da coluna da direita e viraram uma linha discreta no alto: a prévia da folha ficou maior e legível.",
    ],
  },
  {
    date: "25 de setembro de 2026",
    items: [
      "A barra lateral escondida ganhou uma lingueta com o ícone de menu no canto esquerdo: é só passar o mouse nela.",
      "Novo atalho na barra lateral: “Personalize seus modelos”, direto para os seus modelos e protocolos (profissional e administrador).",
    ],
  },
  {
    date: "24 de setembro de 2026",
    items: [
      "No computador, a barra lateral fica escondida e o conteúdo usa a tela toda: encoste o mouse na borda esquerda para abri-la. No tablet ela continua fixa.",
      "Todo pop-up fecha com um clique fora, com Esc ou no “×” do canto, e todo aviso tem “×”; os de sucesso somem sozinhos.",
    ],
  },
  {
    date: "23 de setembro de 2026",
    items: [
      "O app agora funciona no celular: abas embaixo, ao alcance do polegar, e “Mais” para o resto. Tabelas viram cartões e as folhas A4 cabem na tela.",
      "No compositor, a prévia da folha aparece ao lado do texto enquanto você digita, e “Ver o PDF real” mostra o arquivo sem emitir nada.",
      "Modelos, documentos da pilha e medicamentos podem ser arrastados; no celular, toque para aplicar e use as setas para reordenar.",
      "Busca de CID-10 com todos os códigos oficiais, por código ou por nome.",
      "Trocar de aba ficou mais rápido: voltar a uma tela aberta há pouco é instantâneo.",
      "Agenda do dia: consultas antes das 7h ou depois das 19h aparecem na primeira ou na última linha, como na semana.",
      "Documento médico é emitido, revogado e duplicado pelo profissional (sempre em nome próprio) ou pelo administrador; a recepção imprime e envia.",
      "Profissionais agora acessam Modelos para criar os próprios modelos e protocolos.",
      "Site da clínica e agendamento online de cara nova: três passos, só com os dias que têm horário livre.",
    ],
  },
  {
    date: "17 de setembro de 2026",
    items: [
      "Receita digital: o paciente agora recebe o código de 4 dígitos que a farmácia pede, junto com o link da receita.",
      "Médico que já tem conta na Memed passa a prescrever normalmente — antes ficava travado no primeiro acesso.",
      "“Sincronizar receitas” liga cada receita ao paciente certo e recupera os links que faltavam.",
      "Visual novo do app do médico: barra lateral clara, uma fonte só, roxo e rosa. Início vira “Começar a atender”.",
      "Na ficha, as pílulas de documento levam direto ao compositor.",
    ],
  },
  {
    date: "16 de setembro de 2026",
    items: [
      "“Emitir documentos”: um compositor só para atestado, encaminhamento, laudo e orientações, com revisão, tela de sucesso e “Imprimir todos”.",
      "Central lateral no compositor: Perfil, Histórico (Reenviar e Renovar) e Modelos, com protocolos de vários documentos.",
      "Atestado com motivo pronto e consentimento do CID; encaminhamento com especialidade, história clínica e conduta.",
      "Nome social do paciente; assinatura digitalizada + carimbo e RQE por profissional.",
    ],
  },
  {
    date: "9 de setembro de 2026",
    items: [
      "Documentos com código de autenticidade e validação pública em /validar.",
      "Alergias e medicamentos em uso no cadastro, enviados à Memed; pedido de renovação de receita pelo portal.",
      "Retorno em N dias, lista de Retornos e lembrete automático; código de acesso no portal.",
    ],
  },
  {
    date: "8 de setembro de 2026",
    items: [
      "Portal do paciente com remarcação, avaliação, pré-consulta e arquivo de calendário.",
      "App instalável no celular do paciente com lembretes por notificação.",
    ],
  },
];

/** "Precisando de ajuda?" e "Novidades" da barra lateral, numa página só. */
export default async function AjudaPage() {
  await requireSession();
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-pine-950 sm:text-[28px]">Precisando de ajuda?</h1>
        <p className="mt-1 text-sm text-pine-900/60">O caminho das coisas que você faz todo dia, e o que mudou nas últimas versões.</p>
      </header>

      <section className="space-y-3">
        {STEPS.map((step) => (
          <article key={step.title} className="card p-4 sm:p-5">
            <h2 className="text-[15px] font-extrabold text-pine-950">{step.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-pine-900/70">{step.body}</p>
            {step.href ? (
              // No celular o link ganha altura de alvo de toque (44px) sem mudar o texto.
              <Link
                href={step.href}
                className="mt-1 inline-flex min-h-11 items-center text-xs font-bold text-pine-600 hover:underline sm:mt-3 sm:min-h-0"
              >
                {step.cta} →
              </Link>
            ) : null}
          </article>
        ))}
      </section>

      <section id="novidades" className="mt-8 scroll-mt-20 sm:mt-10">
        <SectionTitle>Novidades</SectionTitle>
        <div className="card divide-y divide-pine-900/5">
          {NEWS.map((entry) => (
            <div key={entry.date} className="px-4 py-4 sm:px-5">
              <p className="text-xs font-bold text-pine-600">{entry.date}</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-pine-900/75">
                {entry.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
