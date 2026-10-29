import { formatCpf, isoDate, validCpf } from "./br.ts";

/**
 * A triagem pelo WhatsApp: o Gemini conversa com o paciente e preenche uma
 * FICHA (rascunho). Nada aqui vai para o prontuário sozinho — o médico
 * confere e confirma. Este módulo é puro: o formato da ficha, o que ainda
 * falta perguntar, os sinais de urgência e o texto que o paciente revisa.
 */

export interface TriageDraft {
  nome?: string;
  cpf?: string;
  nascimento?: string;
  sexo?: string;
  cidade?: string;
  email?: string;
  /** Queixa principal, nas palavras do paciente. */
  queixa?: string;
  /** História da queixa: início, duração, intensidade, o que melhora ou piora. */
  historia?: string;
  sintomas?: string[];
  doencas?: string;
  cirurgias?: string;
  medicamentos?: string;
  alergias?: string;
  gestante?: string;
  habitos?: string;
  /** Medidas que o paciente informou (peso, altura, pressão, temperatura, glicemia). */
  medidas?: string;
  /** O que o paciente espera: receita, atestado, orientação, pedido de exame… */
  objetivo?: string;
  alertas?: string[];
}

export const TEXT_FIELDS = [
  "nome",
  "cpf",
  "nascimento",
  "sexo",
  "cidade",
  "email",
  "queixa",
  "historia",
  "doencas",
  "cirurgias",
  "medicamentos",
  "alergias",
  "gestante",
  "habitos",
  "medidas",
  "objetivo",
] as const satisfies ReadonlyArray<keyof TriageDraft>;
type TextField = (typeof TEXT_FIELDS)[number];

export const FIELD_LABELS: Record<TextField | "sintomas" | "alertas", string> = {
  nome: "Nome completo",
  cpf: "CPF",
  nascimento: "Nascimento",
  sexo: "Sexo",
  cidade: "Cidade",
  email: "E-mail",
  queixa: "Queixa principal",
  historia: "História",
  sintomas: "Sintomas",
  doencas: "Doenças / condições",
  cirurgias: "Cirurgias / internações",
  medicamentos: "Medicamentos em uso",
  alergias: "Alergias",
  gestante: "Gestação / amamentação",
  habitos: "Hábitos",
  medidas: "Medidas informadas",
  objetivo: "O que espera da consulta",
  alertas: "Sinais de alerta",
};

/**
 * Sem estes a triagem não termina — "nega" ou "nenhum" contam como resposta.
 * A pergunta é a que sai quando o Gemini quer terminar antes da hora.
 */
export const REQUIRED: ReadonlyArray<{ field: TextField; question: string }> = [
  { field: "nome", question: "Qual é o seu nome completo?" },
  { field: "cpf", question: "Qual é o seu CPF? (só os números)" },
  { field: "nascimento", question: "Qual é a sua data de nascimento? (dia/mês/ano)" },
  { field: "queixa", question: "Qual é o motivo principal da consulta?" },
  { field: "historia", question: "Desde quando isso começou e como tem evoluído?" },
  { field: "medicamentos", question: "Você usa algum medicamento? Se sim, quais e como toma? (se não usa, responda \"nenhum\")" },
  { field: "alergias", question: "Você tem alergia a algum medicamento ou alimento? (se não tem, responda \"nenhuma\")" },
  { field: "doencas", question: "Tem alguma doença crônica, como pressão alta, diabetes ou asma? (se não tem, responda \"nenhuma\")" },
];

const MAX_TEXT = 1500;

function clean(value: unknown, max = MAX_TEXT): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const s = String(value).replace(/\s+/g, " ").trim().slice(0, max);
  return s || undefined;
}

function cleanList(value: unknown): string[] | undefined {
  const items = (Array.isArray(value) ? value : typeof value === "string" ? value.split(/[;\n]/) : [])
    .map((v) => clean(v, 200))
    .filter((v): v is string => Boolean(v));
  return items.length ? [...new Set(items)].slice(0, 30) : undefined;
}

/** A ficha lida com tolerância (banco ou resposta do Gemini): campos desconhecidos caem fora. */
export function normalizeDraft(raw: unknown): TriageDraft {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out: TriageDraft = {};
  for (const field of TEXT_FIELDS) {
    const v = clean(src[field]);
    if (v) out[field] = v;
  }
  if (out.cpf) out.cpf = validCpf(out.cpf) ? formatCpf(out.cpf) : out.cpf;
  if (out.nascimento) out.nascimento = isoDate(out.nascimento) ?? out.nascimento;
  const sintomas = cleanList(src.sintomas);
  if (sintomas) out.sintomas = sintomas;
  const alertas = cleanList(src.alertas);
  if (alertas) out.alertas = alertas;
  return out;
}

export function parseDraft(json: string | null | undefined): TriageDraft {
  try {
    return normalizeDraft(JSON.parse(json || "{}"));
  } catch {
    return {};
  }
}

/** O que veio agora completa a ficha; vazio nunca apaga o que já havia. Listas somam. */
export function mergeDraft(current: TriageDraft, update: unknown): TriageDraft {
  const next = normalizeDraft(update);
  const out: TriageDraft = { ...current };
  for (const field of TEXT_FIELDS) if (next[field]) out[field] = next[field];
  for (const list of ["sintomas", "alertas"] as const) {
    const merged = [...new Set([...(current[list] ?? []), ...(next[list] ?? [])])];
    if (merged.length) out[list] = merged.slice(0, 30);
  }
  return out;
}

/** Campo obrigatório que ainda falta (ou está inválido, como o CPF). */
export function missingRequired(draft: TriageDraft): Array<{ field: TextField; question: string }> {
  return REQUIRED.filter(({ field }) => {
    const v = draft[field];
    if (!v) return true;
    if (field === "cpf") return !validCpf(v);
    if (field === "nascimento") return !isoDate(v);
    return false;
  });
}

/* ---------- Urgência ---------- */

/**
 * Sinais de alarme detectados por regra, antes de qualquer IA: se aparecem,
 * a triagem para e o paciente é orientado a procurar emergência. É uma rede
 * de segurança, não um diagnóstico — o Gemini também marca urgência.
 */
const RED_FLAGS: ReadonlyArray<{ re: RegExp; label: string }> = [
  { re: /dor (forte |muito forte |intensa )?no peito|dor tor[aá]cica|aperto no peito/, label: "dor no peito" },
  { re: /falta de ar (forte|intensa|em repouso)|n[aã]o consigo respirar|sufoca/, label: "falta de ar intensa" },
  { re: /desmai|perdi a consci[eê]ncia|desacordad/, label: "desmaio" },
  { re: /convuls|crise convulsiva/, label: "convulsão" },
  { re: /boca torta|rosto torto|n[aã]o consigo mexer (o|a) (bra[cç]o|perna|lado)|fala enrolada|perdi a for[cç]a de um lado/, label: "sinais de AVC" },
  { re: /me matar|suic[ií]d|tirar (a )?minha (pr[oó]pria )?vida|n[aã]o quero mais viver/, label: "risco de suicídio" },
  { re: /sangramento (forte|intenso|que n[aã]o para)|vomitando sangue|v[oô]mito com sangue|fezes pretas/, label: "sangramento importante" },
  { re: /gr[aá]vida.{0,40}sangra|sangra.{0,40}gr[aá]vida/, label: "sangramento na gestação" },
  { re: /incha(ço|ndo|da|do)? (a |na )?(boca|l[ií]ngua|garganta)|garganta fechando/, label: "possível anafilaxia" },
];

export function redFlags(text: string): string[] {
  const t = text.toLowerCase();
  return RED_FLAGS.filter(({ re }) => re.test(t)).map(({ label }) => label);
}

export const URGENT_REPLY =
  "⚠️ Pelo que você descreveu, isso pode ser uma urgência e não deve esperar uma teleconsulta.\n\n" +
  "Procure agora o pronto-socorro mais próximo ou ligue *192 (SAMU)*. " +
  "Se for o caso de alguém em risco de tirar a própria vida, ligue também *188 (CVV)*, 24 horas.\n\n" +
  "Nossa equipe foi avisada e verá esta conversa.";

/* ---------- Respostas curtas ---------- */

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function isYes(text: string, buttonId?: string | null): boolean {
  if (buttonId) return /^(sim|consentir|confirmar|ok)$/.test(buttonId);
  const t = fold(text);
  // Só respostas inteiras: "sim, mas o CPF está errado" é uma correção, não um sim.
  return /^(1|s|sim|sim (aceito|concordo|confirmo|esta certo|esta correto|ta certo|correto|pode|pode seguir)|aceito|eu aceito|concordo|confirmo|confirmado|correto|esta correto|certo|ok|okay|pode|pode seguir|isso|isso mesmo|esta certo|ta certo|tudo certo)$/.test(
    t,
  );
}

export function isNo(text: string, buttonId?: string | null): boolean {
  if (buttonId) return /^(nao|recusar)$/.test(buttonId);
  const t = fold(text);
  return /^(2|n|nao|nao aceito|nao concordo|recuso|nao quero)$/.test(t);
}

/** Paciente pedindo uma pessoa: o robô pausa e a equipe assume. */
export function wantsHuman(text: string): boolean {
  return /\b(atendente|humano|pessoa de verdade|falar com (alguem|uma pessoa|a recepcao|a secretaria))\b/.test(fold(text));
}

/* ---------- O que o paciente revisa ---------- */

export function draftLines(draft: TriageDraft, fields?: ReadonlyArray<keyof TriageDraft>): string[] {
  const order: Array<keyof TriageDraft> = fields
    ? [...fields]
    : ["nome", "cpf", "nascimento", "sexo", "cidade", "queixa", "historia", "sintomas", "doencas", "cirurgias", "medicamentos", "alergias", "gestante", "habitos", "medidas", "objetivo"];
  const out: string[] = [];
  for (const field of order) {
    const v = draft[field];
    if (!v || (Array.isArray(v) && !v.length)) continue;
    let shown = Array.isArray(v) ? v.join(", ") : v;
    if (field === "nascimento" && isoDate(shown)) {
      const [y, m, d] = shown.split("-");
      shown = `${d}/${m}/${y}`;
    }
    out.push(`*${FIELD_LABELS[field]}:* ${shown}`);
  }
  return out;
}

export function summaryForPatient(draft: TriageDraft): string {
  return [
    "📋 *Resumo da sua triagem*",
    "",
    ...draftLines(draft),
    "",
    "Confira com atenção. Se estiver tudo certo, toque em *Está correto*. " +
      "Se algo estiver errado ou faltando, escreva aqui a correção.",
  ].join("\n");
}

/* ---------- Gemini ---------- */

export interface TriageTurn {
  resposta: string;
  ficha: TriageDraft;
  completa: boolean;
  urgencia: boolean;
  motivoUrgencia: string | null;
}

/** O esquema da resposta (JSON) que o Gemini devolve a cada mensagem do paciente. */
export const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    resposta: { type: "string", description: "A próxima mensagem para o paciente, em português, curta." },
    ficha: {
      type: "object",
      properties: Object.fromEntries([
        ...TEXT_FIELDS.map((f) => [f, { type: "string" }]),
        ["sintomas", { type: "array", items: { type: "string" } }],
        ["alertas", { type: "array", items: { type: "string" } }],
      ]),
    },
    completa: { type: "boolean" },
    urgencia: { type: "boolean" },
    motivo_urgencia: { type: "string" },
  },
  required: ["resposta", "ficha", "completa", "urgencia"],
} as const;

export function triageSystemPrompt(opts: {
  clinic: string;
  draft: TriageDraft;
  extraInstructions?: string;
  today: string;
  correcting?: boolean;
}): string {
  const missing = missingRequired(opts.draft).map((m) => FIELD_LABELS[m.field]);
  return [
    `Você é a assistente de triagem da ${opts.clinic}, conversando pelo WhatsApp com um paciente que quer uma teleconsulta.`,
    "Seu papel é COLETAR informações para o médico — você NÃO dá diagnóstico, NÃO indica remédio, NÃO dá dose e NÃO diz que é nada grave.",
    "Se o paciente pedir opinião médica, diga com gentileza que o médico vai avaliar na consulta.",
    "",
    "Como conversar:",
    "- Português do Brasil, tom acolhedor e profissional, frases curtas. Trate por \"você\".",
    "- UMA ou no máximo DUAS perguntas por mensagem. Nada de listas longas.",
    "- Aproveite tudo o que o paciente já contou; não pergunte de novo o que já está na ficha.",
    "- Explore a queixa como um médico faria: início, duração, intensidade (0–10), localização, o que melhora/piora, sintomas associados, febre, tratamentos já tentados.",
    "- Pergunte sobre gestação/amamentação só quando fizer sentido (mulher em idade fértil e queixa relevante).",
    "- Mensagens que começam com [áudio] são a transcrição de um áudio do paciente.",
    "- Se aparecer um sinal de alarme (dor no peito, falta de ar intensa, desmaio, convulsão, sinais de AVC, sangramento importante, ideação suicida, reação alérgica grave, piora rápida em criança ou idoso), marque urgencia=true e explique o motivo em motivo_urgencia.",
    "",
    "A ficha:",
    "- Em `ficha`, devolva SÓ os campos que você aprendeu ou corrigiu nesta mensagem (o resto continua como está).",
    "- `nascimento` no formato AAAA-MM-DD; `cpf` só com números; `alertas` = sinais de alarme ou pontos que o médico precisa ver primeiro.",
    "- Use as palavras do paciente; não invente nada. \"Nenhuma\"/\"nega\" é resposta válida.",
    `- Campos obrigatórios que ainda faltam: ${missing.length ? missing.join(", ") : "nenhum"}.`,
    "- Marque completa=true só quando não faltar nenhum obrigatório E a queixa estiver bem explorada. Nesse caso, a `resposta` é só um agradecimento curto (o resumo é enviado em seguida pelo sistema).",
    opts.correcting
      ? "- O paciente está CORRIGINDO o resumo que recebeu: aplique a correção na ficha e marque completa=true se nada mais faltar."
      : "",
    "",
    `Hoje é ${opts.today}.`,
    `Ficha atual (JSON): ${JSON.stringify(opts.draft)}`,
    opts.extraInstructions ? `\nInstruções do médico para a triagem:\n${opts.extraInstructions}` : "",
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/** Lê a resposta do Gemini (JSON, às vezes entre ```), com tolerância. */
export function parseTriageTurn(raw: string): TriageTurn | null {
  const body = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(body) as Record<string, unknown>;
  } catch {
    const m = body.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      data = JSON.parse(m[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  const resposta = clean(data.resposta, 3000);
  if (!resposta) return null;
  return {
    resposta,
    ficha: normalizeDraft(data.ficha),
    completa: data.completa === true,
    urgencia: data.urgencia === true,
    motivoUrgencia: clean(data.motivo_urgencia, 300) ?? null,
  };
}
