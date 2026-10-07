import { searchKey } from "./normalize.ts";
import EXTRA from "./clinical-terms-extra.json" with { type: "json" };
import CLAUDE from "./clinical-terms-claude.json" with { type: "json" };

/**
 * O vocabulário do Guia clínico: para cada condição, os outros nomes que o
 * médico usa (sinônimo, nome popular, grafia comum, sigla) e os sintomas como
 * o paciente conta e como o médico anota. Serve para a busca das três abas e
 * para a Super Inteligência acharem o tópico certo mesmo quando a pergunta é
 * vaga ("dor de cabeça latejante com enjoo", "migranha", "ardência pra
 * urinar").
 *
 * Uma condição vale para todos os itens cujo título casa com algum dos
 * `match` (no começo de uma palavra, sem acento: "asma" casa com "Crise
 * asmática"); um item pode juntar o vocabulário de mais de uma condição.
 * Nada daqui aparece como texto do guia — é só para achar.
 */
export interface ConditionTerms {
  match: readonly string[];
  /** Outros nomes: sinônimos, nomes populares, grafias comuns, siglas. */
  names: readonly string[];
  /** Sintomas e queixas, do jeito do paciente e do jeito do prontuário. */
  symptoms: readonly string[];
}

export const CONDITION_TERMS: readonly ConditionTerms[] = [
  /* ── Coração e vasos ─────────────────────────────────────────── */
  {
    match: ["supraventricular"],
    names: ["TSV", "taquicardia paroxística supraventricular", "TPSV", "reentrada nodal", "taquiarritmia"],
    symptoms: ["palpitação", "coração disparado", "coração acelerado", "batedeira", "taquicardia de início e fim súbitos", "tontura", "desconforto no peito", "falta de ar"],
  },
  {
    match: ["taquicardia ventricular"],
    names: ["TV", "TV monomórfica", "TV polimórfica", "torsades de pointes", "arritmia ventricular", "taquiarritmia de QRS largo"],
    symptoms: ["palpitação", "desmaio", "síncope", "tontura", "dor no peito", "pressão baixa", "QRS largo"],
  },
  {
    match: ["fibrilacao atrial", "flutter"],
    names: ["FA", "FA de alta resposta", "flutter atrial", "arritmia", "coração irregular", "fibrilação"],
    symptoms: ["palpitação", "pulso irregular", "coração descompassado", "coração acelerado", "cansaço", "falta de ar", "tontura"],
  },
  {
    match: ["bradiarritmia"],
    names: ["bradicardia", "BAV", "bloqueio atrioventricular", "BAVT", "bloqueio AV total", "marcapasso", "coração lento"],
    symptoms: ["pulso lento", "frequência cardíaca baixa", "desmaio", "síncope", "tontura", "fraqueza", "cansaço", "confusão"],
  },
  {
    match: ["coronariana"],
    names: ["SCA", "infarto", "enfarte", "IAM", "infarto agudo do miocárdio", "IAM com supra de ST", "IAMCSST", "IAMSSST", "angina instável", "ataque cardíaco", "isquemia do coração"],
    symptoms: ["dor no peito", "aperto no peito", "dor torácica em aperto", "dor no peito que vai para o braço esquerdo", "dor na mandíbula", "suor frio", "sudorese", "náusea", "falta de ar", "dor na boca do estômago em idoso ou diabético"],
  },
  {
    match: ["insuficiencia cardiaca", "edema agudo"],
    names: ["ICAD", "IC descompensada", "ICC", "insuficiência cardíaca congestiva", "EAP", "edema agudo de pulmão", "água no pulmão", "coração fraco", "congestão"],
    symptoms: ["falta de ar", "dispneia", "falta de ar deitado", "ortopneia", "acorda sem ar à noite", "dispneia paroxística noturna", "pernas inchadas", "edema de membros inferiores", "tosse com espuma rosada", "estertores", "crepitações", "ganho de peso rápido"],
  },
  {
    match: ["hipertensiva", "hipertensao", "pressao alta", "has"],
    names: ["crise hipertensiva", "pico hipertensivo", "pressão alta", "hipertensão arterial", "HAS", "HAS descompensada", "urgência hipertensiva", "emergência hipertensiva", "hipertensão"],
    symptoms: ["pressão alta", "pressão 18 por 11", "dor de cabeça na nuca", "dor na nuca", "tontura", "visão turva", "dor no peito", "falta de ar", "sangramento nasal", "confusão"],
  },
  {
    match: ["disseccao"],
    names: ["dissecção aórtica", "dissecção de aorta", "aneurisma dissecante", "síndrome aórtica aguda"],
    symptoms: ["dor no peito rasgando", "dor em facada nas costas", "dor que irradia para as costas", "diferença de pressão entre os braços", "pulso diferente nos braços", "desmaio"],
  },
  {
    match: ["trombose venosa", "tromboembolismo"],
    names: ["TVP", "TEP", "trombose", "embolia pulmonar", "coágulo na perna", "trombo", "tromboembolismo venoso"],
    symptoms: ["perna inchada", "inchaço em uma perna só", "dor na panturrilha", "panturrilha empastada", "falta de ar súbita", "dor no peito ao respirar", "tosse com sangue", "taquicardia", "saturação baixa"],
  },

  /* ── Neurologia ──────────────────────────────────────────────── */
  {
    match: ["cefaleia"],
    names: ["dor de cabeça", "cefaléia", "cefaleia primária", "cefaleia tensional", "cefaleia do tipo tensional", "dor de cabeça de tensão", "dor de cabeça tensional"],
    symptoms: ["dor de cabeça em aperto", "dor de cabeça em pressão", "peso na cabeça", "dor dos dois lados da cabeça", "dor na nuca", "pescoço tenso", "cabeça pesada", "dor de cabeça com estresse"],
  },
  {
    match: ["enxaqueca"],
    names: ["migrânea", "migranea", "migranha", "migrania", "migraine", "hemicrania", "enxaqueca com aura", "enxaqueca sem aura", "dor de cabeça forte", "crise de enxaqueca"],
    symptoms: ["dor de cabeça latejante", "dor de cabeça pulsátil", "dor de um lado da cabeça", "dor de cabeça com enjoo", "dor de cabeça com náusea", "dor de cabeça com vômito", "luz incomoda", "fotofobia", "barulho incomoda", "fonofobia", "aura", "pontos brilhantes na vista", "visão embaçada antes da dor", "piora com esforço"],
  },
  {
    match: ["vertigem", "labirintite"],
    names: ["labirintite", "labirinto", "tontura rotatória", "VPPB", "vertigem posicional paroxística benigna", "neurite vestibular", "doença de Ménière"],
    symptoms: ["tontura", "tudo girando", "sensação de girar", "desequilíbrio", "enjoo com tontura", "vômito com tontura", "zumbido", "tontura ao virar na cama", "tontura ao levantar a cabeça", "nistagmo"],
  },
  {
    match: ["avc"],
    names: ["AVC isquêmico", "derrame", "acidente vascular cerebral", "AVE", "acidente vascular encefálico", "trombólise", "trombolítico", "alteplase", "tenecteplase", "AIT", "ataque isquêmico transitório"],
    symptoms: ["fraqueza de um lado do corpo", "boca torta", "dificuldade para falar", "fala enrolada", "perda de força súbita", "dormência de um lado", "perda de visão súbita", "confusão súbita", "desequilíbrio súbito", "hemiparesia", "afasia"],
  },
  {
    match: ["bell"],
    names: ["paralisia facial periférica", "paralisia facial", "paralisia de Bell"],
    symptoms: ["boca torta", "rosto caído de um lado", "não consegue fechar o olho", "olho não fecha", "baba de um lado", "perda do paladar", "dor atrás da orelha"],
  },
  {
    match: ["convulsiva", "convulsao"],
    names: ["convulsão", "crise epiléptica", "epilepsia", "estado de mal epiléptico", "status epilepticus", "ataque epiléptico", "crise tônico-clônica", "crise convulsiva"],
    symptoms: ["convulsionando", "se debatendo", "tremendo o corpo todo", "perdeu a consciência", "babando", "mordeu a língua", "olhos revirados", "não para de convulsionar", "rigidez do corpo", "convulsão com febre"],
  },
  {
    match: ["meningite", "encefalite"],
    names: ["meningite bacteriana", "meningite viral", "meningococo", "meningococcemia", "encefalite herpética"],
    symptoms: ["febre com dor de cabeça", "rigidez de nuca", "pescoço duro", "vômito em jato", "manchas roxas na pele", "petéquias", "confusão", "sonolência", "convulsão com febre", "luz incomoda"],
  },

  /* ── Respiratório, ouvido, nariz e garganta ──────────────────── */
  {
    match: ["asma", "asmatica"],
    names: ["crise de asma", "crise asmática", "asma", "broncoespasmo", "bronquite asmática", "bombinha"],
    symptoms: ["falta de ar", "chiado no peito", "peito chiando", "aperto no peito", "tosse seca", "tosse à noite", "cansaço para respirar", "sibilância", "sibilos", "dificuldade para respirar"],
  },
  {
    match: ["dpoc"],
    names: ["doença pulmonar obstrutiva crônica", "enfisema", "bronquite crônica", "DPOC exacerbada", "exacerbação de DPOC"],
    symptoms: ["falta de ar pior que o habitual", "piora do cansaço", "tosse com catarro", "catarro amarelo ou verde", "chiado", "fumante", "ex-fumante"],
  },
  {
    match: ["pneumonia"],
    names: ["PAC", "pneumonia comunitária", "broncopneumonia", "BCP", "infecção no pulmão"],
    symptoms: ["febre com tosse", "tosse com catarro", "catarro purulento", "dor no peito ao respirar", "falta de ar", "cansaço", "crepitação", "calafrio", "respiração rápida"],
  },
  {
    match: ["tuberculose"],
    names: ["TB", "tísica", "BAAR", "bacilo de Koch"],
    symptoms: ["tosse há mais de 3 semanas", "tosse com sangue", "febre no fim da tarde", "suor noturno", "emagrecimento", "perda de peso"],
  },
  {
    match: ["pneumotorax", "hemotorax"],
    names: ["pulmão colabado", "ar no pulmão", "dreno de tórax", "toracocentese"],
    symptoms: ["dor no peito súbita", "falta de ar súbita", "dor ao respirar", "trauma no tórax", "murmúrio abolido"],
  },
  {
    match: ["otite media"],
    names: ["otite", "OMA", "infecção de ouvido", "dor de ouvido"],
    symptoms: ["dor de ouvido", "orelha doendo", "febre", "ouvido tampado", "criança puxando a orelha", "secreção no ouvido", "irritabilidade"],
  },
  {
    match: ["otite externa"],
    names: ["otite", "ouvido de nadador", "otite do nadador", "infecção no canal do ouvido"],
    symptoms: ["dor de ouvido ao puxar a orelha", "coceira no ouvido", "secreção no ouvido", "ouvido inchado", "depois de piscina"],
  },
  {
    match: ["sinusite", "rinossinusite"],
    names: ["sinusite", "sinusite aguda", "sinusite bacteriana", "rinossinusite bacteriana", "rinossinusite viral"],
    symptoms: ["dor na face", "peso na face", "dor na testa ao abaixar a cabeça", "nariz entupido", "secreção amarela ou verde no nariz", "catarro no nariz", "febre", "mau hálito", "dor nos dentes de cima"],
  },
  {
    match: ["faringoamigdalite", "amigdalite", "faringite", "tonsilite"],
    names: ["dor de garganta", "amigdalite", "tonsilite", "faringite", "garganta inflamada", "estreptococo", "faringite estreptocócica", "angina bacteriana"],
    symptoms: ["dor de garganta", "dor para engolir", "placas brancas na garganta", "pus na amígdala", "febre", "íngua no pescoço", "garganta vermelha", "rouquidão"],
  },
  {
    match: ["epistaxe"],
    names: ["sangramento nasal", "sangue no nariz", "hemorragia nasal"],
    symptoms: ["nariz sangrando", "sangue saindo do nariz", "sangramento pelo nariz"],
  },
  {
    match: ["resfriado", "gripe", "gripal"],
    names: ["gripe", "resfriado", "influenza", "síndrome gripal", "virose respiratória", "IVAS", "infecção de vias aéreas superiores", "covid"],
    symptoms: ["febre", "coriza", "nariz escorrendo", "espirro", "tosse", "dor no corpo", "dor de garganta", "mal-estar", "calafrio", "cansaço"],
  },
  {
    match: ["rinite"],
    names: ["rinite alérgica", "alergia nasal", "alergia respiratória"],
    symptoms: ["espirros", "coriza clara", "nariz escorrendo", "nariz entupido", "coceira no nariz", "olhos coçando", "crise de espirro de manhã"],
  },
  {
    match: ["tosse seca"],
    names: ["tosse crônica", "tosse persistente", "tosse irritativa"],
    symptoms: ["tosse seca que não passa", "tosse há semanas", "pigarro", "tosse à noite"],
  },
  {
    match: ["cerume"],
    names: ["cera no ouvido", "rolha de cera", "tampão de cera"],
    symptoms: ["ouvido tampado", "ouvido entupido", "diminuição da audição", "zumbido"],
  },

  /* ── Digestivo ───────────────────────────────────────────────── */
  {
    match: ["nausea", "vomito"],
    names: ["enjoo", "vômitos", "êmese", "náuseas", "hiperêmese"],
    symptoms: ["enjoo", "ânsia de vômito", "vontade de vomitar", "vomitando", "náusea"],
  },
  {
    match: ["diarreia", "gastroenterite", "intoxicacao alimentar"],
    names: ["gastroenterite", "GECA", "diarreia aguda", "virose intestinal", "intoxicação alimentar", "disenteria", "desarranjo"],
    symptoms: ["diarreia", "fezes líquidas", "cocô mole", "dor de barriga", "cólica", "vômito", "febre", "desidratação", "boca seca"],
  },
  {
    match: ["hemorroid"],
    names: ["hemorroidas", "hemorroida", "crise hemorroidária", "trombose hemorroidária", "doença hemorroidária"],
    symptoms: ["dor no ânus", "sangue vivo nas fezes", "sangramento ao evacuar", "caroço no ânus", "coceira anal", "inchaço no ânus"],
  },
  {
    match: ["hemorragia digestiva alta"],
    names: ["HDA", "sangramento digestivo alto", "hematêmese", "melena", "úlcera sangrante", "varizes de esôfago"],
    symptoms: ["vômito com sangue", "vômito em borra de café", "fezes pretas", "fezes como piche", "tontura", "fraqueza", "palidez"],
  },
  {
    match: ["hemorragia digestiva baixa"],
    names: ["HDB", "sangramento digestivo baixo", "enterorragia", "hematoquezia"],
    symptoms: ["sangue vivo nas fezes", "sangramento pelo ânus", "evacuação com sangue"],
  },
  {
    match: ["encefalopatia hepatica"],
    names: ["coma hepático", "cirrose descompensada", "encefalopatia portossistêmica"],
    symptoms: ["confusão em cirrótico", "sonolência", "tremor nas mãos", "flapping", "asterixe", "desorientação"],
  },
  {
    match: ["pancreatite"],
    names: ["pancreatite aguda", "inflamação do pâncreas"],
    symptoms: ["dor na barriga em faixa", "dor no estômago que vai para as costas", "vômitos", "dor abdominal intensa", "dor depois de bebida alcoólica"],
  },
  {
    match: ["colelitiase", "colica biliar"],
    names: ["pedra na vesícula", "cálculo biliar", "cólica biliar", "litíase biliar", "colelitíase"],
    symptoms: ["dor do lado direito da barriga", "dor embaixo das costelas à direita", "dor depois de comida gordurosa", "náusea", "vômito"],
  },
  {
    match: ["colecistite"],
    names: ["vesícula inflamada", "inflamação da vesícula"],
    symptoms: ["dor do lado direito da barriga", "febre", "dor que não passa", "sinal de Murphy", "vômito"],
  },
  {
    match: ["colangite"],
    names: ["colangite aguda", "infecção das vias biliares"],
    symptoms: ["febre com icterícia", "pele amarela", "olhos amarelos", "dor do lado direito da barriga", "calafrio", "tríade de Charcot"],
  },
  {
    match: ["refluxo", "dispepsia", "gastrite", "drge", "dispeptica"],
    names: ["DRGE", "refluxo", "gastrite", "azia", "dispepsia", "má digestão", "queimação no estômago", "esofagite"],
    symptoms: ["azia", "queimação no estômago", "queimação no peito", "dor no estômago", "estufamento", "empachamento", "arroto", "gosto amargo na boca", "regurgitação"],
  },
  {
    match: ["ulcer", "h pylori"],
    names: ["úlcera", "úlcera gástrica", "úlcera duodenal", "úlcera péptica", "H. pylori", "Helicobacter pylori", "bactéria do estômago"],
    symptoms: ["dor no estômago", "queimação em jejum", "dor que melhora com comida", "dor na boca do estômago"],
  },
  {
    match: ["ascite"],
    names: ["barriga d'água", "líquido na barriga", "paracentese", "cirrose"],
    symptoms: ["barriga inchada", "barriga d'água", "aumento do abdome", "falta de ar com barriga cheia"],
  },
  {
    match: ["diverticulite"],
    names: ["divertículo inflamado", "doença diverticular"],
    symptoms: ["dor do lado esquerdo baixo da barriga", "febre", "dor abdominal à esquerda", "mudança do hábito intestinal"],
  },
  {
    match: ["apendicite"],
    names: ["apêndice", "apendicite aguda"],
    symptoms: ["dor que começa no umbigo e vai para o lado direito", "dor do lado direito baixo da barriga", "febre", "enjoo", "falta de apetite", "dor ao andar"],
  },
  {
    match: ["abdome agudo"],
    names: ["obstrução intestinal", "intestino parado", "perfuração", "úlcera perfurada", "isquemia mesentérica", "gravidez ectópica rota", "sangramento interno"],
    symptoms: ["dor abdominal forte", "barriga dura", "barriga distendida", "parou de eliminar fezes e gases", "vômito fecaloide", "dor desproporcional ao exame", "dor abdominal súbita"],
  },
  {
    match: ["constipacao"],
    names: ["prisão de ventre", "intestino preso", "obstipação", "intestino travado"],
    symptoms: ["não consegue evacuar", "fezes duras", "evacuar com dificuldade", "dias sem evacuar", "barriga estufada"],
  },
  {
    match: ["colica abdominal"],
    names: ["cólica", "dor de barriga", "espasmo intestinal"],
    symptoms: ["dor de barriga em cólica", "cólica intestinal", "barriga doendo"],
  },
  {
    match: ["cinetose"],
    names: ["enjoo de viagem", "enjoo de movimento", "mal do mar", "enjoo no carro"],
    symptoms: ["enjoo no carro", "enjoo no barco", "enjoo no avião", "vômito em viagem"],
  },

  /* ── Sangue ──────────────────────────────────────────────────── */
  {
    match: ["anemia"],
    names: ["falta de ferro", "deficiência de ferro", "ferropenia", "hemoglobina baixa", "sangue fraco"],
    symptoms: ["cansaço", "fraqueza", "palidez", "falta de ar ao esforço", "tontura", "unhas fracas", "queda de cabelo", "vontade de comer gelo ou terra"],
  },
  {
    match: ["neutropenia"],
    names: ["neutropenia febril", "febre na quimioterapia", "imunossuprimido"],
    symptoms: ["febre depois da quimioterapia", "febre em paciente com câncer", "neutrófilos baixos"],
  },
  {
    match: ["hemacias"],
    names: ["transfusão de sangue", "bolsa de sangue", "concentrado de hemácias", "CH"],
    symptoms: ["hemoglobina baixa", "anemia grave", "sangramento"],
  },
  {
    match: ["plaquetas"],
    names: ["transfusão de plaquetas", "plaquetopenia", "trombocitopenia"],
    symptoms: ["plaquetas baixas", "sangramento com plaqueta baixa", "petéquias"],
  },
  {
    match: ["crioprecipitado"],
    names: ["crio", "fibrinogênio baixo"],
    symptoms: ["sangramento com fibrinogênio baixo"],
  },
  {
    match: ["plasma"],
    names: ["plasma fresco", "PFC", "reversão de anticoagulante"],
    symptoms: ["INR alto com sangramento", "sangramento em quem usa varfarina"],
  },

  /* ── Glândulas e metabolismo ─────────────────────────────────── */
  {
    match: ["cetoacidose", "hiperosmolar"],
    names: ["CAD", "cetoacidose diabética", "EHH", "estado hiperglicêmico hiperosmolar", "coma hiperosmolar", "diabetes descompensado"],
    symptoms: ["glicemia muito alta", "sede intensa", "urinando muito", "desidratação", "hálito de fruta", "respiração rápida e profunda", "vômito", "dor abdominal", "sonolência", "confusão"],
  },
  {
    match: ["controle glicemico", "diabetes", "dm2"],
    names: ["diabetes", "DM2", "diabetes tipo 2", "glicemia alta", "hiperglicemia", "açúcar alto no sangue", "insulina"],
    symptoms: ["glicemia alta", "sede", "urinando muito", "boca seca", "visão embaçada", "emagrecimento"],
  },
  {
    match: ["hipoglicemia"],
    names: ["açúcar baixo", "glicose baixa", "glicemia baixa"],
    symptoms: ["suor frio", "tremor", "fome súbita", "confusão", "desmaio", "glicemia baixa", "palpitação", "fraqueza"],
  },
  {
    match: ["hipotireoidismo"],
    names: ["tireoide lenta", "tireoide preguiçosa", "Hashimoto", "TSH alto", "levotiroxina"],
    symptoms: ["cansaço", "sonolência", "ganho de peso", "sente muito frio", "pele seca", "intestino preso", "queda de cabelo", "inchaço"],
  },
  {
    match: ["hipertireoidismo"],
    names: ["tireoide acelerada", "doença de Graves", "bócio tóxico", "TSH baixo", "tireotoxicose"],
    symptoms: ["palpitação", "perda de peso", "tremor", "sente muito calor", "suor", "ansiedade", "olho saltado", "diarreia", "insônia"],
  },
  {
    match: ["colesterol"],
    names: ["dislipidemia", "colesterol alto", "triglicerídeos", "LDL alto", "gordura no sangue", "estatina"],
    symptoms: ["colesterol alto no exame", "LDL alto", "triglicerídeos altos"],
  },
  {
    match: ["osteoporose"],
    names: ["osteopenia", "ossos fracos", "perda de massa óssea", "densitometria"],
    symptoms: ["fratura com pouco trauma", "perda de altura", "corcunda", "menopausa"],
  },
  {
    match: ["vitamina d"],
    names: ["hipovitaminose D", "deficiência de vitamina D", "vitamina D baixa"],
    symptoms: ["vitamina D baixa no exame", "dor nos ossos", "fraqueza muscular"],
  },

  /* ── Urinário e genital ──────────────────────────────────────── */
  {
    match: ["cistite", "infeccao do trato urinario", "itu"],
    names: ["infecção urinária", "ITU", "cistite", "infecção de urina", "infecção na bexiga"],
    symptoms: ["ardência para urinar", "ardor ao urinar", "dor ao urinar", "disúria", "vontade de urinar toda hora", "urgência urinária", "urina com sangue", "urina turva", "urina com cheiro forte", "dor no pé da barriga"],
  },
  {
    match: ["pielonefrite"],
    names: ["infecção nos rins", "infecção urinária alta", "pielo"],
    symptoms: ["febre com dor nas costas", "dor lombar com febre", "Giordano positivo", "calafrio", "ardência para urinar", "náusea", "vômito"],
  },
  {
    match: ["colica renal", "ureterolitiase", "calculo"],
    names: ["pedra nos rins", "cálculo renal", "nefrolitíase", "litíase urinária", "cólica nefrética", "cálculo ureteral"],
    symptoms: ["dor forte nas costas que vai para a virilha", "dor lombar em cólica", "sangue na urina", "vontade de urinar", "náusea", "agitado de dor"],
  },
  {
    match: ["candidiase"],
    names: ["candidíase", "candida", "monilíase", "corrimento branco"],
    symptoms: ["coceira vaginal", "corrimento branco como leite talhado", "ardência vaginal", "vermelhidão na vulva", "dor na relação"],
  },
  {
    match: ["vaginose bacteriana"],
    names: ["gardnerella", "vaginose"],
    symptoms: ["corrimento acinzentado", "cheiro de peixe", "mau cheiro depois da relação", "corrimento com mau cheiro"],
  },
  {
    match: ["vaginose citolitica"],
    names: ["vaginose citolítica", "excesso de lactobacilos"],
    symptoms: ["corrimento branco grumoso", "coceira antes da menstruação", "ardor vaginal cíclico"],
  },
  {
    match: ["tricomon"],
    names: ["tricomonas", "trichomonas", "tricomoníase"],
    symptoms: ["corrimento amarelo-esverdeado", "corrimento espumoso", "mau cheiro", "coceira", "ardência para urinar", "colo em framboesa"],
  },
  {
    match: ["vaginite mista"],
    names: ["corrimento misto", "vulvovaginite"],
    symptoms: ["corrimento com coceira e cheiro"],
  },
  {
    match: ["herpes genital"],
    names: ["herpes genital", "HSV-2", "feridas genitais"],
    symptoms: ["bolhas nos genitais", "feridas na região genital", "ardência", "dor ao urinar", "íngua na virilha"],
  },
  {
    match: ["uretrite", "cervicite"],
    names: ["gonorreia", "gonococo", "clamídia", "IST", "DST", "corrimento uretral", "blenorragia"],
    symptoms: ["pus saindo do pênis", "corrimento pela uretra", "ardência para urinar", "gota matinal", "corrimento amarelo"],
  },
  {
    match: ["doenca inflamatoria pelvica"],
    names: ["DIP", "infecção nas trompas", "salpingite", "anexite"],
    symptoms: ["dor no pé da barriga", "dor pélvica", "febre", "corrimento", "dor na relação", "sangramento fora da menstruação"],
  },
  {
    match: ["orquiepididimite"],
    names: ["epididimite", "orquite", "inflamação no testículo"],
    symptoms: ["dor no testículo", "testículo inchado", "saco escrotal vermelho", "febre"],
  },
  {
    match: ["sifilis"],
    names: ["sífilis", "cancro duro", "lues", "VDRL", "penicilina benzatina", "Benzetacil"],
    symptoms: ["ferida que não dói nos genitais", "manchas na palma das mãos e na sola dos pés", "VDRL reagente", "íngua"],
  },
  {
    match: ["sangramento uterino", "sangramento menstrual"],
    names: ["menorragia", "sangramento uterino anormal", "SUA", "hemorragia uterina", "hipermenorreia"],
    symptoms: ["menstruação muito forte", "sangramento vaginal intenso", "coágulos", "menstruação que não para"],
  },
  {
    match: ["dismenorreia", "colica menstrual"],
    names: ["cólica menstrual", "dismenorreia", "dismenorréia"],
    symptoms: ["cólica menstrual", "dor no pé da barriga na menstruação", "dor menstrual forte"],
  },
  {
    match: ["prostata aumentada", "hiperplasia prostatica"],
    names: ["HPB", "próstata aumentada", "próstata grande", "hiperplasia prostática benigna"],
    symptoms: ["jato urinário fraco", "levanta à noite para urinar", "noctúria", "gotejamento", "sensação de não esvaziar a bexiga", "esforço para urinar"],
  },
  {
    match: ["prostatite"],
    names: ["inflamação da próstata", "infecção da próstata"],
    symptoms: ["febre com dor ao urinar em homem", "dor no períneo", "dor ao ejacular"],
  },
  {
    match: ["pep sexual", "profilaxia pos exposicao"],
    names: ["profilaxia pós-exposição", "PEP", "antirretroviral", "HIV"],
    symptoms: ["exposição sexual de risco", "camisinha estourou", "violência sexual", "acidente com agulha"],
  },
  {
    match: ["amenorreia", "progesterona"],
    names: ["falta de menstruação", "menstruação atrasada", "teste da progesterona", "amenorréia"],
    symptoms: ["menstruação não vem", "meses sem menstruar"],
  },
  {
    match: ["mastalgia"],
    names: ["dor nas mamas", "dor no seio", "mastodinia"],
    symptoms: ["dor no seio", "mama dolorida", "dor na mama antes da menstruação"],
  },
  {
    match: ["gestante", "gestacao", "pre natal"],
    names: ["grávida", "gravidez", "gestação", "pré-natal", "gestante", "lactante", "amamentação"],
    symptoms: ["grávida", "gestante com dor", "gestante com febre", "enjoo na gravidez"],
  },

  /* ── Músculos, ossos e articulações ──────────────────────────── */
  {
    match: ["musculoesqueletica", "lombalgia", "dorsalgia", "torcicolo"],
    names: ["dor nas costas", "lombalgia", "lumbago", "dor lombar", "ciática", "torcicolo", "dor muscular", "mialgia", "contratura muscular"],
    symptoms: ["dor nas costas", "dor lombar", "travou as costas", "dor que desce para a perna", "pescoço travado", "dor no pescoço", "dor muscular", "dor ao se mexer"],
  },
  {
    match: ["fratura"],
    names: ["fratura exposta", "osso exposto", "trauma ortopédico"],
    symptoms: ["osso aparecendo", "ferida com osso", "deformidade com sangramento"],
  },
  {
    match: ["gota"],
    names: ["gota", "ácido úrico alto", "artrite gotosa", "hiperuricemia", "podagra"],
    symptoms: ["dedão do pé inchado e vermelho", "dor forte no dedão", "articulação vermelha e quente", "dor no pé à noite", "crise de gota"],
  },
  {
    match: ["entorse", "contusao"],
    names: ["entorse", "torção", "pé torcido", "tornozelo virado", "contusão", "pancada"],
    symptoms: ["tornozelo inchado", "dor depois de torcer", "roxo", "hematoma", "dor depois de queda"],
  },

  /* ── Saúde mental ────────────────────────────────────────────── */
  {
    match: ["acatisia"],
    names: ["inquietação por antipsicótico", "efeito colateral do haloperidol"],
    symptoms: ["inquietação", "não consegue ficar parado", "agitação depois de antipsicótico"],
  },
  {
    match: ["psicotica"],
    names: ["surto psicótico", "psicose", "esquizofrenia", "surto"],
    symptoms: ["ouvindo vozes", "alucinação", "delírio", "desconfiança", "fala desorganizada"],
  },
  {
    match: ["delirium"],
    names: ["confusão aguda", "estado confusional agudo"],
    symptoms: ["confusão súbita", "desorientação", "agitação à noite", "idoso confuso", "atenção que vai e volta"],
  },
  {
    match: ["agressividade", "agitacao"],
    names: ["agitação psicomotora", "paciente agressivo", "contenção", "sedação"],
    symptoms: ["paciente agitado", "agressivo", "violento", "quebrando coisas", "ameaçando"],
  },
  {
    match: ["ansiedade", "panico"],
    names: ["crise de ansiedade", "ataque de pânico", "crise de pânico", "síndrome do pânico", "ansiedade", "nervosismo", "depressão", "tristeza"],
    symptoms: ["falta de ar com ansiedade", "coração acelerado", "sensação de morte", "tremor", "formigamento nas mãos", "aperto no peito de nervoso", "choro", "angústia", "desânimo"],
  },
  {
    match: ["insonia"],
    names: ["dificuldade para dormir", "sono ruim"],
    symptoms: ["não consegue dormir", "acorda de madrugada", "sono leve", "cansaço de dia"],
  },

  /* ── Sódio, potássio, cálcio, magnésio ───────────────────────── */
  {
    match: ["hipercalemia"],
    names: ["potássio alto", "hiperpotassemia", "K alto"],
    symptoms: ["potássio alto no exame", "fraqueza", "onda T apiculada", "arritmia", "insuficiência renal"],
  },
  {
    match: ["hipocalemia"],
    names: ["potássio baixo", "hipopotassemia", "K baixo"],
    symptoms: ["fraqueza muscular", "cãibra", "câimbra", "potássio baixo no exame", "arritmia"],
  },
  {
    match: ["hiponatremia"],
    names: ["sódio baixo", "Na baixo"],
    symptoms: ["confusão", "sonolência", "convulsão", "náusea", "sódio baixo no exame", "idoso confuso"],
  },
  {
    match: ["hipernatremia"],
    names: ["sódio alto", "Na alto", "desidratação hipertônica"],
    symptoms: ["sede", "confusão", "desidratação", "sódio alto no exame"],
  },
  {
    match: ["hipocalcemia"],
    names: ["cálcio baixo"],
    symptoms: ["formigamento na boca e nas mãos", "cãibra", "espasmo da mão", "tetania", "sinal de Chvostek", "sinal de Trousseau"],
  },
  {
    match: ["hipercalcemia"],
    names: ["cálcio alto"],
    symptoms: ["confusão", "intestino preso", "urinando muito", "desidratação", "cálcio alto no exame"],
  },
  {
    match: ["hipomagnesemia"],
    names: ["magnésio baixo"],
    symptoms: ["cãibra", "tremor", "arritmia", "torsades"],
  },
  {
    match: ["hipermagnesemia"],
    names: ["magnésio alto"],
    symptoms: ["fraqueza", "reflexos diminuídos", "sulfato de magnésio na eclâmpsia", "sonolência"],
  },

  /* ── Infecções ───────────────────────────────────────────────── */
  {
    match: ["dengue"],
    names: ["arbovirose", "dengue clássica"],
    symptoms: ["febre alta", "dor atrás dos olhos", "dor no corpo", "dor nas juntas", "manchas vermelhas na pele", "cansaço", "prova do laço", "plaquetas baixas"],
  },
  {
    match: ["herpes simples", "herpes labial"],
    names: ["herpes labial", "herpes", "HSV-1", "febre do lábio"],
    symptoms: ["bolhas no lábio", "ferida no lábio", "formigamento no lábio", "vesículas"],
  },
  {
    match: ["herpes zoster"],
    names: ["zona", "cobreiro", "zóster", "herpes-zóster", "varicela-zóster"],
    symptoms: ["bolhas em faixa de um lado do corpo", "dor em queimação", "faixa de bolhas nas costas", "dor antes das bolhas"],
  },
  {
    match: ["conjuntivite"],
    names: ["olho vermelho", "conjuntivite bacteriana", "conjuntivite viral", "conjuntivite alérgica"],
    symptoms: ["olho vermelho", "olho com remela", "secreção no olho", "olho grudando de manhã", "coceira no olho", "ardência no olho", "lacrimejamento"],
  },
  {
    match: ["tetano"],
    names: ["vacina antitetânica", "dT", "soro antitetânico", "SAT", "imunoglobulina antitetânica", "IGHAT"],
    symptoms: ["ferida com prego enferrujado", "corte com objeto sujo", "ferida suja", "mordida", "boca travada", "trismo", "rigidez"],
  },
  {
    match: ["leptospirose"],
    names: ["doença do rato", "lepto"],
    symptoms: ["febre depois de enchente", "dor na panturrilha", "olhos vermelhos", "icterícia", "contato com água de enchente", "urina de rato"],
  },
  {
    match: ["sepse", "septico"],
    names: ["sepse", "choque séptico", "infecção generalizada", "septicemia"],
    symptoms: ["febre com pressão baixa", "confusão com febre", "respiração rápida", "extremidades frias", "pouca urina", "lactato alto"],
  },

  /* ── Pele ────────────────────────────────────────────────────── */
  {
    match: ["celulite", "erisipela"],
    names: ["erisipela", "celulite", "infecção de pele"],
    symptoms: ["perna vermelha, inchada e quente", "vermelhidão que se espalha", "febre", "placa vermelha brilhante", "dor na pele"],
  },
  {
    match: ["abscesso", "furunc", "foliculite"],
    names: ["furúnculo", "abscesso", "carbúnculo", "foliculite", "tumor de pus"],
    symptoms: ["caroço com pus", "bolinha de pus", "nódulo vermelho doloroso", "pus", "pelo encravado inflamado"],
  },
  {
    match: ["fasceite", "infeccoes bacterianas graves"],
    names: ["fasceíte necrosante", "infecção grave de pele", "gangrena"],
    symptoms: ["dor desproporcional", "pele roxa", "bolhas", "crepitação na pele", "febre alta", "piora rápida"],
  },
  {
    match: ["impetigo"],
    names: ["impetigo", "ectima", "piodermite"],
    symptoms: ["crostas cor de mel", "feridas com casca amarela", "feridas no rosto de criança", "bolhas que estouram"],
  },
  {
    match: ["urticaria", "reacoes alergicas"],
    names: ["urticária", "alergia na pele", "vergão", "reação alérgica", "alergia"],
    symptoms: ["placas vermelhas que coçam", "vergões", "coceira no corpo", "placas que mudam de lugar", "inchaço nos lábios"],
  },
  {
    match: ["anafila"],
    names: ["choque anafilático", "anafilaxia", "reação alérgica grave", "edema de glote"],
    symptoms: ["falta de ar depois de comida ou remédio", "inchaço na garganta", "inchaço nos lábios e nos olhos", "placas no corpo com falta de ar", "pressão baixa depois de picada", "chiado depois de alergia", "rouquidão súbita"],
  },
  {
    match: ["tinea", "tinha", "micose de pele", "dermatofitose"],
    names: ["micose", "tinha", "impinge", "frieira", "pé de atleta", "dermatofitose", "tinea corporis", "tinea pedis", "tinea capitis"],
    symptoms: ["mancha redonda que coça", "borda avermelhada", "coceira entre os dedos", "pele descamando entre os dedos", "coceira na virilha"],
  },
  {
    match: ["onicomicose"],
    names: ["micose de unha", "unha com fungo", "fungo na unha"],
    symptoms: ["unha amarelada", "unha grossa", "unha descolando", "unha esfarelando"],
  },
  {
    match: ["pitiriase"],
    names: ["pano branco", "micose de praia", "pitiríase versicolor", "ptiríase"],
    symptoms: ["manchas brancas no tronco", "manchas claras que descamam", "manchas que aparecem depois do sol"],
  },
  {
    match: ["escabiose", "sarna"],
    names: ["sarna", "escabiose"],
    symptoms: ["coceira à noite", "coceira que piora à noite", "coceira entre os dedos e nos punhos", "várias pessoas da casa com coceira"],
  },
  {
    match: ["pediculose", "piolho"],
    names: ["piolho", "lêndea", "chato"],
    symptoms: ["coceira no couro cabeludo", "lêndeas no cabelo", "piolho", "coceira na região pubiana"],
  },
  {
    match: ["dermatite atopica"],
    names: ["eczema", "pele atópica"],
    symptoms: ["pele seca com coceira", "manchas que coçam nas dobras", "coceira crônica"],
  },
  {
    match: ["dermatite de contato"],
    names: ["alergia de contato", "irritação na pele"],
    symptoms: ["vermelhidão e coceira onde encostou", "bolhinhas depois de contato", "alergia a bijuteria", "alergia a produto"],
  },
  {
    match: ["seborreica"],
    names: ["caspa", "seborreia", "crosta láctea"],
    symptoms: ["caspa", "descamação no couro cabeludo", "coceira no couro cabeludo", "descamação nas sobrancelhas e do lado do nariz"],
  },
  {
    match: ["pe diabetico"],
    names: ["úlcera diabética", "infecção no pé do diabético"],
    symptoms: ["ferida no pé de diabético", "pé vermelho e inchado em diabético", "ferida que não cicatriza"],
  },
  {
    match: ["psoriase"],
    names: ["psoríase"],
    symptoms: ["placas avermelhadas com escamas prateadas", "descamação nos cotovelos e joelhos"],
  },
  {
    match: ["molusco"],
    names: ["molusco contagioso"],
    symptoms: ["bolinhas peroladas com umbigo no centro", "bolinhas na pele de criança"],
  },
  {
    match: ["larva migrans"],
    names: ["bicho geográfico", "bicho-geográfico", "larva migrans"],
    symptoms: ["risco vermelho que anda na pele", "coceira em trilha", "depois de areia de praia"],
  },
  {
    match: ["escoriac", "feridas"],
    names: ["arranhão", "ralado", "esfolado", "ferida leve", "machucado"],
    symptoms: ["joelho ralado", "pele esfolada", "corte superficial"],
  },
  {
    match: ["queimadura"],
    names: ["queimadura de sol", "queimadura solar"],
    symptoms: ["pele vermelha e ardendo depois do sol", "bolhas depois da praia"],
  },
  {
    match: ["picada"],
    names: ["picada de inseto", "mordida de inseto", "reação a picada"],
    symptoms: ["inchaço depois de picada", "vermelhidão e coceira no lugar da picada"],
  },
  {
    match: ["aftas", "gengivite"],
    names: ["afta", "estomatite", "gengivite"],
    symptoms: ["ferida na boca", "ferida branca na boca", "gengiva sangrando", "gengiva inflamada"],
  },
  {
    match: ["varizes", "insuficiencia venosa"],
    names: ["varizes", "veias saltadas", "insuficiência venosa crônica", "má circulação"],
    symptoms: ["pernas pesadas", "inchaço nas pernas no fim do dia", "veias dilatadas", "cãibra à noite"],
  },

  /* ── Vermes ──────────────────────────────────────────────────── */
  {
    match: ["verminose", "vermifugo"],
    names: ["vermes", "lombriga", "ascaridíase", "parasitose intestinal", "vermífugo"],
    symptoms: ["barriga grande em criança", "coceira no ânus", "vermes nas fezes", "dor de barriga", "falta de apetite"],
  },
  {
    match: ["giardiase"],
    names: ["giárdia", "giardia"],
    symptoms: ["diarreia gordurosa", "gases", "barriga estufada"],
  },
  {
    match: ["oxiuriase", "enterobiase"],
    names: ["oxiúro", "enterobíase", "oxiuríase"],
    symptoms: ["coceira no ânus à noite", "vermes brancos pequenos nas fezes"],
  },
  {
    match: ["teniase"],
    names: ["solitária", "tênia"],
    symptoms: ["pedaços de verme nas fezes"],
  },

  /* ── Criança ─────────────────────────────────────────────────── */
  {
    match: ["colica e gases"],
    names: ["cólica do bebê", "gases do bebê", "cólica do lactente"],
    symptoms: ["bebê chorando muito", "bebê com gases", "choro sem consolo no fim da tarde", "bebê encolhe as pernas"],
  },
  {
    match: ["virose"],
    names: ["virose", "febre viral", "infecção viral"],
    symptoms: ["febre em criança", "criança com vômito e febre", "criança com diarreia", "criança sem apetite", "criança abatida"],
  },

  /* ── Intoxicações e animais ──────────────────────────────────── */
  {
    match: ["descontaminacao"],
    names: ["lavagem gástrica", "carvão ativado", "intoxicação", "envenenamento", "overdose"],
    symptoms: ["tomou muitos comprimidos", "ingeriu remédio demais", "tentativa de suicídio", "criança engoliu produto"],
  },
  {
    match: ["paracetamol"],
    names: ["intoxicação por paracetamol", "overdose de paracetamol", "Tylenol", "acetaminofeno", "N-acetilcisteína"],
    symptoms: ["tomou muitos comprimidos de paracetamol", "ingestão de paracetamol"],
  },
  {
    match: ["organofosforado", "carbamato"],
    names: ["chumbinho", "veneno de rato", "agrotóxico", "inseticida"],
    symptoms: ["pupila puntiforme", "muita saliva", "suor", "vômito", "diarreia", "secreção no pulmão", "fasciculações", "frequência cardíaca baixa depois de veneno"],
  },
  {
    match: ["cocaina"],
    names: ["crack", "pó", "estimulante"],
    symptoms: ["agitação depois de droga", "dor no peito depois de cocaína", "taquicardia", "pressão alta", "pupila dilatada"],
  },
  {
    match: ["opioide"],
    names: ["overdose de opioide", "morfina", "tramadol", "fentanil", "heroína", "naloxona"],
    symptoms: ["respiração lenta", "pupila puntiforme", "sonolência profunda", "rebaixamento"],
  },
  {
    match: ["benzodiazepinico"],
    names: ["clonazepam", "diazepam", "Rivotril", "overdose de calmante", "flumazenil"],
    symptoms: ["sonolência depois de calmante", "tomou muitos comprimidos de calmante"],
  },
  {
    match: ["intoxicacao alcoolica"],
    names: ["embriaguez", "coma alcoólico", "bêbado", "álcool"],
    symptoms: ["bêbado", "sonolento depois de beber", "vômito depois de beber", "hálito alcoólico"],
  },
  {
    match: ["abstinencia alcoolica"],
    names: ["delirium tremens", "síndrome de abstinência", "abstinência de álcool"],
    symptoms: ["tremor depois de parar de beber", "alucinação", "agitação", "suor", "convulsão depois de parar de beber"],
  },
  {
    match: ["mordedura"],
    names: ["mordida de cachorro", "mordida de gato", "mordida humana", "raiva", "antirrábica"],
    symptoms: ["mordida", "ferida por mordida", "arranhão de gato"],
  },
  {
    match: ["ofidico"],
    names: ["picada de cobra", "jararaca", "cascavel", "coral", "surucucu", "soro antiofídico", "antibotrópico", "anticrotálico"],
    symptoms: ["picada de cobra", "inchaço e dor no lugar da picada", "sangramento", "visão turva", "pálpebra caída", "urina escura"],
  },
  {
    match: ["escorpion"],
    names: ["picada de escorpião", "escorpião amarelo", "soro antiescorpiônico"],
    symptoms: ["dor forte no lugar da picada", "vômito", "suor", "agitação em criança"],
  },
  {
    match: ["araneismo"],
    names: ["picada de aranha", "aranha-marrom", "armadeira", "loxosceles", "phoneutria"],
    symptoms: ["dor no lugar da picada", "mancha roxa", "ferida que necrosa", "urina escura"],
  },

  /* ── Remédios e procedimentos do plantão ─────────────────────── */
  {
    match: ["antimicrobiano"],
    names: ["antibióticos", "antibiótico", "ATB", "dose de antibiótico"],
    symptoms: ["infecção", "febre"],
  },
  {
    match: ["analgesico"],
    names: ["analgesia", "remédio para dor", "analgésico", "AINE", "anti-inflamatório"],
    symptoms: ["dor", "dor forte", "dor intensa"],
  },
  {
    match: ["aminas vasoativas"],
    names: ["droga vasoativa", "DVA", "noradrenalina", "nora", "vasopressor", "dobutamina", "adrenalina em bomba"],
    symptoms: ["pressão baixa", "choque", "hipotensão que não melhora com soro"],
  },
  {
    match: ["intubacao"],
    names: ["IOT", "intubação orotraqueal", "sequência rápida", "SRI", "via aérea", "sedação"],
    symptoms: ["insuficiência respiratória", "rebaixamento", "Glasgow 8", "não protege a via aérea"],
  },
  {
    match: ["paliativo"],
    names: ["fim de vida", "conforto", "paliação", "sedação paliativa"],
    symptoms: ["dor no fim de vida", "falta de ar no fim de vida", "ronco da morte", "sororoca", "agitação terminal"],
  },
];

const PADDED = CONDITION_TERMS.map((c) => ({ ...c, keys: c.match.map((m) => searchKey(m)) }));

/**
 * As condições cujo `match` casa com o título (no começo de uma palavra). Termo
 * negado não conta: "DM2 descompensado, sem cetoacidose" não é cetoacidose.
 */
export function conditionsFor(title: string): ConditionTerms[] {
  const key = ` ${searchKey(title)}`;
  return PADDED.filter((c) => c.keys.some((m) => key.includes(` ${m}`) && !key.includes(` sem ${m}`)));
}

/**
 * O vocabulário ampliado (clinical-terms-extra.json, gerado por
 * scripts/guide/expand-terms.mjs): dezenas de queixas por condição do jeito
 * que o paciente conta. Chave: o primeiro `match` da condição.
 */
const GEMINI_TERMS = (EXTRA as { conditions: Record<string, { names: string[]; symptoms: string[] }> }).conditions;

type ClaudeTerms = { symptoms?: string[]; remove?: string[]; confirm?: string[]; alarm?: string[] };
const CLAUDE_TERMS = (CLAUDE as { conditions: Record<string, ClaudeTerms> }).conditions;

/**
 * O vocabulário ampliado de uma condição: as queixas escritas pelo Claude e as
 * geradas pelo Gemini, sem as do Gemini que o Claude marcou como erradas
 * (de outra condição, genéricas demais).
 */
const EXTRA_TERMS: Record<string, { names: string[]; symptoms: string[] }> = Object.fromEntries(
  [...new Set([...Object.keys(GEMINI_TERMS), ...Object.keys(CLAUDE_TERMS)])].map((key) => {
    const gemini = GEMINI_TERMS[key] ?? { names: [], symptoms: [] };
    const claude = CLAUDE_TERMS[key] ?? {};
    const wrong = new Set((claude.remove ?? []).map((s) => searchKey(s)));
    const keep = (list: readonly string[]) => list.filter((s) => !wrong.has(searchKey(s)));
    return [key, { names: keep(gemini.names), symptoms: [...(claude.symptoms ?? []), ...keep(gemini.symptoms)] }];
  })
);

/**
 * O que perguntar ou examinar para confirmar a hipótese e os sinais de alarme
 * (escritos pelo Claude por condição): o "Escutar o paciente" mostra depois do
 * porquê, antes da receita.
 */
export function guidanceOf(c: ConditionTerms): { confirm: string[]; alarm: string[] } {
  const claude = CLAUDE_TERMS[c.match[0]] ?? {};
  return { confirm: claude.confirm ?? [], alarm: claude.alarm ?? [] };
}

/** Todos os nomes e queixas de uma condição: os escritos à mão primeiro, depois os ampliados. */
export function allTermsOf(c: ConditionTerms): { names: string[]; symptoms: string[] } {
  const extra = EXTRA_TERMS[c.match[0]];
  const dedupe = (list: readonly string[]) => {
    const seen = new Set<string>();
    return list.filter((s) => {
      const k = searchKey(s);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };
  return { names: dedupe([...c.names, ...(extra?.names ?? [])]), symptoms: dedupe([...c.symptoms, ...(extra?.symptoms ?? [])]) };
}

/** Outros nomes e sintomas (os escritos à mão) de um item, juntando as condições do título, sem repetir. */
export function termsFor(title: string): { names: string[]; symptoms: string[] } {
  const found = conditionsFor(title);
  return {
    names: [...new Set(found.flatMap((c) => c.names))],
    symptoms: [...new Set(found.flatMap((c) => c.symptoms))],
  };
}

/**
 * O vocabulário ampliado de um item — a queixa como o paciente conta —, fora
 * do que já está escrito à mão. Fica FORA dos índices da busca por palavra:
 * milhares de frases leigas tornariam "coceira" e "noite" comuns demais e
 * mexeriam em toda a ordem. Serve à busca por sentido da Super Inteligência
 * (vectors.ts) e ao "Escutar o paciente" do app (allTermsOf no pacote).
 */
export function heardFor(title: string): string[] {
  const found = conditionsFor(title);
  const curated = new Set(found.flatMap((c) => [...c.names, ...c.symptoms]).map((s) => searchKey(s)));
  return [
    ...new Set(
      found
        .flatMap((c) => [...(EXTRA_TERMS[c.match[0]]?.names ?? []), ...(EXTRA_TERMS[c.match[0]]?.symptoms ?? [])])
        .filter((s) => !curated.has(searchKey(s)))
    ),
  ];
}
