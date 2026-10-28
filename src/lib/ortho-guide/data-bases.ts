import type { OrthoTopic } from "./types.ts";
import { ANALGESIA_BASE } from "./rx-base.ts";

/**
 * As páginas de base do plantão — o que o ortopedista de plantão no SUS
 * precisa saber antes do primeiro paciente, além das cinco de data.ts: como
 * funciona a regulação (quem vai para a cirurgia e como pedir a vaga), a
 * anestesia local, os bloqueios e a sedação para reduzir, e a punção e a
 * infiltração articular. Sem CID, como as outras de base.
 */
export const BASES_DO_PLANTAO: readonly OrthoTopic[] = [
  {
    slug: "regulacao-e-cirurgia-no-sus",
    title: "Regulação no SUS: quem vai para a cirurgia e como pedir",
    aliases: ["regulação", "vaga zero", "SISREG", "CROSS", "transferência", "centro terciário", "como encaminhar para cirurgia", "AIH", "TFD", "NIR"],
    cid: "—",
    summary: "Você é o ortopedista do serviço: o que você não opera vai ao cirurgião ou ao hospital de referência pela regulação — urgência pela central (vaga zero quando é hoje), eletivo pelo SISREG/CROSS ou pelo NIR — e o pedido bem escrito é o que faz a vaga sair.",
    ask: [
      "É urgência (horas) ou pode esperar dias? Fratura exposta, luxação irredutível, membro sem pulso, compartimental, séptica e cauda equina são horas; a maioria das fraturas fechadas que vão operar pode esperar 2 a 7 dias em casa ou enfermaria, bem imobilizada.",
      "O seu hospital tem cirurgião ortopédico de sobreaviso, centro cirúrgico e anestesista? Se tem, o caso é interno: acione o sobreaviso. Se não tem, é transferência.",
      "O paciente tem como voltar para o retorno? Quem mora longe entra no TFD (tratamento fora de domicílio) para transporte e, se preciso, estadia.",
    ],
    exam: [
      {
        name: "O laudo de regulação que consegue vaga",
        how: "Escreva em 8 linhas: identificação e idade; mecanismo e hora do trauma; o diagnóstico com lado e a classificação (“fratura exposta Gustilo II de tíbia D”); estado neurovascular distal com horário; o que você já fez (redução, tala, antibiótico, analgesia, tétano, jejum desde que horas); comorbidades e anticoagulante; o que pede (“cirurgia ortopédica com urgência — desbridamento em até 24 h”); seu nome, CRM e telefone de contato.",
        positive: "Laudo sem classificação, sem neurovascular ou sem o que já foi feito volta com pedido de complementação e o paciente perde horas.",
      },
      {
        name: "Vaga zero",
        how: "Quando é urgência com risco de vida ou de membro e não há vaga, o regulador pode mandar mesmo assim (“vaga zero”) — o hospital de referência não pode recusar (Portaria 2.048/2002, Resolução CFM 2.077/2014). Você pede à central de regulação de urgências (pelo SAMU 192 ou pela central da sua região) e registra o número do protocolo no prontuário.",
        positive: "Recusa verbal do hospital de destino não existe para urgência: insista com o regulador e anote nomes e horários.",
      },
    ],
    alarm: [
      "Não deixe o paciente esperando a vaga sem tratar: antibiótico da fratura exposta, redução da luxação, abertura do gesso apertado e analgesia são suas, agora, enquanto a regulação acontece.",
      "Transporte: paciente com fratura de fêmur, pelve instável, luxação reduzida de quadril ou suspeita de lesão de coluna vai de ambulância com maca, imobilizado — nunca “de carro com a família”.",
      "Criança com fratura que não bate com a história, fraturas em várias idades ou fratura de fêmur em quem não anda: além da regulação, notifique (ficha do SINAN e Conselho Tutelar — Lei 13.431/2017). É obrigatório e protege a criança.",
    ],
    imaging: [
      "Mande as imagens junto: foto do raio-X no celular, laudo e, quando possível, o CD. O destino decide a vaga pela imagem.",
      "Tomografia antes de transferir só se muda o destino ou o transporte (coluna, pelve, articular complexa) e se você a tem; não atrase a transferência de urgência por exame que o destino vai repetir.",
    ],
    urgent: [
      "Urgência cirúrgica (hoje): fratura exposta, luxação que você não reduziu, membro sem pulso ou com compartimental, artrite séptica, cauda equina, fratura de quadril, supracondiliana desviada na criança, luxação de quadril ou de joelho. Estabilize, trate o que é seu e peça vaga pela central de urgências com o laudo.",
      "Cirurgia em dias (eletiva de urgência): rádio distal desviado, tornozelo instável, clavícula com indicação, úmero proximal desviado, metacarpo com rotação, patela desviada, Aquiles roto. O paciente vai para casa imobilizado, em jejum só no dia, com o laudo e o pedido no SISREG/CROSS ou no NIR do hospital, e retorno marcado para conferir se a vaga saiu.",
      "Internação (AIH): quem vai operar aqui ou aguarda transferência, idoso com fratura de quadril, fratura de fêmur ou pelve, infecção. Preencha a AIH com o CID da fratura (S…) e o procedimento; o NIR faz o resto.",
    ],
    plan: [
      "Eletivo ambulatorial (meses): prótese de quadril e joelho, artroscopia, túnel do carpo, hálux valgo, Dupuytren. Pedido pelo SISREG (ou CROSS em SP) com CID, resumo e o que já fez — fisioterapia e infiltração contam como “tratamento conservador cumprido” e aceleram a fila.",
      "Outras especialidades pela mesma regulação: cirurgia da mão (tendão, nervo, reimplante), vascular (pulso ausente), neurocirurgia (coluna com déficit), cirurgia pediátrica/ortopedia pediátrica, reumatologia, fisiatria. Escreva para quem é.",
      "Fisioterapia no SUS: encaminhe por escrito para a unidade de referência (ou o CER — Centro Especializado em Reabilitação) com diagnóstico, o que pode e o que não pode fazer (“carga parcial, sem flexão > 90° por 6 semanas”). Enquanto espera, entregue os exercícios em casa.",
      "Órteses e próteses (OPM): bota, tala, muleta, cadeira de rodas, colete e palmilha saem pelo CER ou pela farmácia de OPM do município com o seu pedido e o CID; quando não há, a tala gessada substitui a bota e a órtese de punho.",
      "TFD: paciente de outro município que precisa de cirurgia na referência — o pedido (laudo + formulário do TFD) sai da sua unidade; o município paga transporte e ajuda de custo.",
    ],
    rx: [],
    clinic: [
      "No retorno, confira se a vaga saiu (o paciente costuma não saber): pergunte, ligue para o NIR, reescreva o pedido se devolvido.",
      "Mantenha o tratamento enquanto espera: tala bem feita, raio-X de controle na data, analgesia, profilaxia de trombose se imobilizou a perna. Fratura que consolida torta por espera de 6 semanas é responsabilidade de quem seguiu.",
      "Pós-operatório que volta para você: ferida (curativo, pontos em 10–14 dias), raio-X na data do cirurgião, fisioterapia, atestado — e qualquer febre, secreção ou dor nova é ligação para o cirurgião no mesmo dia.",
    ],
    refer: ["Sai da sua mão: tudo o que precisa de centro cirúrgico que você não tem, de especialidade que você não é, ou de UTI. Urgência: central de regulação de urgências (vaga zero se preciso). Eletivo: SISREG/CROSS ou NIR. Sempre com laudo, imagem e o que você já fez."],
    leave: "Atestado do dia e dos dias até a cirurgia, com a restrição (“sem apoiar o membro direito”).",
    followup: "7 dias após qualquer pedido de regulação, para conferir se saiu; antes se piorar.",
    pearls: [
      "A frase que destrava vaga é a classificação com o risco: “Gustilo III”, “Gartland III”, “tornozelo instável com desvio talar”, “pulso ausente há 2 h”. Sem ela, o regulador lê “fratura” e põe na fila.",
      "Anote no prontuário hora do pedido, protocolo e nome do regulador. É o que vale se der problema.",
    ],
    sources: ["Portaria GM/MS 2.048/2002 (urgência e vaga zero)", "Portaria GM/MS 1.559/2008 (Política Nacional de Regulação)", "Resolução CFM 2.077/2014", "Portaria SAS 55/1999 (TFD)", "Lei 13.431/2017 e ECA art. 13 (notificação)"],
  },
  {
    slug: "anestesia-local-bloqueios-e-sedacao",
    title: "Anestesia local, bloqueios e sedação para reduzir",
    aliases: ["bloqueio de hematoma", "bloqueio digital", "bloqueio do nervo femoral", "fáscia ilíaca", "sedação", "cetamina", "lidocaína", "anestesia para redução", "dose máxima de lidocaína"],
    cid: "—",
    summary: "Para reduzir e suturar você precisa de três coisas que faz sozinho — bloqueio de hematoma, bloqueio digital e infiltração local — e de uma que só faz com monitorização e uma segunda pessoa: a sedação.",
    ask: [
      "Alergia a anestésico local (rara; quase sempre foi reação vasovagal ou à adrenalina)? Peso (a dose máxima é por kg)? Hepatopatia, arritmia, uso de antiarrítmico (lidocaína)?",
      "Para sedar: comeu há quanto tempo? Vias aéreas difíceis (pescoço curto, barba, apneia do sono)? Cardiopatia, hipertensão descontrolada, psicose (cetamina), idoso frágil (dose menor)?",
      "Quem fica com você? Sedação é com dois: um sedando e vigiando, outro reduzindo.",
    ],
    exam: [
      {
        name: "Dose máxima do anestésico local",
        how: "Lidocaína sem vasoconstritor: 4–5 mg/kg (adulto de 70 kg: 300 mg = 30 mL a 1% ou 15 mL a 2%). Com adrenalina: 7 mg/kg. Bupivacaína 0,25–0,5%: 2 mg/kg (máx. 175 mg sem vaso). Some tudo o que vai usar (bloqueio + infiltração) antes de começar.",
        positive: "Zumbido, gosto metálico, dormência perioral, agitação ou sonolência → intoxicação: pare, oxigênio, chame ajuda; convulsão → midazolam; colapso → emulsão lipídica 20% 1,5 mL/kg em bolus.",
      },
      {
        name: "Checagem antes de sedar",
        how: "Monitor (oxímetro, pressão, cardioscópio), oxigênio, aspirador, bolsa-válvula-máscara e material de via aérea testados; acesso venoso; jejum conhecido (sedação leve para redução não exige jejum formal, mas anote); escala de sedação e sinais vitais a cada 5 minutos.",
        positive: "Saturação < 92%, apneia, laringoespasmo (cetamina) → interrompa, ventile, chame o anestesista.",
      },
    ],
    alarm: [
      "Nunca anestésico com vasoconstritor em bloqueio de hematoma, nem em dedo na prática do serviço (a evidência moderna aceita adrenalina em dedo, mas o protocolo da maioria dos serviços brasileiros ainda não — siga o seu).",
      "Bloqueio de hematoma em fratura exposta ou pele infectada: contraindicado (leva infecção ao foco).",
      "Sedação sem monitorização, sem oxigênio ou sozinho: não. Se o serviço não tem estrutura ou anestesista de sobreaviso, reduza com bloqueio e analgesia EV, ou transfira.",
      "Cetamina: evite em hipertensão grave, cardiopatia isquêmica, psicose, glaucoma agudo, < 3 meses; laringoespasmo é raro mas acontece — tenha a máscara na mão.",
    ],
    imaging: ["Raio-X antes de qualquer redução (exclui fratura que muda a técnica) e depois (confirma a redução). A única exceção é o membro sem pulso ou com pele em sofrimento: reduza primeiro."],
    urgent: [
      "Redução de rádio distal, metacarpo e falange: bloqueio de hematoma ou digital, 10–15 minutos de espera, e reduza. Não precisa de sedação na maioria dos adultos.",
      "Luxação de ombro: lidocaína intra-articular 20 mL a 1% (tão eficaz quanto sedação, com alta mais rápida) ou sedação. Cotovelo, quadril, joelho e tornozelo: sedação (ou anestesista); uma tentativa boa vale mais que três ruins.",
      "Fratura de quadril ou de fêmur aguardando cirurgia: bloqueio da fáscia ilíaca ou do nervo femoral — é o padrão de analgesia (NICE), reduz opioide e delirium. Faça ao internar, com monitorização.",
      "Criança: sedação é com pediatra ou anestesista, exceto pronação dolorosa (sem anestesia). Analgesia antes de qualquer manipulação: dipirona ou cetorolaco EV e, na fratura, morfina 0,05–0,1 mg/kg EV ou intranasal de fentanil 1,5 mcg/kg conforme o protocolo.",
    ],
    procedures: [
      {
        name: "Bloqueio de hematoma (fratura do rádio distal e similares)",
        when: "Fratura fechada com menos de 24–48 h, para reduzir ou para tolerar a tala. Não em fratura exposta nem pele infectada.",
        needs: "Clorexidina, luva estéril, seringa 20 mL, agulha 22G, lidocaína 1% sem vaso 10–15 mL.",
        steps: [
          "Antissepsia ampla no dorso do punho; localize o foco pela dor e pelo raio-X.",
          "Entre pelo dorso, entre os tendões extensores, em direção ao foco; aspire — sangue escuro confirma que está no hematoma.",
          "Injete 10–15 mL devagar; complemente 2–3 mL em volta do estiloide ulnar se dói.",
          "Espere 10–15 minutos (use para montar a tala e o pedido de raio-X). Reduza.",
        ],
        after: "Anote hora e dose. Tala, raio-X de controle, orientação escrita.",
      },
      {
        name: "Bloqueio digital",
        when: "Qualquer dedo: redução, sutura, unha, drenagem. Não se infecção na base do dedo.",
        needs: "Lidocaína 1–2% sem vaso, agulha 25–27G, seringa 5 mL.",
        steps: [
          "Pela face dorsal da base do dedo, agulha perpendicular junto ao osso, aspire e injete 1–1,5 mL de cada lado (nervos digitais dorsal e palmar), retirando a agulha para o lado palmar; total 2–4 mL por dedo.",
          "Alternativa de uma só punção: transtecal — 2 mL na bainha do flexor na prega palmar distal, com o dedo em extensão.",
          "Espere 5–10 minutos; teste com pinça antes de começar.",
        ],
        after: "Avise que a dormência dura 1–3 horas; sem garrote por mais de 20 minutos.",
      },
      {
        name: "Bloqueio da fáscia ilíaca (analgesia da fratura de quadril e fêmur)",
        when: "Fratura de colo ou transtrocantérica, diáfise de fêmur, aguardando cirurgia. Monitorizado, com acesso venoso.",
        needs: "Bupivacaína 0,25% 30–40 mL (máx. 2 mg/kg) ou ropivacaína 0,375%, agulha 22G 50–80 mm de bisel curto, antissepsia; ultrassom se houver (preferível).",
        steps: [
          "Trace a linha da espinha ilíaca anterossuperior ao tubérculo púbico; marque a junção do terço lateral com os dois terços mediais; o ponto é 1 cm abaixo dela.",
          "Agulha perpendicular à pele: sinta dois “cliques” (fáscia lata e fáscia ilíaca). Aspire.",
          "Injete 30–40 mL em frações de 5 mL, aspirando entre elas; a resistência baixa quando está no plano certo.",
          "Efeito em 15–30 minutos, dura 6–12 horas; pode repetir a cada 12 h com a dose máxima respeitada.",
        ],
        after: "Anote dose, hora e sinais vitais; mantenha dipirona fixa. Sem efeito em 30 min: bloqueio fora do plano — não repita acima da dose.",
      },
      {
        name: "Sedação para redução (adulto, com monitorização e segunda pessoa)",
        when: "Luxação de cotovelo, quadril, joelho, tornozelo, ombro que não cedeu ao bloqueio, fratura que precisa de tração sustentada.",
        needs: "Monitor, oxigênio, aspirador, bolsa-máscara, acesso venoso; cetamina, midazolam, propofol e os antídotos (flumazenil, naloxona) conforme o protocolo do serviço.",
        steps: [
          "Esquema mais usado para redução: cetamina 0,5–1 mg/kg EV lento (ou 4 mg/kg IM) — analgesia e dissociação, mantém via aérea; pode associar midazolam 0,03–0,05 mg/kg para a agitação ao despertar.",
          "Alternativa: propofol 0,5–1 mg/kg EV em bolus lento, repetindo 0,25–0,5 mg/kg a cada 1–2 min (apneia e hipotensão: só com quem sabe ventilar). Midazolam 0,05–0,1 mg/kg + fentanil 1 mcg/kg é mais lento e deprime mais a respiração.",
          "Reduza com o paciente relaxado (1–2 min após a dose). Uma tentativa, firme e lenta.",
          "Observe até acordar, sentar e beber sem náusea; sem dirigir por 24 h; acompanhante obrigatório.",
        ],
        after: "Registre drogas, doses, horários, sinais vitais a cada 5 min e o estado neurovascular antes e depois.",
      },
    ],
    plan: [
      "Analgesia EV no plantão: dipirona 1–2 g EV lenta; cetorolaco 30 mg EV (15 mg em > 65 anos ou renal; dose única); morfina 2–4 mg EV a cada 5–10 min até controlar (0,05–0,1 mg/kg); tramadol 100 mg EV lento com antiemético. Fratura dói: medique antes do raio-X.",
      "Infiltração local para sutura: lidocaína 1–2% com ou sem adrenalina (com adrenalina sangra menos em couro cabeludo e face; evite em ponta de nariz e orelha no serviço que não usa), agulha fina, injete ao retirar; bicarbonato 1 mL para 9 mL de lidocaína reduz a ardência.",
      "Criança: lidocaína 1% máximo 4 mg/kg (0,4 mL/kg); anestésico tópico (lidocaína-prilocaína) 45–60 minutos antes para punções; a presença dos pais e a distração valem como analgesia.",
      "Depois de qualquer bloqueio ou sedação, o exame neurovascular é repetido e anotado — o que estava dormente antes não pode virar “culpa do bloqueio”.",
    ],
    rx: [...ANALGESIA_BASE],
    clinic: [
      "No ambulatório, bloqueio digital e infiltração local servem para dedo em gatilho, De Quervain, unha e pequenas suturas; não precisa de pronto-socorro.",
      "Paciente que foi sedado volta em 24–48 h ou liga: náusea, sono excessivo ou dor nova são motivo de reavaliar.",
    ],
    refer: ["Sai da sua mão: sedação em criança (pediatra/anestesista), paciente ASA III–IV ou via aérea difícil (anestesista), redução que falhou com sedação adequada (cirurgia sob anestesia geral — regulação), intoxicação por anestésico (UTI)."],
    leave: "O da condição; some 1 dia após sedação (não dirigir, não trabalhar em altura ou máquina).",
    followup: "O da fratura ou luxação reduzida; 24 h por telefone após sedação.",
    pearls: [
      "A lidocaína a 1% tem 10 mg/mL; a 2%, 20 mg/mL. Para a mesma dose em mg, a 1% dá o dobro do volume — e volume é o que faz o bloqueio de hematoma funcionar.",
      "Reduzir ombro com lidocaína intra-articular: 20 mL a 1% pela via posterior (2 cm abaixo e 1 cm medial ao ângulo posterolateral do acrômio, em direção ao processo coracoide). Espere 15 minutos.",
    ],
    sources: ["ACEP — Procedural sedation and analgesia 2014/2019", "NICE NG124 (nerve blocks in hip fracture)", "BOAST — Fragility hip fracture (fascia iliaca block)", "Bulas (Anvisa): lidocaína, bupivacaína, cetamina, propofol, midazolam", "AAGBI — Local anaesthetic toxicity"],
  },
  {
    slug: "puncao-e-infiltracao-articular",
    title: "Punção e infiltração: joelho, ombro, punho e mão, quadril",
    aliases: ["artrocentese", "punção articular", "infiltração de corticoide", "triancinolona", "infiltrar o joelho", "infiltração subacromial", "infiltração do túnel do carpo", "infiltração do dedo em gatilho", "como infiltrar"],
    cid: "—",
    summary: "A punção é o exame da articulação quente e o alívio do derrame tenso; a infiltração de corticoide é o seu tratamento de ombro, joelho, túnel do carpo, dedo em gatilho, De Quervain e trocanter — técnica simples, assepsia rigorosa e no máximo 3 por articulação por ano.",
    ask: [
      "Diabetes (a glicemia sobe por 2–5 dias após corticoide)? Anticoagulante (não contraindica a punção; comprima mais)? Alergia a anestésico? Infecção de pele no caminho da agulha (contraindica)?",
      "Já infiltrou esta articulação, quando e quantas vezes? Prótese no local (não infiltrar: risco de infecção da prótese; punção só para cultura, com o cirurgião)?",
      "Vai operar nos próximos 3 meses? Corticoide intra-articular até 3 meses antes de prótese aumenta infecção.",
    ],
    exam: [
      {
        name: "O que fazer com o líquido",
        how: "Observe cor e viscosidade. Mande: celularidade com diferencial, Gram e cultura (frasco estéril), pesquisa de cristais (tubo com heparina ou seco, microscopia polarizada), glicose se possível. Nunca jogue fora o líquido de uma articulação quente.",
        positive: "Turvo ou purulento, > 50.000 células com > 90% neutrófilos → séptica até a cultura: antibiótico EV após a coleta e drenagem (ver Monoartrite). 2.000–50.000 → inflamatório (gota, pseudogota, reumatoide). < 2.000, claro → mecânico. Sangue → hemartrose (fratura, LCA, anticoagulado).",
      },
    ],
    alarm: [
      "Articulação quente + febre: puncione e colha antes de qualquer antibiótico; não infiltre corticoide em dúvida de infecção.",
      "Dor, calor e febre 24–72 h depois de uma infiltração: artrite séptica pós-infiltração (rara, mas é sua) — punção, cultura, antibiótico EV e cirurgião.",
      "Hemartrose após trauma com raio-X normal: ressonância (LCA, osteocondral) — a punção alivia e diagnostica (gordura no sangue = fratura).",
    ],
    imaging: ["Raio-X antes de infiltrar artrose (grau e exclusão de outra coisa); ultrassom guia quadril, ombro glenoumeral e infiltrações de tendão quando disponível — no joelho e subacromial a técnica por referência anatômica funciona."],
    urgent: [
      "Joelho quente que chegou no plantão: punção agora, líquido para o laboratório, e a conduta sai da contagem — séptica interna; gota ou pseudogota trata e vai para casa com retorno.",
      "Derrame tenso e doloroso após trauma: esvaziar (hemartrose) alivia e permite examinar os ligamentos; infiltrar 5–10 mL de lidocaína 1% depois ajuda o exame.",
      "Bursite pré-patelar ou do olécrano tensa: punção (cultura se quente), compressão; infecção → antibiótico (ver Cisto de Baker e bursites).",
    ],
    procedures: [
      {
        name: "Punção e infiltração do joelho — via superolateral",
        when: "Derrame a esclarecer ou a esvaziar; artrose em crise; pseudogota. Não com celulite sobre o local, nem prótese.",
        needs: "Clorexidina alcoólica, campo e luva estéril, lidocaína 1% 3–5 mL (pele), agulha 18–21G 40 mm para punção (21G para infiltrar), seringas 20–60 mL, frascos; para infiltrar: triancinolona 40 mg (1 mL) ou metilprednisolona 40 mg + lidocaína 1% 4–5 mL.",
        steps: [
          "Paciente deitado, joelho estendido (ou 15–20° com rolo), quadríceps relaxado. Marque 1 cm acima e 1 cm lateral ao ângulo superolateral da patela.",
          "Antissepsia ampla; botão anestésico na pele.",
          "Agulha horizontal, levemente para baixo e para o meio, por baixo da patela em direção ao centro; aspire ao avançar. Líquido vem fácil quando há derrame; se não vem, mobilize a patela com a outra mão e comprima a bolsa suprapatelar.",
          "Esvazie o que der (troque a seringa mantendo a agulha); depois, sem tirar a agulha, injete o corticoide com o anestésico.",
          "Curativo, compressão e repouso relativo por 24–48 h.",
        ],
        after: "Anote volume e aspecto; alívio do corticoide em 2–7 dias, dura 4–8 semanas; máximo 3–4 por ano. Diabético confere glicemia por 3 dias.",
      },
      {
        name: "Infiltração subacromial — via posterior",
        when: "Síndrome do impacto, bursite, tendinopatia do manguito e tendinite calcária que não melhoram com fisioterapia; também como teste (dor some = origem subacromial).",
        needs: "Triancinolona 20–40 mg ou metilprednisolona 40 mg + lidocaína 1% 5–8 mL; agulha 21–22G 40 mm.",
        steps: [
          "Sentado, braço pendente. Ponto: 2 cm abaixo e 1 cm medial ao ângulo posterolateral do acrômio (o “canto” que você palpa).",
          "Agulha para a frente e levemente para cima, em direção ao processo coracoide (sinta o espaço sob o acrômio); se bater no osso, recue e redirecione para baixo.",
          "Injete sem resistência (resistência = está no tendão: recue 2–3 mm). Mova o braço depois para espalhar.",
        ],
        after: "Fisioterapia começa em 1 semana — a infiltração é a ponte. Máximo 2–3 por ano. Nunca no tendão do bíceps ou no Aquiles.",
      },
      {
        name: "Infiltração do túnel do carpo",
        when: "Síndrome do túnel do carpo leve a moderada, gestante, ponte para a cirurgia. Não se atrofia tenar (é cirurgia).",
        needs: "Metilprednisolona 40 mg ou triancinolona 20 mg + lidocaína 1% 1 mL; agulha 25–27G 25 mm.",
        steps: [
          "Punho em leve extensão, palma para cima. Ponto: 1 cm proximal à prega distal do punho, ulnar ao tendão do palmar longo (peça para opor polegar e mínimo com o punho fletido para vê-lo; sem palmar longo, 1 cm ulnar à linha média).",
          "Agulha a 30–45° em direção distal, avance 1–2 cm até passar o retináculo (leve “clique”).",
          "Parestesia em choque = encostou no nervo: recue e redirecione mais ulnar. Injete sem resistência.",
        ],
        after: "Órtese noturna continua. Alívio em dias; repetir no máximo uma vez. Sem melhora em 6 semanas: eletroneuromiografia e cirurgia.",
      },
      {
        name: "Infiltração do dedo em gatilho (polia A1) e do De Quervain",
        when: "Dedo em gatilho que trava; De Quervain sem melhora em 2–4 semanas de órtese (ou já na primeira consulta na lactante).",
        needs: "Triancinolona 10 mg (gatilho) ou 10–20 mg (De Quervain) + lidocaína 1% 0,5–1 mL; agulha 25–27G.",
        steps: [
          "Gatilho: nódulo da polia A1 na palma, sobre a cabeça do metacarpo (prega palmar distal nos dedos; prega metacarpofalângica no polegar). Agulha a 45° distal, até sentir a bainha; se o dedo fletido mexe a agulha, está no tendão: recue 1–2 mm e injete sem resistência.",
          "De Quervain: palpe o 1º compartimento sobre o estiloide radial; peça extensão do polegar para ver os tendões; agulha paralela aos tendões, proximal, dentro da bainha (o líquido corre ao longo do compartimento). Fique subcutâneo o mínimo possível (atrofia e despigmentação da pele).",
        ],
        after: "Resolução em 1–3 semanas; segunda dose após 6 semanas se recidivar; falha de duas → cirurgia (liberação da polia / abertura do compartimento).",
      },
      {
        name: "Infiltração peritrocantérica",
        when: "Síndrome dolorosa do grande trocanter que impede o exercício.",
        needs: "Triancinolona 40 mg ou metilprednisolona 40 mg + lidocaína 1% 5–8 mL; agulha 22G 50–90 mm (obeso: longa).",
        steps: [
          "Decúbito lateral, lado doente para cima, quadril levemente fletido. Marque o ponto de máxima dor sobre o trocanter.",
          "Agulha perpendicular até tocar o osso; recue 2 mm e injete em leque (3–4 direções) ao redor do ponto.",
        ],
        after: "Exercício de glúteo começa em 1 semana — infiltração sem exercício recidiva. Máximo 2–3 por ano.",
      },
    ],
    plan: [
      "Assepsia como cirurgia pequena: clorexidina alcoólica, luva estéril, agulha nova para cada entrada, não toque o trajeto. Infecção pós-infiltração é 1 em 10–50 mil quando a técnica é limpa.",
      "Corticoides: triancinolona (40 mg/mL) dura mais e atrofia mais a pele — fique dentro da articulação ou bursa; metilprednisolona 40 mg é a alternativa; betametasona 6 mg (dipropionato + fosfato) serve para tendão/bainha. Nunca em tendão de carga (Aquiles, patelar, quadríceps).",
      "Anestésico junto: lidocaína 1% 2–8 mL conforme o espaço — dá o alívio imediato que confirma o alvo. Avise que a dor pode piorar 24–48 h (reação ao cristal) antes de melhorar.",
      "Contraindicações: infecção local ou sistêmica, prótese, fratura intra-articular, articulação instável, anticoagulação descompensada (INR > 3,5), mais de 3 infiltrações no ano na mesma articulação.",
      "Ácido hialurônico: efeito pequeno no joelho e caro; sem ele no SUS, não é perda. PRP: sem evidência para indicar.",
    ],
    rx: [...ANALGESIA_BASE],
    clinic: [
      "Marque o retorno em 2–4 semanas para medir a resposta: alívio bom = continuar a fisioterapia e repetir só se recidivar; alívio nenhum = o diagnóstico ou o alvo estavam errados.",
      "Registre em cada infiltração: articulação, droga, dose, data — é o que permite dizer “já são 3 este ano” e indicar a cirurgia na hora certa.",
    ],
    refer: ["Sai da sua mão: artrite séptica (drenagem cirúrgica), infiltração guiada por imagem que você não tem (quadril, facetas, sacroilíaca — radiologia intervencionista pela regulação), infecção de prótese (cirurgião da prótese, sem antibiótico antes da cultura)."],
    leave: "1–2 dias após infiltração de articulação de carga; 0 nas demais.",
    followup: "2–4 semanas; 48 h se dor crescente, calor ou febre.",
    pearls: [
      "Joelho que “não tem líquido” mas tem tecla: comprima a bolsa suprapatelar com a mão livre enquanto aspira — o líquido vem.",
      "Infiltrou e a dor sumiu na hora, mas voltou em 2 horas: o anestésico confirmou o alvo; o corticoide ainda vai agir em 2–7 dias. Explique antes, não depois.",
    ],
    sources: ["AAOS — Joint aspiration and injection", "ACR — Synovial fluid analysis", "BSR/BOA — Hot swollen joint", "Cochrane — Intra-articular corticosteroid for knee OA; Corticosteroid injection for CTS; Trigger finger; De Quervain", "LEAP trial (BMJ 2018)"],
  },
];
