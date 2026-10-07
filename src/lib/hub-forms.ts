/**
 * O que o paciente manda pelo portal (`/p/[token]`): pedido de remarcação,
 * avaliação da consulta, pré-consulta e pedido de renovação de receita. Aqui
 * ficam só validação, normalização e textos — funções puras, sem banco,
 * testadas em hub-forms.test.mjs. As Server Actions em actions-hub.ts
 * verificam o token, chamam isto e gravam.
 */

/** Tipos de envio do portal; o CHECK de `hub_submissions.kind` é esta mesma lista. */
export const HUB_KINDS = ["remarcacao", "avaliacao", "pre_consulta", "renovacao"] as const;
export type HubKind = (typeof HUB_KINDS)[number];

export const HUB_KIND_LABEL: Record<HubKind, string> = {
  remarcacao: "Pedido de remarcação",
  avaliacao: "Avaliação da consulta",
  pre_consulta: "Pré-consulta",
  renovacao: "Pedido de renovação de receita",
};

export const RESCHEDULE_MAX = 500;
export const RATING_COMMENT_MAX = 300;
export const PRE_CONSULT_MAX = 500;
export const RENEWAL_MAX = 300;

/**
 * Texto livre vindo de um formulário: só string conta; quebras viram `\n`,
 * espaços nas pontas somem e o resultado é cortado em `max` caracteres
 * (por code point, para nunca partir um emoji ao meio).
 */
export function normalizeText(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  const text = input.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  const chars = Array.from(text);
  return chars.length > max ? chars.slice(0, max).join("").trimEnd() : text;
}

/** Nota de 1 a 5, inteira; qualquer outra coisa é null. */
export function parseRating(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = typeof input === "number" ? input : Number(String(input).trim());
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
}

/** Checkbox "pode publicar": só um sim explícito vira 1. */
export function parsePublish(input: unknown): 0 | 1 {
  const value = String(input ?? "").trim().toLowerCase();
  return value === "1" || value === "on" || value === "true" || value === "sim" ? 1 : 0;
}

export interface PreConsultAnswers {
  motivo: string;
  sintomas: string;
  medicamentos: string;
  alergias: string;
}

export const PRE_CONSULT_FIELDS: ReadonlyArray<{ key: keyof PreConsultAnswers; label: string; hint: string }> = [
  { key: "motivo", label: "Motivo da consulta", hint: "Ex.: retorno, check-up, uma dor que não passa" },
  { key: "sintomas", label: "Sintomas e desde quando", hint: "Ex.: tosse seca há duas semanas" },
  {
    key: "medicamentos",
    label: "Medicamentos em uso",
    hint: "Nome e dose, se souber. Se não usa nenhum, pode deixar em branco",
  },
  { key: "alergias", label: "Alergias", hint: "Remédios, alimentos ou outras. Se não tem, pode deixar em branco" },
];

/** As quatro respostas, cada uma aparada e limitada; null quando o paciente não escreveu nada. */
export function normalizePreConsult(raw: Record<string, unknown>): PreConsultAnswers | null {
  const answers: PreConsultAnswers = {
    motivo: normalizeText(raw.motivo, PRE_CONSULT_MAX),
    sintomas: normalizeText(raw.sintomas, PRE_CONSULT_MAX),
    medicamentos: normalizeText(raw.medicamentos, PRE_CONSULT_MAX),
    alergias: normalizeText(raw.alergias, PRE_CONSULT_MAX),
  };
  return Object.values(answers).some((value) => value !== "") ? answers : null;
}

/** Lê o JSON gravado em `hub_submissions.answers`; tolerante a lixo e a chaves faltando. */
export function parsePreConsultAnswers(json: string | null | undefined): PreConsultAnswers | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return normalizePreConsult(parsed as Record<string, unknown>);
  } catch {
    return null;
  }
}

/* ---------- Renovação de receita ---------- */

export interface RenewalAnswers {
  /** Id da receita na Memed (`memed_prescriptions.memed_prescription_id`). */
  memed_prescription_id: string;
  /** `created_at` da receita ("YYYY-MM-DD HH:MM:SS"), para a recepção saber qual é. */
  prescription_created_at: string;
}

/** O JSON gravado em `hub_submissions.answers` de um pedido de renovação. */
export function serializeRenewalAnswers(answers: RenewalAnswers): string {
  return JSON.stringify({
    memed_prescription_id: String(answers.memed_prescription_id),
    prescription_created_at: String(answers.prescription_created_at ?? ""),
  });
}

/** Lê o JSON de um pedido de renovação; null sem id de receita. */
export function parseRenewalAnswers(json: string | null | undefined): RenewalAnswers | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const obj = parsed as Record<string, unknown>;
    const id = typeof obj.memed_prescription_id === "string" ? obj.memed_prescription_id.trim() : "";
    if (!id) return null;
    const createdAt = typeof obj.prescription_created_at === "string" ? obj.prescription_created_at : "";
    return { memed_prescription_id: id, prescription_created_at: createdAt };
  } catch {
    return null;
  }
}

/** Resposta pronta da recepção, no WhatsApp, a um pedido de renovação. */
export function renewalReplyMessage(input: {
  patientName: string;
  clinicName: string;
  /** dd/mm/aaaa da receita original, ou "" */
  prescriptionDate: string;
}): string {
  const first = firstNameOf(input.patientName);
  const which = input.prescriptionDate ? ` da receita de ${input.prescriptionDate}` : "";
  return (
    `Olá ${first}! Aqui é da ${input.clinicName}. Recebemos seu pedido de renovação${which}. ` +
    `Vamos avaliar e te avisamos por aqui assim que a nova receita estiver disponível no seu portal.`
  );
}

/* ---------- Cadastro a partir da pré-consulta ---------- */

/** Linhas de um campo "uma por linha": aparadas, sem vazias. */
export function splitLines(text: string | null | undefined): string[] {
  return (text ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Junta o que veio da pré-consulta ao que já está no cadastro, uma linha por
 * item, sem repetir (comparação sem caixa) e sem apagar nada do que já havia.
 */
export function appendLines(existing: string | null | undefined, incoming: string | null | undefined): string {
  const out = splitLines(existing);
  const seen = new Set(out.map((line) => line.toLowerCase()));
  for (const line of splitLines(incoming)) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out.join("\n");
}

/** "★★★★☆" — fora de 1..5 vira cinco estrelas vazias. */
export function starsText(rating: number | null | undefined): string {
  const n = parseRating(rating) ?? 0;
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** Resposta pronta da recepção, no WhatsApp, a um pedido de remarcação. */
export function rescheduleReplyMessage(input: {
  patientName: string;
  clinicName: string;
  /** dd/mm/aaaa */
  date: string;
  time: string;
}): string {
  const first = firstNameOf(input.patientName);
  return (
    `Olá ${first}! Aqui é da ${input.clinicName}. Vimos seu pedido para remarcar a consulta ` +
    `de ${input.date} às ${input.time} — vamos achar um horário bom pra você. Qual dia e período ficam melhores?`
  );
}
