import type { OrthoTopic } from "./types.ts";

/**
 * A consulta guiada de ortopedia: o médico que nunca atendeu ortopedia
 * escolhe onde dói, confere o alarme da região, escolhe a condição que
 * combina e segue o roteiro do tópico marcando o que perguntou e o que o
 * exame deu. No fim sai a nota SOAP para colar no prontuário.
 */

export interface OrthoRegion {
  key: string;
  label: string;
  /** Como aparece no botão grande ("Joelho"). */
  short: string;
  /** Tópicos da região, na ordem em que o guia os apresenta. */
  topics: string[];
  /** O alarme da região, conferido antes de escolher a condição. */
  alarm: string[];
}

/** Alarmes que valem para qualquer região. */
export const UNIVERSAL_ALARM: readonly string[] = [
  "Articulação quente, inchada e que não deixa mexer, com ou sem febre (artrite séptica até a punção)",
  "Ferida sobre o osso quebrado ou deformidade grosseira (fratura exposta ou luxação)",
  "Dor desproporcional, piora ao estirar os dedos, dormência ou dedos pálidos (síndrome compartimental)",
  "Pulso ausente, mão ou pé frio, perda de força ou sensibilidade distal (lesão vascular ou nervosa)",
  "Dor noturna constante com emagrecimento, câncer prévio ou febre (tumor ou infecção)",
];

export const ORTHO_REGIONS: readonly OrthoRegion[] = [
  {
    key: "pescoco",
    label: "Pescoço",
    short: "Pescoço",
    topics: ["cervicalgia-e-cervicobraquialgia"],
    alarm: [
      "Trauma com dor na linha média, mais de 65 anos ou mecanismo perigoso (tomografia antes de mexer)",
      "Mãos desajeitadas, marcha instável, reflexos vivos ou urgência urinária (mielopatia)",
    ],
  },
  {
    key: "ombro",
    label: "Ombro e clavícula",
    short: "Ombro",
    topics: ["sindrome-do-impacto-e-manguito-rotador", "capsulite-adesiva", "luxacao-e-instabilidade-do-ombro", "fratura-de-clavicula"],
    alarm: [
      "Ombro saiu do lugar e ainda está fora (luxação: raio-X e redução no pronto-socorro)",
      "Fraqueza súbita para levantar o braço depois de queda em menos de 60 anos (ruptura aguda do manguito)",
      "Dor no ombro esquerdo com esforço, suor ou falta de ar e ombro normal ao exame (coração)",
    ],
  },
  {
    key: "cotovelo",
    label: "Cotovelo",
    short: "Cotovelo",
    topics: ["epicondilite"],
    alarm: [
      "Cotovelo com derrame, quente ou travado depois de queda (fratura da cabeça do rádio ou supracondiliana na criança)",
      "Criança que não mexe o cotovelo após queda (fratura até prova em contrário: raio-X e ortopedia hoje)",
    ],
  },
  {
    key: "punho-mao",
    label: "Punho e mão",
    short: "Punho e mão",
    topics: ["fratura-do-radio-distal", "fratura-de-escafoide", "sindrome-do-tunel-do-carpo", "tenossinovite-de-de-quervain", "dedo-em-gatilho", "rizartrose"],
    alarm: [
      "Queda sobre a mão com dor na tabaqueira anatômica (escafoide: imobilizar mesmo com raio-X normal)",
      "Dedo que não dobra a ponta, ferida sobre tendão ou articulação, mordedura (cirurgia da mão hoje)",
      "Atrofia na base do polegar ou dormência constante (túnel do carpo grave: cirurgia, não órtese)",
    ],
  },
  {
    key: "lombar",
    label: "Coluna lombar",
    short: "Lombar",
    topics: ["lombalgia-aguda", "lombociatalgia-hernia-de-disco", "fratura-vertebral-osteoporotica"],
    alarm: [
      "Dificuldade para urinar ou segurar urina ou fezes, dormência na região genital, fraqueza nas duas pernas (cauda equina: hoje)",
      "Pé caído ou fraqueza que piora a cada dia (déficit progressivo: ressonância em 24–48 h)",
      "Mais de 65 anos, osteoporose ou corticoide com dor súbita (fratura vertebral: raio-X hoje)",
      "Febre, emagrecimento, câncer prévio, droga injetável ou imunossupressão (infecção ou tumor)",
    ],
  },
  {
    key: "quadril",
    label: "Quadril e virilha",
    short: "Quadril",
    topics: ["fratura-de-quadril-no-idoso", "osteoartrite-de-quadril", "sindrome-dolorosa-do-grande-trocanter", "dor-no-quadril-na-crianca"],
    alarm: [
      "Idoso que caiu e não consegue apoiar a perna, mesmo com raio-X normal (fratura de quadril: hospital hoje)",
      "Criança que manca com febre ou não quer andar (artrite séptica do quadril até prova em contrário)",
      "Adolescente com dor no quadril ou joelho e a perna rodando para fora ao fletir (epifisiólise: sem apoiar, ortopedia hoje)",
    ],
  },
  {
    key: "joelho",
    label: "Joelho",
    short: "Joelho",
    topics: ["entorse-de-joelho-ligamentos", "lesao-meniscal", "osteoartrite-de-joelho", "dor-patelofemoral", "cisto-de-baker-e-bursites-do-joelho"],
    alarm: [
      "Joelho travado que não estica (alça de balde: ortopedista em 48 h)",
      "Não consegue esticar o joelho ativamente depois de trauma (ruptura de quadríceps ou patelar, fratura de patela)",
      "Joelho frouxo em várias direções ou pulso do pé alterado (luxação de joelho: artéria poplítea — hoje)",
      "Panturrilha inchada e dolorosa de repente (trombose até o Doppler dizer o contrário)",
    ],
  },
  {
    key: "tornozelo-pe",
    label: "Tornozelo e pé",
    short: "Tornozelo e pé",
    topics: ["entorse-de-tornozelo", "fratura-de-metatarso", "tendao-de-aquiles", "fascite-plantar", "halux-valgo-e-metatarsalgia"],
    alarm: [
      "Estalo na panturrilha e não fica na ponta do pé (ruptura do Aquiles: Thompson, imobilizar em equino, ortopedista em 48 h)",
      "Dor no meio do pé com roxo na planta e não pisa na ponta (Lisfranc: tomografia hoje)",
      "Diabético com pé quente, inchado ou com ferida (infecção ou Charcot: urgência)",
    ],
  },
  {
    key: "articulacao-quente",
    label: "Articulação quente e inchada",
    short: "Articulação quente",
    topics: ["monoartrite-aguda-e-artrite-septica", "crise-de-gota"],
    alarm: [
      "Febre, calafrio ou estado geral ruim (séptica: punção e antibiótico no hospital, não AINE e casa)",
      "Prótese articular com dor nova ou fístula (infecção de prótese: ortopedista hoje, sem antibiótico antes da cultura)",
    ],
  },
];

/** Tópicos em que o trauma é a porta de entrada — com “houve trauma” marcado, vêm primeiro. */
export const TRAUMA_TOPICS: ReadonlySet<string> = new Set([
  "luxacao-e-instabilidade-do-ombro",
  "fratura-de-clavicula",
  "fratura-do-radio-distal",
  "fratura-de-escafoide",
  "fratura-vertebral-osteoporotica",
  "fratura-de-quadril-no-idoso",
  "entorse-de-joelho-ligamentos",
  "lesao-meniscal",
  "entorse-de-tornozelo",
  "fratura-de-metatarso",
  "tendao-de-aquiles",
]);

export function regionOf(slug: string): OrthoRegion | null {
  return ORTHO_REGIONS.find((r) => r.topics.includes(slug)) ?? null;
}

/** Os tópicos da região na ordem de leitura: com trauma, os de trauma primeiro; sem, os outros primeiro. */
export function orderTopics(region: OrthoRegion, trauma: boolean | null): string[] {
  if (trauma === null) return [...region.topics];
  const yes = region.topics.filter((s) => TRAUMA_TOPICS.has(s));
  const no = region.topics.filter((s) => !TRAUMA_TOPICS.has(s));
  return trauma ? [...yes, ...no] : [...no, ...yes];
}

export type ExamResult = "pos" | "neg" | "nd";

/** O que o médico marcou ao longo da consulta guiada. */
export interface ConsultAnswers {
  region: string | null;
  trauma: boolean | null;
  /** Índices do alarme marcados: "u:0" universal, "r:1" da região. */
  alarm: string[];
  topic: string | null;
  /** Índices das perguntas marcadas como positivas. */
  ask: number[];
  askNote: string;
  /** Resultado por manobra (índice → resultado); ausente = não feita. */
  exam: Record<number, ExamResult>;
  /** Alarmes do tópico marcados (índices). */
  topicAlarm: number[];
  /** Índices dos itens da receita escolhidos. */
  rx: number[];
  /** Dias de atestado, como o médico escreveu. */
  leave: string;
}

export const EMPTY_ANSWERS: ConsultAnswers = {
  region: null,
  trauma: null,
  alarm: [],
  topic: null,
  ask: [],
  askNote: "",
  exam: {},
  topicAlarm: [],
  rx: [],
  leave: "",
};

/** Os alarmes marcados, em texto, para a nota e para o aviso. */
export function alarmTexts(region: OrthoRegion | null, answers: ConsultAnswers, topic: OrthoTopic | null): string[] {
  const out: string[] = [];
  for (const key of answers.alarm) {
    const [kind, i] = key.split(":");
    const n = Number(i);
    const text = kind === "u" ? UNIVERSAL_ALARM[n] : region?.alarm[n];
    if (text) out.push(text);
  }
  if (topic) for (const i of answers.topicAlarm) if (topic.alarm[i]) out.push(topic.alarm[i]);
  return out;
}

const RESULT_LABEL: Record<ExamResult, string> = { pos: "POSITIVO", neg: "negativo", nd: "não realizado" };

/** A nota SOAP da consulta guiada, pronta para colar no atendimento. */
export function buildSoapNote(region: OrthoRegion, topic: OrthoTopic, answers: ConsultAnswers): string {
  const lines: string[] = [];
  lines.push(`ORTOPEDIA — ${topic.title}${topic.cid !== "—" ? ` (CID ${topic.cid})` : ""}`);
  lines.push(`Região: ${region.label}${answers.trauma === null ? "" : answers.trauma ? " · com trauma" : " · sem trauma"}`);
  lines.push("");

  lines.push("S — Anamnese");
  const asked = answers.ask.filter((i) => topic.ask[i]).map((i) => topic.ask[i]);
  if (asked.length) for (const a of asked) lines.push(`- ${a}: SIM`);
  else lines.push("- (nenhuma pergunta marcada como positiva)");
  if (answers.askNote.trim()) lines.push(`- Observações: ${answers.askNote.trim()}`);
  lines.push("");

  lines.push("O — Exame físico");
  const done = topic.exam.map((e, i) => ({ e, r: answers.exam[i] })).filter(({ r }) => r && r !== "nd");
  if (done.length) for (const { e, r } of done) lines.push(`- ${e.name}: ${RESULT_LABEL[r!]}${r === "pos" ? ` (${e.positive})` : ""}`);
  else lines.push("- (nenhuma manobra registrada)");
  const alarms = alarmTexts(region, answers, topic);
  lines.push(alarms.length ? `- SINAIS DE ALARME: ${alarms.join("; ")}` : "- Sem sinais de alarme.");
  lines.push("");

  lines.push("A — Hipótese");
  lines.push(`- ${topic.title}${topic.cid !== "—" ? ` — CID ${topic.cid}` : ""}`);
  lines.push("");

  lines.push("P — Conduta");
  if (alarms.length) lines.push("- ENCAMINHAMENTO NO MESMO DIA pelos sinais de alarme acima.");
  if (topic.imaging.length) lines.push(`- Imagem: ${topic.imaging[0]}`);
  for (const p of topic.plan.slice(0, 3)) lines.push(`- ${p}`);
  const rx = answers.rx.filter((i) => topic.rx[i]).map((i) => topic.rx[i]);
  if (rx.length) {
    lines.push("- Receita:");
    for (const r of rx) lines.push(`  · ${r.name} — ${r.posology}`);
  }
  if (topic.immobilize?.length) lines.push(`- Imobilização: ${topic.immobilize[0]}`);
  lines.push(`- Encaminhar: ${topic.refer[0]}`);
  lines.push(`- Atestado: ${answers.leave.trim() || topic.leave} · Retorno: ${topic.followup}`);
  lines.push("");
  lines.push("Roteiro: Guia de ortopedia Renova, revisão 1.");
  return lines.join("\n");
}

/** Qual passo a consulta está, pelo que já foi respondido. */
export type ConsultStep = "regiao" | "alarme" | "condicao" | "roteiro" | "nota";

export function stepOf(answers: ConsultAnswers): ConsultStep {
  if (!answers.region) return "regiao";
  if (answers.trauma === null) return "alarme";
  if (!answers.topic) return "condicao";
  return "roteiro";
}
