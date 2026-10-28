import type { OrthoChapter } from "./types.ts";

/**
 * Criança no plantão de ortopedia: as fraturas que remodelam (tórus, galho
 * verde, fise), a fratura supracondiliana do úmero (a que não pode esperar)
 * e a pronação dolorosa (a que você resolve em 10 segundos). Doses por kg;
 * sedação com pediatra ou anestesista.
 */

const IBUPROFENO_CRIANCA = {
  name: "Ibuprofeno gotas 100 mg/mL",
  posology: "10 mg/kg por dose = 2 gotas/kg (20 gotas por mL); na apresentação de 50 mg/mL, 4 gotas/kg. De 8/8 h, por 3 a 5 dias, com alimento; máximo 400 mg por dose.",
  note: "A partir de 6 meses; não na desidratação nem na doença renal.",
} as const;

const DIPIRONA_CRIANCA = {
  name: "Dipirona gotas 500 mg/mL",
  posology: "10–20 mg/kg por dose = de 1 gota a cada 2 kg até 1 gota/kg (25 gotas por mL; 1 gota/kg é o teto da bula), de 6/6 h se dor.",
  note: "A partir de 3 meses; em dose certa é segura.",
} as const;

const PARACETAMOL_CRIANCA = {
  name: "Paracetamol gotas 200 mg/mL",
  posology: "10–15 mg/kg por dose = 1 gota/kg (15 gotas por mL), de 6/6 h se dor; máximo 5 doses por dia.",
  note: "Alternativa ou soma à dipirona.",
} as const;

export const CRIANCA: readonly OrthoChapter[] = [
  {
    title: "Criança: fraturas e cotovelo",
    intro: "O osso da criança dobra, remodela e cola rápido; o cotovelo é a exceção que vai para a cirurgia hoje — e a história que não bate com a fratura é notificação.",
    topics: [
      {
        slug: "fraturas-na-crianca-torus-galho-verde-e-fise",
        title: "Fraturas na criança: tórus, galho verde e fise",
        aliases: ["fratura em criança", "tórus", "fratura em galho verde", "Salter-Harris", "fise", "placa de crescimento", "punho da criança", "antebraço da criança", "clavícula na criança", "fêmur na criança", "fratura do deambulador"],
        cid: "S52.5 / S52.6 / S42.0 / S72.3 / S82.2",
        summary: "A fratura em tórus do rádio distal trata com tala removível por 3 semanas e nem precisa de raio-X de controle; o galho verde angulado reduz e vai ao gesso; a fise (Salter-Harris) reduz uma vez, com delicadeza, e tem retorno marcado por um ano — e você faz tudo isso, com a família ouvindo o que vai remodelar.",
        ask: [
          "Mecanismo e se bate com a lesão (altura da queda, quem viu)? Idade (quanto mais nova, mais remodela)? Dominância? Já quebrou antes (osteogênese imperfeita, maus-tratos)?",
          "Dor em outro lugar (criança pequena não localiza: examine o membro inteiro e o outro lado)? Dormência, formigamento?",
          "Vacina, alergia, jejum (se vai precisar de sedação).",
        ],
        exam: [
          { name: "Exame do membro inteiro, comparando", how: "Inspeção de deformidade, edema e equimose; palpação osso a osso de distal para proximal, deixando o ponto doloroso por último; articulações acima e abaixo; mobilidade ativa que a criança aceita.", positive: "Ponto doloroso localizado sobre o osso → raio-X; edema sem ponto ósseo → partes moles." },
          { name: "Neurovascular e compartimentos", how: "Pulso, enchimento capilar, cor, mover os dedos (brincadeira: “faz joinha, faz garra, abre a mão”), sensibilidade por toque leve.", positive: "Antebraço tenso e dor crescente → compartimental: mais frequente na criança sedada ou no gesso circular." },
          { name: "Sinais de maus-tratos", how: "Fraturas em várias idades (calos antigos), metafisárias “em alça de balde” ou de canto, costelas posteriores, fêmur ou úmero em quem não anda, história que muda, demora em procurar atendimento, outras lesões (queimadura, hematomas em padrão).", positive: "Qualquer um → esqueleto completo (raio-X de corpo inteiro), internação se preciso, notificação (SINAN e Conselho Tutelar) — obrigatória, não é acusação." },
        ],
        alarm: [
          "Cotovelo inchado que a criança não mexe após queda: supracondiliana até prova em contrário (próximo tópico) — não é este tópico.",
          "Fratura desviada com pele tensa ou ferida, pulso alterado, dedos frios: redução e cirurgia hoje.",
          "Fêmur em menor de 1 ano ou em quem não anda, e qualquer fratura com história incompatível: notificação obrigatória e proteção da criança (não dê alta para o mesmo cuidador sem a rede acionada).",
          "Salter-Harris III, IV e V, ou fise desviada > 2 mm após redução: cirurgia (parafuso) — ortopedia pediátrica em dias.",
        ],
        imaging: ["RX em duas incidências com as articulações vizinhas; comparar com o outro lado se dúvida (fises abertas confundem). Tórus: “dobra” no córtex metafisário. Galho verde: córtex rompido de um lado, dobrado do outro. Fise: classifique Salter-Harris (I: só a fise, pode ter raio-X normal; II: fise + metáfise, a mais comum; III: fise + epífise/articular; IV: atravessa tudo; V: esmagamento). Raio-X de controle: só nas reduzidas (7–10 dias) e nas fises (3 semanas e 6–12 meses)."],
        urgent: [
          "Tórus (torus/buckle) do rádio distal: tala removível (órtese de punho ou tala gessada) por 3 semanas, sem raio-X de controle, alta com analgesia por kg e orientação; retorno em 3 semanas só para tirar — é a fratura mais comum e a mais simples.",
          "Galho verde de antebraço angulado além do aceitável (ver conduta): redução sob sedação (pediatra/anestesista) ou bloqueio de hematoma no maior, completando a fratura do córtex quando a angulação é grande (senão volta); gesso axilopalmar (acima do cotovelo) 4–6 semanas; raio-X em 7–10 dias.",
          "Rádio distal completo ou fise Salter-Harris I–II desviada: redução suave, uma tentativa boa (cada tentativa a mais lesa a fise), gesso antebraquiopalmar bem moldado (axilopalmar se instável), raio-X de controle em 7–10 dias; fise com mais de 5–7 dias de evolução: não reduza (lesa a fise) — aceite ou cirurgia.",
          "Clavícula (galho verde ou completa no terço médio): tipoia 2–3 semanas, sem raio-X de controle, calo é normal. Fêmur: < 6 meses Pavlik (ou spica); 6 meses–5 anos: gesso pelvipodálico (spica) precoce; > 5 anos: hastes flexíveis ou placa — ortopedia pediátrica em dias; tíbia do deambulador (espiral oblíqua sutil em 1–3 anos que mancou após torção): gesso ou bota por 3–4 semanas.",
          "Toda redução: analgesia por kg antes do raio-X; sedação é com pediatra ou anestesista; os pais ficam junto quando dá.",
        ],
        procedures: [
          {
            name: "Gesso axilopalmar (acima do cotovelo) na criança",
            when: "Fratura de antebraço reduzida ou instável, galho verde angulado, rádio distal desviado em < 10 anos. Tala nos primeiros 5–7 dias se muito edema; gesso circular bivalvado se feito no dia.",
            needs: "Gesso 8–10 cm, algodão ortopédico, malha tubular, ajudante segurando os dedos com o cotovelo a 90°.",
            steps: [
              "Malha e algodão da prega palmar até o terço proximal do braço, acolchoando epicôndilos, olécrano e estiloides.",
              "Antebraço em neutro (ou supinação leve nas fraturas distais com desvio dorsal), punho em leve flexão e desvio ulnar (rádio distal) ou neutro (galho verde), cotovelo a 90°.",
              "Molde em três pontos sobre a fratura (não aperte: molde com as palmas) e ovalize o antebraço (índice de gesso < 0,8 reduz perda de redução).",
              "Dedos livres até a prega palmar (devem fletir a metacarpofalângica); bivalve se gesso circular no dia da fratura.",
            ],
            after: "Raio-X com o gesso; orientação escrita (elevar, mexer os dedos, sinais de aperto, não molhar); retorno em 7–10 dias com raio-X. Tempo: 4–6 semanas (menor quanto mais nova).",
          },
        ],
        plan: [
          "O que remodela (aceitar sem reduzir): < 10 anos, rádio distal até 15–20° de angulação no plano sagital e 100% de desvio lateral (“baioneta”) com contato ósseo; antebraço (diáfise) até 10–15° em < 10 anos e 10° em 10–12 anos; rotação não remodela nunca; fise distal do rádio: até 20° em < 10 anos. Quanto mais perto da fise e mais nova, mais remodela — explique com o desenho.",
          "Tempo de gesso: tórus 3 semanas; rádio distal 4 semanas (< 10 anos) a 6 (adolescente); antebraço 6 semanas; tíbia 6–8; fêmur conforme a idade. Raio-X de controle em 7–10 dias nas reduzidas e instáveis (desvio secundário acontece em 20–30%), não nas estáveis.",
          "Fise (Salter-Harris): retorno em 6 e 12 meses com raio-X para ver a barra de crescimento (parada parcial = deformidade angular; completa = encurtamento), mais frequente em fêmur distal, tíbia distal e rádio distal; avise os pais no primeiro dia.",
          "Depois do gesso: rigidez de punho e cotovelo some em 2–4 semanas de uso normal; fisioterapia raramente; sem esporte de contato por 2–4 semanas.",
        ],
        rx: [DIPIRONA_CRIANCA, PARACETAMOL_CRIANCA, IBUPROFENO_CRIANCA],
        immobilize: ["Tórus: tala removível 3 semanas. Rádio distal e antebraço reduzidos: gesso (axilopalmar nas instáveis) 4–6 semanas, raio-X em 7–10 dias. Clavícula: tipoia 2–3 semanas. Tíbia do deambulador: gesso ou bota 3–4 semanas."],
        clinic: [
          "7–10 dias: raio-X com o gesso nas reduzidas e nas instáveis; perdeu a redução além do aceitável → nova redução (se < 2 semanas e não é fise) ou cirurgia (fios) — ortopedia pediátrica.",
          "Fim do gesso: retirar, examinar; raio-X só nas que foram reduzidas ou se dor no foco; liberar atividade progressiva.",
          "Fise: 6 e 12 meses, raio-X comparado com o outro lado; qualquer angulação nova ou encurtamento → ortopedia pediátrica (epifisiodese, osteotomia).",
          "Refratura de antebraço (5–10% no primeiro ano): tratar de novo; avisar os pais para não liberar barra fixa e esporte de contato nos primeiros 2–3 meses.",
        ],
        refer: ["Sai da sua mão: fratura exposta, desviada com pele ou pulso comprometido, fêmur em > 5 anos, antebraço de adolescente instável ou que perdeu a redução, Salter-Harris III–IV e fise desviada > 2 mm após redução, Monteggia e Galeazzi (luxação associada), fise com barra de crescimento — ortopedia pediátrica (hoje nas vasculares e expostas; dias nas outras). Maus-tratos: notificação e rede de proteção, independentemente da fratura."],
        leave: "Escola: dispensa de educação física e recreio pelo tempo do gesso; atestado de acompanhante para o responsável no dia e nos retornos.",
        followup: "7–10 dias nas reduzidas; fim do gesso; fise: 6 e 12 meses.",
        pearls: [
          "Raio-X normal com dor sobre a fise após trauma é Salter-Harris I: imobilize 2–3 semanas e repita o raio-X. Não diga “só contusão”.",
          "Na criança que “não mexe o braço” sem edema nem dor óssea após um puxão, pense em pronação dolorosa antes de pedir raio-X.",
        ],
        sources: ["AAOS/POSNA — Pediatric distal radius and forearm fractures", "NICE NG38 (children: buckle fractures)", "Salter & Harris 1963", "AAP — The evaluation of suspected child physical abuse 2015", "Lei 13.431/2017 e ECA art. 13"],
      },
      {
        slug: "fratura-supracondiliana-do-umero",
        title: "Fratura supracondiliana do úmero na criança",
        aliases: ["cotovelo da criança", "criança caiu e não mexe o cotovelo", "supracondiliana", "Gartland", "fratura do cotovelo infantil", "mão fria após fratura do cotovelo"],
        cid: "S42.4",
        summary: "Criança de 3 a 8 anos que caiu sobre a mão e chegou com o cotovelo inchado que não mexe: é supracondiliana até o raio-X provar o contrário — a sem desvio (Gartland I) é gesso a 90° por 3 semanas, sua; a desviada (II e III) é redução e fios no centro cirúrgico hoje, e a mão sem pulso é a urgência das urgências.",
        ask: [
          "Queda sobre a mão com o cotovelo estendido (extensão, 95%)? Hora? Dormência ou formigamento, consegue mexer os dedos? Jejum desde quando?",
          "Dor desproporcional, piora ao esticar os dedos (compartimental do antebraço — Volkmann)?",
        ],
        exam: [
          { name: "Pulso, perfusão e os três nervos — antes de tudo, anotado com hora", how: "Pulso radial, enchimento capilar e cor da mão. Nervos: interósseo anterior (faz “OK” com polegar e indicador fletidos — o mais lesado na extensão), mediano (sensibilidade do indicador), radial (estende punho e polegar, sensibilidade do dorso da 1ª comissura), ulnar (abre os dedos em leque, sensibilidade do mínimo — o mais lesado na flexão e após fios mediais).", positive: "Mão rosada sem pulso → urgência cirúrgica (redução pode devolver o pulso); mão pálida e fria → emergência vascular: cirurgia agora, vascular junto." },
          { name: "Deformidade e pele", how: "Cotovelo em “S” (deformidade em extensão), equimose anterior na prega (sinal da dobra: o fragmento proximal perfurou o braquial — grave), pele tensa ou com “tenda”.", positive: "Equimose/ruga anterior → Gartland III com partes moles interpostas: não traciona em casa, vai para o centro cirúrgico." },
          { name: "Classificação de Gartland (no raio-X)", how: "I: sem desvio (só coxim gorduroso e linha umeral anterior cruzando o capítulo). II: cortical posterior íntegra, capítulo atrás da linha umeral anterior (angulado). III: desvio completo, sem contato. IV: instável em flexão e extensão (no centro cirúrgico).", positive: "I → gesso. II e III → redução e fixação com fios sob anestesia (II sem rotação e com a linha tocando o capítulo pode ser gesso em flexão > 90° a critério do ortopedista pediátrico — não assuma sozinho)." },
        ],
        alarm: [
          "Mão sem pulso: alinhe suavemente o cotovelo em 20–30° de flexão (não a 90°), reavalie em minutos; sem pulso ainda → centro cirúrgico agora (sua regulação é “vaga zero”: isquemia).",
          "Mão pálida, fria, sem enchimento capilar, com ou sem pulso Doppler: lesão da artéria braquial — vascular e ortopedia na mesma sala.",
          "Dor desproporcional no antebraço, dor ao estender os dedos: síndrome compartimental — abrir tudo, cotovelo em extensão, cirurgia (fasciotomia) em horas.",
          "Fratura aberta (ponta óssea anterior): antibiótico (cefazolina 30 mg/kg), cirurgia hoje.",
        ],
        imaging: ["RX de cotovelo AP e perfil verdadeiro (a 90°, sem rodar) — e do punho e úmero se dor (fratura ipsilateral de antebraço em 5%: “cotovelo flutuante”, cirurgia). No perfil: coxim gorduroso posterior (= fratura oculta), linha umeral anterior deve cruzar o terço médio do capítulo (não cruza = desvio), ângulo de Baumann no AP (varo). Comparar com o outro lado se dúvida. Nada de tomografia ou ressonância de rotina."],
        urgent: [
          "Gartland I (sem desvio, coxim gorduroso + linha umeral anterior cruzando o capítulo): tala gessada posterior (ou gesso axilopalmar bivalvado) a 90° com antebraço neutro por 3 semanas, tipoia, raio-X em 7 dias (desvio?), alta hoje com analgesia por kg e orientação escrita.",
          "Gartland II e III com mão perfundida: analgesia EV por kg, tala posterior em 20–40° de flexão (nunca 90° — comprime a artéria e o antebraço edemaciado), elevação, jejum, neurovascular a cada hora anotado; cirurgia (redução fechada + fios percutâneos) em até 12–24 h — aqui com o ortopedista, ou regulação como urgência (“supracondiliana Gartland III à [lado], mão perfundida, pulso presente, nervos íntegros às [hora]”). Não tente reduzir no plantão sem centro cirúrgico: reduz-se uma vez, sob anestesia, com fluoroscopia.",
          "Gartland III com mão sem pulso ou com déficit nervoso: a mesma coisa, agora — transporte imediato; se o centro cirúrgico é aqui, abre-se a sala enquanto você telefona.",
          "Fratura de antebraço junto (cotovelo flutuante) ou exposta: cirurgia hoje.",
        ],
        procedures: [
          {
            name: "Tala posterior do cotovelo na supracondiliana (Gartland I, ou transporte das II–III)",
            when: "Toda supracondiliana no plantão: a 90° na Gartland I; em 20–40° nas desviadas que aguardam cirurgia.",
            needs: "Gesso 8–10 cm (10–12 camadas), algodão, crepe, tipoia; um ajudante segurando a mão.",
            steps: [
              "Analgesia feita. Ajudante segura o punho sem tração; você apoia o cotovelo.",
              "Acolchoe olécrano, epicôndilos e punho. Tala posterior do terço proximal do braço à prega palmar, com o antebraço em neutro.",
              "Gartland I: cotovelo a 90°. II–III: 20–40° de flexão (perfusão primeiro, alinhamento depois).",
              "Enfaixe frouxo (o edema vem); tipoia; mão elevada no nível do coração.",
            ],
            after: "Pulso, enchimento capilar, cor e os três nervos de novo, anotados com a hora; raio-X com a tala. Nas desviadas: reavaliar de hora em hora até o centro cirúrgico.",
          },
        ],
        plan: [
          "Gartland I: tala/gesso 3 semanas (4 no adolescente), raio-X em 7 dias; depois tirar e usar — amplitude volta em 4–6 semanas sem fisioterapia na maioria; sem esporte de contato por mais 3–4 semanas.",
          "Operada (fios): o cirurgião tira os fios em 3–4 semanas no ambulatório (sem anestesia); gesso sai junto; retorno com você para a amplitude e o alinhamento (ângulo de carregamento) em 6 semanas e 6 meses.",
          "Lesão nervosa (10–15% nas III, mais o interósseo anterior): neuropraxia em quase todas — recupera em 2–4 meses; se não houve melhora em 3 meses, eletroneuromiografia e cirurgia da mão/ortopedia pediátrica.",
          "Cúbito varo (cotovelo “virado para dentro”) é a sequela da redução ruim; osteotomia só se incomoda, anos depois.",
        ],
        rx: [DIPIRONA_CRIANCA, PARACETAMOL_CRIANCA, IBUPROFENO_CRIANCA, { name: "Morfina 10 mg/mL (diluída: 1 mg/mL)", posology: "0,05–0,1 mg/kg EV lento, pode repetir em 15–20 min; só na desviada aguardando cirurgia, com monitorização.", note: "Criança: pediatra junto; antiemético se vômito." }],
        immobilize: ["Tala posterior a 90° (Gartland I) por 3 semanas, ou em 20–40° (desviadas até a cirurgia)."],
        clinic: [
          "Gartland I: raio-X em 7 dias (linha umeral anterior ainda cruza o capítulo? Baumann simétrico?); desviou → ortopedia pediátrica (fios); 3 semanas: tira e libera movimento.",
          "Operada: ferida dos fios (infecção superficial em 2–5%: cefalexina e retirada), retirada dos fios em 3–4 semanas, raio-X; 6 semanas: amplitude; 6 meses: ângulo de carregamento comparado com o outro lado.",
          "Rigidez após 6 semanas de uso normal: fisioterapia; nunca manipulação forçada (miosite ossificante).",
        ],
        refer: ["Sai da sua mão: toda Gartland II e III (redução e fios no centro cirúrgico — ortopedia pediátrica/ortopedista aqui ou pela regulação de urgência em 12–24 h; agora se sem pulso, pálida, aberta, compartimental ou com déficit nervoso), cotovelo flutuante, lesão vascular (vascular), lesão nervosa sem recuperação em 3 meses."],
        leave: "Escola: 3–4 semanas sem educação física; atestado de acompanhante para o responsável nos dias de cirurgia e retornos.",
        followup: "7 dias com raio-X (Gartland I); 3 semanas; operada: conforme o cirurgião, depois 6 semanas e 6 meses.",
        pearls: [
          "O cotovelo da criança desviado vai para a tala em 20–40°, não a 90°. É a única imobilização em que a posição “bonita” isquemia a mão.",
          "O sinal de que a redução sem cirurgia não serve é a linha umeral anterior: se não cruza o capítulo, vai para os fios.",
        ],
        sources: ["AAOS CPG — Pediatric supracondylar humerus fractures 2011/2022", "POSNA — Supracondylar fracture", "BOAST — Supracondylar fractures of the humerus in children", "Gartland classification (1959) / Wilkins modification"],
      },
      {
        slug: "pronacao-dolorosa",
        title: "Pronação dolorosa (subluxação da cabeça do rádio)",
        aliases: ["cotovelo de babá", "criança não mexe o braço após puxão", "puxou pelo braço", "nursemaid's elbow", "subluxação da cabeça do rádio", "braço mole da criança"],
        cid: "S53.0",
        summary: "Criança de 1 a 4 anos que foi puxada ou erguida pelo braço e parou de usá-lo, sem edema nem deformidade, com o cotovelo semifletido e o antebraço pronado: é pronação dolorosa — reduz com uma manobra de 10 segundos, sem raio-X e sem imobilização, e sai da sala brincando.",
        ask: [
          "Puxão pelo braço (segurar pela mão ao cair, levantar pelo braço, “girar” brincando)? Idade 6 meses a 5 anos (pico 1–3)? Já aconteceu (recorre em 20–30%)?",
          "Houve queda ou pancada no cotovelo, há edema ou deformidade? (Se sim, é fratura até o raio-X — não é este tópico.)",
        ],
        exam: [
          { name: "Postura e inspeção", how: "Braço pendente ao lado do corpo, cotovelo em leve flexão, antebraço pronado; a criança não usa a mão (parece “paralisia”), mas não chora em repouso; sem edema, sem equimose, sem deformidade.", positive: "Esse quadro, com história de puxão → pronação dolorosa; não precisa de raio-X." },
          { name: "Palpação osso a osso", how: "Clavícula, úmero, cotovelo (epicôndilos, olécrano, cabeça do rádio), antebraço, punho e mão — a criança deixa se você não for direto ao cotovelo.", positive: "Dor óssea localizada, edema ou crepitação → raio-X antes de qualquer manobra (fratura supracondiliana, clavícula, rádio distal)." },
        ],
        alarm: [
          "Edema, deformidade, equimose ou história de queda: raio-X antes de manipular — a manobra em supracondiliana desloca a fratura.",
          "Não reduziu após duas tentativas, ou a criança não voltou a usar o braço em 30–60 minutos: raio-X de cotovelo e antebraço (fratura oculta, Monteggia) e tala.",
          "Pronação dolorosa em criança > 5–6 anos ou sem história de puxão: desconfie de outra coisa (fratura, artrite, osteomielite — febre?).",
        ],
        imaging: ["Nenhum, na história típica sem edema. Raio-X de cotovelo AP e perfil (e antebraço) se dúvida, trauma, edema, falha da redução ou criança fora da idade — o raio-X da pronação dolorosa é normal."],
        urgent: [
          "Quadro típico: explique aos pais o que vai fazer (um estalo, um choro de 10 segundos), reduza por hiperpronação (ou supinação-flexão), dê um brinquedo ao alcance da mão doente e espere 10–30 minutos fora da sala: a criança usa o braço de novo — alta sem raio-X, sem tala, sem receita.",
          "Não voltou a usar em 30 minutos: repita uma vez com a outra técnica; ainda não → raio-X; normal → tipoia por 1–2 dias e retorno em 48 h (muitas reduzem sozinhas); com fratura → trate a fratura.",
          "Recorrente (3ª vez ou mais): a mesma redução; oriente a não levantar nem puxar pelo braço; a cabeça do rádio “amadurece” e para de sair por volta dos 5 anos.",
        ],
        procedures: [
          {
            name: "Redução da pronação dolorosa — hiperpronação (primeira escolha) e supinação-flexão",
            when: "História típica, sem edema nem deformidade. Pais avisados do choro curto.",
            needs: "Nada: a criança no colo do responsável, de frente para você.",
            steps: [
              "Segure o cotovelo da criança com uma mão, o polegar sobre a cabeça do rádio (face lateral, abaixo do epicôndilo), o cotovelo a 90°.",
              "Hiperpronação: com a outra mão no punho, rode o antebraço para dentro (palma para baixo e além), firme e rápido — sente-se o clique sob o polegar. Taxa de sucesso maior e menos dor do que a supinação (ensaios).",
              "Se não cliques: supinação-flexão — supine o antebraço (palma para cima) com tração leve e flexione o cotovelo ao máximo em um movimento contínuo; o clique vem na flexão.",
              "Saia da sala, deixe um brinquedo do lado doente; em 10–30 minutos a criança pega. Não há dor residual quando reduziu.",
            ],
            after: "Sem imobilização, sem raio-X, sem retorno se usou o braço. Oriente: nunca levantar ou puxar pelo braço ou pela mão; pegar por baixo das axilas.",
          },
        ],
        plan: [
          "Nenhum tratamento além da redução; analgesia por kg só se demorou horas e está irritada.",
          "Orientação aos pais e cuidadores (creche): não puxar pelo braço, não balançar pela mão; recorre em 1 de 4 até os 4–5 anos e para sozinho.",
          "Se reduziu sozinha em casa (comum), não precisa de consulta.",
        ],
        rx: [DIPIRONA_CRIANCA],
        clinic: [
          "Não precisa de retorno se usou o braço na sala. 48 h se saiu com tipoia e dúvida: ainda não usa → raio-X (de novo se já fez) e ortopedia pediátrica.",
          "Família que volta pela 3ª–4ª vez: reforce a orientação; não há cirurgia nem órtese que previna — só o tempo.",
        ],
        refer: ["Sai da sua mão: quase nada — fratura encontrada no raio-X após falha (trate conforme o tópico da fratura ou ortopedia pediátrica), e a criança que não usa o braço em 48 h com raio-X normal (ortopedia pediátrica, dias)."],
        leave: "Nenhum; atestado de acompanhante do dia para o responsável, se pedir.",
        followup: "Nenhum se reduziu; 48 h se saiu em dúvida com tipoia.",
        pearls: [
          "O erro do plantão é pedir raio-X em toda criança que “não mexe o braço”: na história típica sem edema, a manobra é o diagnóstico e o tratamento.",
          "O erro contrário é pior: hiperpronar um cotovelo inchado. Edema = raio-X primeiro.",
        ],
        sources: ["Cochrane — Manipulative interventions for reducing pulled elbow in young children 2017", "AAOS OrthoInfo — Nursemaid's elbow", "POSNA — Radial head subluxation"],
      },
    ],
  },
];
