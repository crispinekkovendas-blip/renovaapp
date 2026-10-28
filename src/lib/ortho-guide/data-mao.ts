import type { OrthoChapter } from "./types.ts";
import { AINE_RX, ANALGESIA_BASE, OMEPRAZOL } from "./rx-base.ts";

/**
 * Cotovelo, mão e dedos no trauma — o que mais chega no plantão depois do
 * tornozelo: luxação de cotovelo e cabeça do rádio, metacarpos e falanges,
 * dedo luxado, martelo e tendão, e o ferimento da ponta do dedo e da unha.
 * Quase tudo é do ortopedista de plantão; o que vai à cirurgia da mão está
 * dito em cada tópico.
 */
export const MAO_E_COTOVELO: readonly OrthoChapter[] = [
  {
    title: "Cotovelo, mão e dedos: trauma",
    intro: "Reduzir, imobilizar na posição certa e devolver o movimento cedo — a mão que fica rígida por 4 semanas de tala mal posta é pior que a fratura.",
    topics: [
      {
        slug: "luxacao-de-cotovelo-e-fratura-da-cabeca-do-radio",
        title: "Luxação de cotovelo e fratura da cabeça do rádio",
        aliases: ["cotovelo saiu do lugar", "luxação do cotovelo", "cabeça do rádio", "caiu com a mão espalmada e o cotovelo inchou", "Mason", "cotovelo travado após queda", "tríade terrível"],
        cid: "S53.1 / S52.1",
        summary: "Cotovelo deformado após queda é luxação posterior: raio-X, sedação e redução por tração — sua, hoje; cotovelo inchado que não estende com raio-X “normal” é fratura da cabeça do rádio: tipoia 2 dias e mover, também sua.",
        ask: [
          "Queda sobre a mão com o cotovelo estendido? Dormência no 4º–5º dedos (ulnar) ou fraqueza para fazer “OK” (interósseo anterior)? Hora da luxação?",
          "Já luxou antes (instabilidade recorrente)? Dominância, profissão.",
        ],
        exam: [
          { name: "Inspeção e triângulo", how: "Olécrano proeminente atrás, antebraço parece curto, cotovelo semifletido; o triângulo olécrano–epicôndilos perdido (na fratura supracondiliana está preservado).", positive: "Deformidade → luxação; não force a mobilidade." },
          { name: "Neurovascular antes e depois", how: "Pulso radial, enchimento capilar; mediano (OK sign, sensibilidade do indicador), ulnar (abduzir dedos, mínimo), radial (extensão do punho e polegar).", positive: "Pulso ausente → reduza já; se não volta, vascular." },
          { name: "Cabeça do rádio", how: "Dor na face lateral ao pronar e supinar; bloqueio mecânico à prono-supinação ou à extensão (teste após aspirar a hemartrose e infiltrar lidocaína).", positive: "Bloqueio mecânico verdadeiro → fragmento interposto: cirurgia." },
        ],
        alarm: [
          "Luxação com fratura da cabeça do rádio e do coronoide (tríade terrível): instável, cirurgia — reduza, imobilize a 90° e peça a vaga.",
          "Pulso ausente após a redução, ou hematoma em expansão: artéria braquial — vascular hoje.",
          "Síndrome compartimental do antebraço nas 24–48 h: dor desproporcional ao estender os dedos.",
          "Luxação aberta ou irredutível (interposição): cirurgia hoje.",
        ],
        imaging: ["RX de cotovelo AP e perfil antes (fratura associada: coronoide, cabeça do rádio, epicôndilo medial) e depois da redução (congruente? fragmento na articulação?). Sinal do coxim gorduroso posterior no perfil = fratura oculta (cabeça do rádio no adulto). Tomografia se fratura associada ou bloqueio."],
        urgent: [
          "Luxação posterior simples: analgesia, raio-X, sedação (ou bloqueio intra-articular com lidocaína 1% 10 mL pelo triângulo lateral), redução por tração (ver procedimento), teste de estabilidade, tala posterior a 90° em pronação neutra, raio-X de controle; alta com retorno em 5–7 dias. Internação só se instável ou neurovascular alterado.",
          "Cabeça do rádio Mason I (sem desvio ou < 2 mm): aspire a hemartrose e infiltre lidocaína se dói muito, tipoia por 2–3 dias e mobilização ativa imediata (flexão-extensão, prono-supinação) — sem gesso. Mason II (desvio > 2 mm, 1 fragmento) sem bloqueio: mesmo tratamento, discutindo cirurgia se > 30% da cabeça ou bloqueio; Mason III (cominuta) e IV (com luxação): cirurgia.",
          "Luxação com fratura (tríade, coronoide, olécrano): reduza, tala a 90°, tomografia, regulação em dias (não é horas se reduzida e perfundida).",
        ],
        procedures: [
          {
            name: "Redução da luxação posterior do cotovelo",
            when: "Luxação posterior ou posterolateral, raio-X feito, sedação ou bloqueio intra-articular. Pare se não reduz em 2 tentativas.",
            needs: "Sedação monitorizada (cetamina/propofol) ou lidocaína intra-articular; 1 ajudante.",
            steps: [
              "Paciente deitado, ajudante segura o braço (úmero) firme; você segura o punho e o antebraço.",
              "Cotovelo em leve flexão (20–30°): tração longitudinal no eixo do antebraço, contínua, 1–2 minutos; corrija o desvio lateral/medial com a outra mão.",
              "Mantendo a tração, flexione o cotovelo devagar enquanto o polegar empurra o olécrano para a frente (sobre a ponta); o “clunk” é a redução.",
              "Alternativa (prono, técnica de Parvin): paciente de bruços com o braço pendente, peso ou tração no punho para baixo, e o polegar guia o olécrano.",
              "Teste a estabilidade: flexão-extensão completa suave; se reluxa antes de 30° de extensão, é instável (tala a 90° e cirurgião).",
            ],
            after: "Neurovascular; raio-X AP e perfil (congruência, fragmentos); tala posterior a 90°, pronação neutra, 5–7 dias; tipoia.",
          },
        ],
        plan: [
          "Luxação simples: tala 5–7 dias (não mais: rigidez), depois tipoia e movimento ativo (flexão-extensão) várias vezes ao dia, evitando estender além de 30° nas primeiras 2–3 semanas se instável; órtese articulada com bloqueio de extensão se disponível; sem carga e sem esporte por 6 semanas; a perda de 10–15° de extensão é comum e não é falha.",
          "Cabeça do rádio Mason I–II: movimento desde o 1º–3º dia é o tratamento; dor até 6 semanas; raio-X em 2 semanas; rigidez é a complicação de quem imobiliza.",
          "Calcificação heterotópica (cotovelo que endurece após 3–4 semanas): indometacina 25 mg 3×/dia por 3–4 semanas pode ser usada na alta energia — discuta com o cirurgião; não massagear forçado.",
          "Fisioterapia de ganho de amplitude a partir da 2ª semana; alongamento ativo, não passivo forçado.",
        ],
        rx: [...ANALGESIA_BASE, ...AINE_RX, OMEPRAZOL],
        immobilize: ["Tala gessada posterior a 90° com pronação neutra por 5–7 dias (luxação) ou tipoia por 2–3 dias (cabeça do rádio); depois tipoia e movimento."],
        clinic: [
          "5–7 dias: retire a tala, raio-X (ainda reduzido?), comece a mobilização; 3 semanas: raio-X e amplitude; 6 semanas: liberar carga progressiva.",
          "Reluxação ou subluxação no raio-X de controle (sinal da gota no perfil): instável → cirurgião (reparo ligamentar).",
          "Rigidez > 30° de perda de extensão em 3 meses apesar de fisioterapia: cirurgião (liberação artroscópica), eletivo.",
          "Instabilidade posterolateral crônica (sensação de sair ao apoiar com o cotovelo estendido e supinado): ressonância e cirurgião, eletivo.",
        ],
        refer: ["Sai da sua mão: luxação irredutível, aberta ou com lesão vascular (hoje); luxação com fratura instável — tríade terrível, coronoide, olécrano (cirurgia em dias); cabeça do rádio Mason III–IV ou com bloqueio mecânico (fixação ou prótese da cabeça, em dias); instabilidade ou rigidez crônica (eletivo)."],
        leave: "Luxação simples: 14–21 dias (escritório 7); cabeça do rádio: 7–14 dias; braçal: 6 semanas.",
        followup: "5–7 dias (tala fora, raio-X), 3 semanas, 6 semanas.",
        pearls: [
          "Cotovelo luxado que reduziu “sozinho” no local do acidente ainda precisa do raio-X, do neurovascular e dos 5–7 dias de tala.",
          "Coxim gorduroso posterior com dor na cabeça do rádio é fratura, mesmo sem traço: trate como Mason I. Não peça tomografia, peça movimento.",
        ],
        sources: ["AAOS OrthoInfo — Elbow dislocation; Radial head fractures", "BESS — Elbow instability", "Mason classification (1954) / Hotchkiss modification", "Rockwood & Green — Elbow dislocations"],
      },
      {
        slug: "fraturas-de-metacarpo-e-falanges",
        title: "Fraturas de metacarpo e falanges (soco e esmagamento)",
        aliases: ["fratura do boxeador", "deu um soco e quebrou a mão", "fratura do 5º metacarpo", "metacarpo", "fratura de dedo", "falange", "dedo torto", "Bennett"],
        cid: "S62.3 / S62.6 / S62.2",
        summary: "A fratura do colo do 5º metacarpo (soco) aceita até 40–70° de angulação se não há rotação: redução se precisar, tala em calha ulnar 3–4 semanas e movimento — é sua; o que opera é a rotação, a articulação desviada, as múltiplas e o polegar (Bennett).",
        ask: [
          "Soco (colo do 5º ou 4º), esmagamento (diáfise, múltiplas, esposta), queda (base), torção do dedo (falange, articular)? Ferida (fratura exposta — e a “mordida de dente” no soco)?",
          "Dominância, profissão, instrumentista ou trabalho fino (menor tolerância a desvio).",
        ],
        exam: [
          { name: "Rotação (o exame que decide a cirurgia)", how: "Peça para fletir os dedos devagar: todos devem apontar para o tubérculo do escafoide e nenhum cruza o vizinho; com os dedos semifletidos, compare o plano das unhas.", positive: "Dedo que cruza ou unha fora do plano → desvio rotacional: cirurgia, qualquer grau (5° de rotação = 1,5 cm de sobreposição na ponta)." },
          { name: "Angulação e encurtamento", how: "Perda da proeminência do nó (cabeça do metacarpo caída na palma), dedo encurtado, extensão da metacarpofalângica reduzida (“lag”).", positive: "Angulação no perfil além do aceitável para o osso (ver imagem) ou lag de extensão > 20° → reduzir." },
          { name: "Pele, tendão e nervo", how: "Ferida sobre o nó após soco (mordedura humana = ferida contaminada: “fight bite”), extensão ativa de cada dedo, sensibilidade das polpas.", positive: "Fight bite → lavagem, antibiótico, exploração do tendão e da articulação; não suturar." },
        ],
        alarm: [
          "Ferida sobre a metacarpofalângica após soco: mordedura humana com inoculação na articulação — lavagem cirúrgica e antibiótico (amoxicilina-clavulanato), não fechar; artrite séptica em 48 h se ignorada.",
          "Esmagamento com múltiplas fraturas, dedos pálidos ou tensos: compartimental da mão — cirurgia hoje.",
          "Fratura do 1º metacarpo na base (Bennett, Rolando): quase sempre cirurgia — tala spica e cirurgião em dias.",
        ],
        imaging: ["RX de mão PA, oblíqua e perfil (dedo isolado: PA e perfil verdadeiro do dedo). Angulação aceitável no colo dos metacarpos (perfil): 5º até 40–70°, 4º até 30–40°, 3º até 10–15°, 2º até 10°; na diáfise: 5º 30°, 4º 20°, 3º–2º 10°; encurtamento até 5 mm; articular: degrau < 1–2 mm. Falange proximal: angulação aceitável < 10–15° e sem rotação."],
        urgent: [
          "5º metacarpo (colo) sem rotação, angulação aceitável: tala em calha ulnar (ou buddy taping e tala de punho nos muito estáveis) por 3–4 semanas, movimento dos dedos livres desde já, alta com raio-X em 7–10 dias. Com angulação além do aceitável ou lag de extensão: redução (Jahss, ver procedimento) com bloqueio de hematoma e a mesma tala; se não segura, cirurgião.",
          "Diáfise de metacarpo sem rotação, angulação e encurtamento aceitáveis: tala em calha (ulnar ou radial) 3–4 semanas, raio-X em 7–10 dias; rotação, encurtamento > 5 mm, múltiplas ou exposta: cirurgia em dias (fios ou placa).",
          "Falange sem desvio ou articular estável: buddy taping (dedo colado ao vizinho) 3 semanas com movimento; falange proximal angulada: redução com bloqueio digital e tala com a metacarpofalângica a 70–90° de flexão; articular desviada, rotação, condilar, instável: cirurgia da mão em dias.",
          "Exposta de falange distal (unha, esmagamento): lavagem, antibiótico oral, reparo da unha e tala — sua (ver Ferimentos da mão).",
        ],
        procedures: [
          {
            name: "Redução da fratura do colo do 5º metacarpo — manobra de Jahss — e tala em calha ulnar",
            when: "Angulação acima do aceitável ou lag de extensão; sem rotação. Não em fratura exposta.",
            needs: "Bloqueio de hematoma (lidocaína 1% 5 mL no foco, dorso da mão) ou bloqueio do nervo ulnar no punho; gesso 10 cm, algodão, crepe.",
            steps: [
              "Espere o bloqueio (10 min). Flexione a metacarpofalângica e a interfalângica proximal a 90°.",
              "Empurre a falange proximal para cima (dorsal) no eixo, enquanto o polegar da outra mão empurra o dorso do metacarpo (a diáfise) para baixo — a cabeça sobe.",
              "Mantenha a redução enquanto o ajudante aplica a tala em calha ulnar: do terço proximal do antebraço, pelo bordo ulnar, até a ponta do 4º e 5º dedos, com o punho em 20–30° de extensão, a metacarpofalângica a 70–90° de flexão e as interfalângicas em extensão (posição intrínseco-plus). Molde o dorso sobre a cabeça do metacarpo.",
              "Enfaixe sem apertar; dedos 2º e 3º livres para mover.",
            ],
            after: "Raio-X com a tala; retorno em 7–10 dias com raio-X (perde-se parte da redução; o que importa é rotação zero e função). 3–4 semanas de tala, depois movimento e buddy taping.",
          },
          {
            name: "Buddy taping (sindactilia) e a posição segura da mão",
            when: "Falanges estáveis, entorses de dedo, pós-redução estável, e depois de qualquer tala para recuperar movimento.",
            needs: "Esparadrapo ou fita de 1–2 cm, gaze entre os dedos.",
            steps: [
              "Gaze fina entre os dedos (pele não encosta na pele); duas tiras, uma na falange proximal e outra na média, deixando as articulações livres para fletir.",
              "O dedo lesado colado ao vizinho maior (4º com o 3º; 5º com o 4º; 2º com o 3º).",
              "Troque a cada 2–3 dias ou se molhar; 3 semanas, movendo o tempo todo.",
            ],
            after: "Toda tala de mão que precise ficar mais de alguns dias é em posição intrínseco-plus: punho 20–30° de extensão, metacarpofalângicas a 70–90°, interfalângicas retas — é a posição que não enrijece.",
          },
        ],
        plan: [
          "Movimento é o tratamento: os dedos que não estão na tala movem desde o 1º dia; o dedo fraturado começa a mover em 3 semanas (metacarpo) ou já no buddy taping (falange estável).",
          "Rigidez de interfalângica proximal após 3 semanas de tala mal posta (em extensão ou em flexão) é a sequela mais comum: por isso a posição intrínseco-plus.",
          "Consolidação clínica em 3–4 semanas (metacarpo e falange); o raio-X atrasa semanas — libere pela clínica (sem dor no foco).",
          "Elevação e gelo nas primeiras 48–72 h; edema de mão demora.",
        ],
        rx: [...ANALGESIA_BASE, ...AINE_RX, { name: "Cefalexina 500 mg", posology: "1 comprimido de 6/6 h por 5 a 7 dias.", note: "Só na fratura exposta de falange distal (unha/esmagamento); na mordedura humana do soco, amoxicilina-clavulanato." }, { name: "Amoxicilina + clavulanato 875/125 mg", posology: "1 comprimido de 12/12 h por 5 a 7 dias, começando no plantão.", note: "Ferida sobre o nó após soco (mordedura humana). Alergia: clindamicina 300 mg 8/8 h + ciprofloxacino 500 mg 12/12 h." }],
        immobilize: ["Metacarpo: tala em calha ulnar ou radial em intrínseco-plus 3–4 semanas. Falange: buddy taping 3 semanas, ou tala digital curta com a metacarpofalângica fletida. Polegar: spica."],
        clinic: [
          "7–10 dias: raio-X com a tala (perda de redução? rotação?); se rotação apareceu, cirurgião — ainda dá tempo.",
          "3–4 semanas: tira a tala, buddy taping, movimento; 6 semanas: força e retorno ao trabalho; sem raio-X de rotina depois do de 3–4 semanas se clínica boa.",
          "Lag de extensão residual, dor na palma ao pegar objetos (cabeça caída): aceitável na maioria; cirurgia eletiva (osteotomia) só se função ruim em trabalhador manual.",
        ],
        refer: ["Sai da sua mão: qualquer rotação, encurtamento > 5 mm, articular com degrau, múltiplas, exposta com esmagamento, Bennett/Rolando, redução que não segura (cirurgia da mão / ortopedista de mão em dias, pela regulação); fight bite (lavagem cirúrgica em 24 h); compartimental da mão (hoje)."],
        leave: "Escritório: 7–14 dias com a tala (mão não dominante: 0–3); braçal: 4–6 semanas.",
        followup: "7–10 dias com raio-X; 3–4 semanas; 6 semanas.",
        pearls: [
          "Soco com ferida sobre o nó: pergunte “foi no dente?”. A resposta muda tudo e o paciente não conta sozinho.",
          "A tolerância ao desvio no 5º metacarpo é grande porque a articulação carpometacarpal dele é móvel; no 2º e 3º não é — não aplique o 40° do mínimo ao indicador.",
        ],
        sources: ["ASSH — Metacarpal and phalangeal fractures", "AAOS OrthoInfo — Hand fractures", "BSSH — Hand fracture guidelines", "Jahss 1938 (redução do colo do metacarpo)"],
      },
      {
        slug: "luxacao-de-dedo-e-lesoes-de-tendao",
        title: "Dedo luxado, dedo em martelo e lesões de tendão",
        aliases: ["dedo saiu do lugar", "luxação de dedo", "dedo em martelo", "mallet finger", "ponta do dedo caída", "jersey finger", "não dobra a ponta do dedo", "boutonnière", "entorse de dedo", "placa volar"],
        cid: "S63.1 / S66.3 / S66.1 / S63.6",
        summary: "A luxação dorsal da interfalângica proximal reduz com bloqueio digital e tração e volta a mexer com buddy taping; o dedo em martelo é 6–8 semanas de tala em extensão sem nunca dobrar; o dedo que não flete a ponta (jersey) é cirurgia em 7–10 dias — e o seu papel é não perder o prazo.",
        ask: [
          "Mecanismo: dedo “entortou para trás” na bola (luxação dorsal da IFP, placa volar), pancada na ponta do dedo estendido (martelo), puxão da camisa com o dedo fletido (jersey, anular), corte ou esmagamento (tendão)?",
          "Consegue esticar a ponta (martelo)? Consegue dobrar a ponta sozinha (jersey)? Reduziu sozinho ou alguém puxou no campo?",
        ],
        exam: [
          { name: "Cada articulação, cada tendão", how: "Flexão da interfalângica distal isolada (segure a média: FDP); flexão da IFP com os outros dedos estendidos (FDS); extensão ativa da IFD (martelo) e da IFP (central slip — teste de Elson: resista à extensão da IFP com ela fletida sobre a mesa; IFD rígida em extensão = central slip roto).", positive: "Ponta caída sem extensão ativa → martelo; não flete a IFD → jersey (FDP); Elson positivo → boutonnière em formação." },
          { name: "Estabilidade após reduzir a IFP", how: "Flexão-extensão ativa completa; estresse lateral em extensão e a 30°.", positive: "Estável no arco todo → buddy taping; reluxa em extensão → tala de bloqueio dorsal 20–30°; instável lateral → colateral roto (grau III)." },
          { name: "Pele e neurovascular", how: "Ferida (luxação aberta — comum na IFP), perfusão, sensibilidade dos dois lados do dedo.", positive: "Ferida → lavagem, antibiótico; dormência unilateral → nervo digital (sutura em dias se corte limpo)." },
        ],
        alarm: [
          "Luxação irredutível (botoeira da cabeça do metacarpo ou da falange presa na placa volar — típica da metacarpofalângica do indicador e do polegar): não insista, não traciona mais — redução aberta.",
          "Jersey finger: o tendão retrai para a palma; depois de 10 dias a sutura primária fica difícil. Cirurgia da mão em até 7–10 dias — a sua urgência é a regulação em 48 h.",
          "Luxação aberta: lavagem, antibiótico, redução e fechamento só se limpa; exploração se dúvida.",
        ],
        imaging: ["RX do dedo PA e perfil verdadeiro antes de reduzir (fratura da base da falange média — a “fratura-luxação” que muda a conduta) e depois (congruência; subluxação residual no perfil). Martelo: perfil mostra o fragmento ósseo e a subluxação volar da IFD. Jersey: perfil pode mostrar fragmento de avulsão na palma ou junto à IFP."],
        urgent: [
          "Luxação dorsal da IFP: bloqueio digital, redução (tração leve + hiperextensão suave e flexão, ver procedimento), raio-X, teste de estabilidade; estável: buddy taping 3 semanas com movimento imediato; instável em extensão: tala de bloqueio dorsal em 20–30° por 2–3 semanas, reduzindo 10° por semana. Alta hoje.",
          "Fratura-luxação da IFP com fragmento volar > 30–40% da base da falange média: instável — reduza, tala de bloqueio dorsal e cirurgião em dias.",
          "Martelo fechado (tendinoso ou ósseo com fragmento < 1/3 e sem subluxação): tala de Stack ou alumínio em extensão (ou leve hiperextensão) da IFD, 6–8 semanas contínuas + 2–4 semanas noturnas; IFP livre. Ósseo com > 1/3 da superfície ou subluxação volar: cirurgião (fio) em dias.",
          "Jersey (avulsão do FDP): tala em posição segura, regulação urgente para cirurgia da mão em 7–10 dias; escreva “avulsão do flexor profundo do 4º dedo — reparo em até 10 dias”.",
          "Boutonnière agudo (Elson positivo) sem fratura: tala da IFP em extensão por 6 semanas com a IFD livre para fletir ativamente (IFD fletir é o tratamento); cirurgião se aberta ou com fragmento.",
        ],
        procedures: [
          {
            name: "Redução da luxação dorsal da interfalângica proximal",
            when: "Luxação dorsal fechada, com raio-X. Não repetir mais de duas vezes.",
            needs: "Bloqueio digital (lidocaína 1–2% sem vaso 2–4 mL), gaze seca para segurar o dedo.",
            steps: [
              "Com o bloqueio feito, segure a falange proximal com uma mão e a média com a outra.",
              "Tração leve no eixo com discreta hiperextensão (relaxa a placa volar presa), depois empurre a base da falange média para volar e flexione — o dedo encaixa.",
              "Mova ativamente: flexão-extensão completas sem reluxar = estável. Estresse lateral.",
              "Raio-X de controle em perfil verdadeiro: a base da falange média alinhada com a cabeça da proximal, sem subluxação.",
            ],
            after: "Buddy taping 3 semanas (estável) ou tala de bloqueio dorsal 20–30° (instável em extensão). Avise: o dedo fica inchado e duro por 3–6 meses; mover desde hoje é o que evita a rigidez.",
          },
          {
            name: "Tala do dedo em martelo",
            when: "Martelo fechado, tendinoso ou ósseo pequeno sem subluxação. Começa no dia, mesmo que o trauma tenha semanas (até 3 meses ainda responde).",
            needs: "Tala de Stack do tamanho certo (ou tala de alumínio acolchoada cortada para a IFD), esparadrapo.",
            steps: [
              "IFD em extensão ou leve hiperextensão (sem branquear a pele dorsal — isquemia), IFP livre.",
              "Fixe com esparadrapo; o paciente troca a tala só com o dedo apoiado reto na mesa (nunca deixar a ponta dobrar, nem para lavar — explique e demonstre).",
              "6–8 semanas contínuas (8 nos ósseos e em quem demorou), depois 2–4 semanas só à noite e no esporte.",
            ],
            after: "Retorno em 1 semana (pele, tala ajustada) e em 6 semanas (teste de extensão; se cair, mais 2–4 semanas). Déficit residual de 5–10° é aceitável.",
          },
        ],
        plan: [
          "Entorse da IFP (placa volar, sem luxação ou já reduzida estável): buddy taping 2–3 semanas e movimento; o edema dura meses e a dor ao apertar até 6–12 meses.",
          "Colateral da metacarpofalângica do polegar (polegar do esquiador, lesão de Stener): spica 4–6 semanas se estável; instável (> 30° de abertura ou sem ponto final) → cirurgia da mão em 1–2 semanas.",
          "Tendão extensor cortado no dorso (zona 5–6): pode ser suturado no plantão por quem sabe (fio 3-0/4-0, pontos de Kessler), tala em extensão 4–6 semanas; flexor cortado: cirurgia da mão sempre (nunca explorar “para ver” sem condições).",
          "Fisioterapia da mão (terapia ocupacional) a partir da retirada da tala; rigidez é a sequela que mais limita.",
        ],
        rx: [...ANALGESIA_BASE, ...AINE_RX, { name: "Cefalexina 500 mg", posology: "1 comprimido de 6/6 h por 5 dias.", note: "Só na luxação aberta ou ferida sobre a articulação (após lavagem)." }],
        immobilize: ["IFP luxada estável: buddy taping 3 semanas. Instável: tala de bloqueio dorsal 20–30°. Martelo: tala de Stack 6–8 semanas. Boutonnière: tala da IFP em extensão 6 semanas, IFD livre. Jersey: tala em posição segura até a cirurgia."],
        clinic: [
          "1 semana: tala, pele, movimento; 3 semanas: fora o buddy taping da IFP, exercícios; 6–8 semanas: teste do martelo e desmame.",
          "IFP que ficou rígida em flexão (contratura) após 6 semanas: órtese dinâmica de extensão e terapia da mão; cirurgia (liberação) só após 6 meses.",
          "Martelo que falhou após 8 semanas bem feitas: mais 6 semanas de tala ou cirurgia (artrodese da IFD) só se incomoda muito — eletivo.",
          "Pescoço de cisne tardio (martelo antigo) e boutonnière crônico: cirurgia da mão, eletivo.",
        ],
        refer: ["Sai da sua mão: luxação irredutível ou aberta complexa (hoje), fratura-luxação da IFP instável e martelo ósseo com subluxação ou > 1/3 (cirurgia da mão em dias), jersey finger (7–10 dias — é a urgência relativa deste tópico), flexor cortado, colateral do polegar instável e nervo digital cortado (cirurgia da mão em 1–2 semanas)."],
        leave: "Escritório: 0–7 dias; braçal: 3–4 semanas (luxação/martelo), 8–12 semanas (tendão operado).",
        followup: "1 semana; 3 semanas; 6–8 semanas.",
        pearls: [
          "Todo dedo “torcido jogando bola” precisa de dois testes: estica a ponta sozinha? dobra a ponta sozinha? São 10 segundos e evitam o martelo e o jersey perdidos.",
          "A tala do martelo funciona se a ponta não dobrar nenhuma vez em 6 semanas. Um dobrar zera o relógio — diga assim.",
        ],
        sources: ["ASSH — PIP joint dislocations; Mallet finger; Flexor tendon injuries", "BSSH — Mallet finger guideline", "Elson test (JBJS 1986)", "Leddy & Packer — FDP avulsion classification"],
      },
      {
        slug: "ferimentos-da-mao-unha-e-ponta-do-dedo",
        title: "Ferimentos da mão, unha e ponta do dedo",
        aliases: ["corte na mão", "esmagou o dedo na porta", "unha arrancada", "hematoma embaixo da unha", "amputação da ponta do dedo", "mordedura", "ferida na mão", "lesão de tendão"],
        cid: "S61.0 / S61.1 / S68.1 / S67.0",
        summary: "A ponta do dedo esmagada, a unha arrancada e o hematoma subungueal são seus: bloqueio digital, lavagem, drenar o hematoma, reparar o leito ungueal e devolver a unha como curativo; o que vai à cirurgia da mão é o tendão flexor, o nervo, a amputação com osso exposto e a mordedura profunda.",
        ask: [
          "Mecanismo (porta, martelo, faca, vidro, serra, mordedura de cão/gato/humano), hora, ambiente sujo? Vacina antitetânica? Dominância e profissão.",
          "Dormência (nervo digital), não mexe (tendão), sangramento pulsátil (artéria digital)? Parte amputada: onde está, como foi guardada?",
        ],
        exam: [
          { name: "Exame com luz, sem sangue e sem garrote demorado", how: "Lave, bloqueio digital se preciso (depois de testar a sensibilidade!), garrote de dedo (luva cortada) por no máximo 15–20 min; explore a ferida no arco de movimento — o tendão cortado com o dedo fletido some quando estendido.", positive: "Tendão visível cortado, mesmo parcial > 50% → cirurgia da mão; cápsula/articulação aberta → lavagem cirúrgica e antibiótico." },
          { name: "Tendões e nervos, antes de anestesiar", how: "FDP (flete a IFD com a média segura), FDS (flete a IFP com os outros dedos estendidos), extensores (estende cada articulação contra resistência); sensibilidade dos dois lados de cada dedo (discriminação de dois pontos < 6 mm = normal); enchimento capilar e Allen na mão.", positive: "Qualquer déficit → lesão até a exploração cirúrgica provar o contrário." },
          { name: "Unha e leito", how: "Hematoma subungueal (percentual da unha), unha solta ou avulsionada, laceração do leito visível, fratura da falange distal (tuft).", positive: "Hematoma > 50% ou unha solta → remover a unha, reparar o leito; tuft com unha lesada = fratura exposta: antibiótico." },
        ],
        alarm: [
          "Mordedura de gato (punção profunda, Pasteurella) e humana (soco no dente): antibiótico, nunca fechar, exploração se articulação ou tendão — artrite séptica e tenossinovite em 24–48 h.",
          "Tenossinovite infecciosa (dedo fusiforme, fletido, dor ao estender passivamente, trajeto doloroso — Kanavel): cirurgia hoje.",
          "Injeção de alta pressão (graxa, tinta, pistola de pressão) em dedo “que só tem um furinho”: cirurgia de desbridamento em horas — amputação em 50% se esperar.",
          "Amputação proximal à IFD, polegar, múltiplos dedos, criança: candidato a reimplante — centro de reimplante pela regulação em até 6 h de isquemia quente (12–24 h resfriado).",
        ],
        imaging: ["RX do dedo ou mão PA, oblíqua e perfil em todo esmagamento, corte com vidro (fragmento retido), mordedura (dente, fratura) e amputação (nível ósseo)."],
        urgent: [
          "Hematoma subungueal doloroso (< 48 h), unha íntegra e presa: trepanação (agulha 18G girando ou cautério) — alívio imediato; sem antibiótico se não há fratura exposta; curativo.",
          "Unha solta, laceração do leito, hematoma > 50% com unha solta: bloqueio digital, retirar a unha com cuidado (descolador sob a unha), lavar, reparar o leito com fio absorvível 6-0 (ou cola cirúrgica), recolocar a unha limpa (ou folha de alumínio/silicone) sob a prega como curativo e molde por 2–3 semanas; tuft fraturado: tala digital 2 semanas; antibiótico se fratura exposta.",
          "Amputação da polpa sem osso exposto (< 1 cm²): lavagem, hemostasia por compressão (não cauterizar), curativo com gaze não aderente e cicatrização por segunda intenção — resultado excelente em 3–6 semanas; sua.",
          "Amputação com osso exposto: lavagem, curativo, parte amputada em gaze úmida com soro dentro de saco plástico, sobre gelo (não em contato direto), raio-X, antibiótico, tétano; regulação para cirurgia da mão (encurtamento ósseo e fechamento ou retalho; reimplante nos candidatos).",
          "Corte limpo sem tendão/nervo/articulação, < 6–8 h: lavagem abundante, sutura simples com nylon 4-0/5-0 (pontos frouxos), curativo, retorno em 48 h; sujo ou tardio: lavar, não suturar, antibiótico, retorno em 48 h para fechamento tardio se limpo.",
        ],
        procedures: [
          {
            name: "Trepanação do hematoma subungueal",
            when: "Hematoma subungueal doloroso com menos de 48 h; unha presa. Não se unha solta (remova e repare o leito).",
            needs: "Agulha 18G ou cautério descartável; antissepsia; sem anestesia na maioria.",
            steps: [
              "Limpe a unha com clorexidina; marque o centro do hematoma.",
              "Agulha 18G perpendicular, girando entre os dedos como uma broca, sem pressão, até perfurar — o sangue sai e a dor some; faça 2 furos se grande.",
              "Deixe sangrar; curativo seco; mão elevada.",
            ],
            after: "Retorno só se dor ou secreção. A unha pode cair em semanas e cresce em 3–6 meses.",
          },
          {
            name: "Reparo do leito ungueal",
            when: "Unha solta, avulsionada ou laceração visível do leito; hematoma > 50% com unha instável.",
            needs: "Bloqueio digital, garrote de dedo, descolador (ou tesoura fina fechada), fio absorvível 6-0 (ou cola de cianoacrilato), gaze não aderente; raio-X antes.",
            steps: [
              "Bloqueio digital; garrote; retire a unha deslizando o descolador sob ela da ponta para a base, com cuidado para não lesar mais o leito; guarde a unha em soro.",
              "Lave; aproxime as bordas do leito com pontos 6-0 absorvíveis separados, sem tensão (ou cola); fragmento ósseo pequeno não se tira.",
              "Limpe a unha (raspe o lado de baixo), faça um furo central e recoloque sob a prega ungueal (eponíquio), fixando com 1–2 pontos ou esparadrapo; sem a unha, use folha de alumínio do envelope de sutura ou silicone.",
              "Curativo não aderente, tala digital se tuft fraturado, elevação.",
            ],
            after: "Retorno em 5–7 dias (curativo), 2–3 semanas (tirar a unha/molde). Avise que a unha nova pode vir deformada se o leito cicatrizou mal.",
          },
        ],
        plan: [
          "Antibiótico: fratura exposta de falange distal — cefalexina 500 mg 6/6 h por 5–7 dias; mordedura de cão, gato ou humana — amoxicilina-clavulanato 875/125 12/12 h por 5–7 dias (profilaxia em toda mordedura na mão), lavagem copiosa, não suturar (exceto face), elevação; raiva: avaliar conforme o animal e o protocolo (soro/vacina).",
          "Tétano em toda ferida: esquema conforme a vacina (ver Fratura exposta); ferida limpa pequena com 3 doses e < 10 anos não precisa.",
          "Curativo da polpa por segunda intenção: lavar com água e sabão 1×/dia, gaze não aderente ou vaselina, não deixar secar; 3–6 semanas; sensibilidade volta em meses.",
          "Terapia da mão cedo após qualquer tala ou sutura de tendão: a rigidez e a hipersensibilidade da ponta são as sequelas comuns.",
        ],
        rx: [
          ...ANALGESIA_BASE,
          { name: "Cefalexina 500 mg", posology: "1 comprimido de 6/6 h por 5 a 7 dias.", note: "Fratura exposta de falange distal (esmagamento com unha lesada)." },
          { name: "Amoxicilina + clavulanato 875/125 mg", posology: "1 comprimido de 12/12 h por 5 a 7 dias (profilaxia) ou 10 a 14 dias (infecção).", note: "Mordedura de cão, gato ou humana na mão. Alergia: clindamicina 300 mg 8/8 h + ciprofloxacino 500 mg 12/12 h (ou doxiciclina 100 mg 12/12 h)." },
          { name: "Vacina dT", posology: "0,5 mL IM conforme o esquema do tétano." },
        ],
        immobilize: ["Tala digital 1–2 semanas no tuft fraturado ou reparo do leito; mão em posição segura (intrínseco-plus) se precisar de tala maior; o resto não imobiliza."],
        clinic: [
          "48 h: toda ferida suturada ou mordedura (infecção?); 5–7 dias: curativo do leito; 10–14 dias: retirar pontos de pele (mão: 10–14 dias).",
          "Infecção (dor crescente, secreção, febre): abrir os pontos, cultura, antibiótico; tenossinovite ou abscesso profundo → cirurgia.",
          "Cicatriz dolorosa, neuroma da ponta, unha deformada: terapia da mão, dessensibilização; cirurgia eletiva só se limita.",
        ],
        refer: ["Sai da sua mão: tendão flexor (e extensor que você não sutura), nervo digital, artéria com dedo mal perfundido, amputação com osso exposto ou candidata a reimplante (cirurgia da mão / centro de reimplante — horas), injeção de alta pressão e tenossinovite infecciosa (hoje), mordedura com articulação ou tendão (lavagem cirúrgica em 24 h), perda de pele que precisa de retalho."],
        leave: "Corte simples: 0–3 dias; leito ungueal ou tuft: 7–14 dias; braçal com mão dominante: 2–3 semanas.",
        followup: "48 h (ferida), 5–7 dias, 2–3 semanas.",
        pearls: [
          "Teste tendão e nervo ANTES do bloqueio e anote: depois, “não mexe” e “não sente” viram efeito da anestesia.",
          "Ponta de dedo sem osso exposto não precisa de retalho nem de enxerto — precisa de curativo e tempo. É a lesão em que menos é mais.",
        ],
        sources: ["ASSH — Fingertip injuries; Nail bed injuries; Bite wounds", "BSSH — Nail bed injury guideline", "IDSA — Skin and soft tissue infections 2014 (bites)", "Ministério da Saúde — Profilaxia da raiva e do tétano"],
      },
    ],
  },
];
