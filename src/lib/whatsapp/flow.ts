import { isoDate, validCpf } from "./br.ts";
import { REQUIRED, isNo, isYes, missingRequired, redFlags, wantsHuman } from "./triage.ts";
import type { TriageDraft } from "./triage.ts";

/**
 * As decisões do robô a cada mensagem do paciente — puras, para testar sem
 * banco nem rede. O engine.ts executa (grava, envia, chama o Gemini).
 */

export const STAGES = [
  "consentimento",
  "triagem",
  "revisao",
  "pagamento",
  "pago",
  "consulta",
  "encerrado",
  "recusado",
  "urgente",
] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  consentimento: "Aguardando consentimento",
  triagem: "Em triagem",
  revisao: "Paciente revisando o resumo",
  pagamento: "Aguardando pagamento",
  pago: "Pago — aguardando o médico",
  consulta: "Em consulta",
  encerrado: "Encerrado",
  recusado: "Não consentiu",
  urgente: "Urgência — ver agora",
};

/** gemini: triagem conversada; questionario: perguntas fixas (sem Gemini pago); off: robô calado. */
export type BotMode = "gemini" | "questionario" | "off";

export type Decision =
  | { kind: "silent" }
  | { kind: "handoff" }
  | { kind: "urgent"; flags: string[] }
  | { kind: "send_consent"; again: boolean }
  | { kind: "consent_yes" }
  | { kind: "consent_no" }
  | { kind: "triage"; correcting: boolean }
  | { kind: "confirm_review" }
  | { kind: "ask_correction" }
  | { kind: "payment_reminder" }
  | { kind: "paid_ack" };

/** Etapas em que o robô ainda fala; depois do pagamento, quem fala é o médico. */
const BOT_STAGES: ReadonlySet<Stage> = new Set(["consentimento", "triagem", "revisao", "pagamento", "pago"]);

export function decide(input: {
  stage: Stage;
  mode: BotMode;
  botPaused: boolean;
  text: string;
  buttonId: string | null;
  /** O robô já mandou alguma mensagem neste atendimento. */
  botHasSpoken: boolean;
  /** Minutos desde a última mensagem do robô (para não repetir aviso). */
  minutesSinceBot: number | null;
}): Decision {
  const { stage, text, buttonId } = input;
  if (input.mode === "off" || input.botPaused || !BOT_STAGES.has(stage)) return { kind: "silent" };
  if (wantsHuman(text)) return { kind: "handoff" };
  const flags = redFlags(text);
  if (flags.length && stage !== "pago") return { kind: "urgent", flags };

  switch (stage) {
    case "consentimento":
      if (!input.botHasSpoken) return { kind: "send_consent", again: false };
      if (isYes(text, buttonId)) return { kind: "consent_yes" };
      if (isNo(text, buttonId)) return { kind: "consent_no" };
      return { kind: "send_consent", again: true };
    case "triagem":
      return { kind: "triage", correcting: false };
    case "revisao":
      if (isYes(text, buttonId)) return { kind: "confirm_review" };
      if (buttonId === "corrigir") return { kind: "ask_correction" };
      return { kind: "triage", correcting: true };
    case "pagamento":
      return input.minutesSinceBot !== null && input.minutesSinceBot < 10 ? { kind: "silent" } : { kind: "payment_reminder" };
    case "pago":
      return input.minutesSinceBot !== null && input.minutesSinceBot < 60 ? { kind: "silent" } : { kind: "paid_ack" };
    default:
      return { kind: "silent" };
  }
}

/* ---------- Questionário (sem Gemini) ---------- */

export interface QuestionnaireStep {
  draft: TriageDraft;
  asking: string | null;
  reply: string;
  done: boolean;
}

const HINTS: Partial<Record<string, string>> = {
  cpf: "Não consegui validar esse CPF. Pode conferir e mandar de novo? (11 números)",
  nascimento: "Não entendi a data. Pode mandar assim: 31/12/1980?",
};

/**
 * Pergunta por pergunta, na ordem de REQUIRED. A resposta vai para o campo
 * perguntado por último (`asking`); CPF e data inválidos são perguntados de novo.
 */
export function questionnaireStep(draft: TriageDraft, asking: string | null, answer: string): QuestionnaireStep {
  const next: TriageDraft = { ...draft };
  const value = answer.replace(/\s+/g, " ").trim().slice(0, 1500);
  const field = REQUIRED.find((r) => r.field === asking)?.field;
  if (field && value) {
    if (field === "cpf" && !validCpf(value)) return { draft: next, asking: field, reply: HINTS.cpf as string, done: false };
    if (field === "nascimento" && !isoDate(value)) return { draft: next, asking: field, reply: HINTS.nascimento as string, done: false };
    next[field] = field === "nascimento" ? (isoDate(value) as string) : value;
  } else if (!field && value && !next.queixa && !/^(oi|ola|olá|bom dia|boa tarde|boa noite|sim|1)\W*$/i.test(value)) {
    // A primeira mensagem ("estou com dor de garganta") já é a queixa.
    next.queixa = value;
  }
  const missing = missingRequired(next);
  if (!missing.length) return { draft: next, asking: null, reply: "", done: true };
  return { draft: next, asking: missing[0].field, reply: missing[0].question, done: false };
}

/** Correção escrita no resumo, no modo questionário: anotada para o médico ver. */
export function noteCorrection(draft: TriageDraft, text: string): TriageDraft {
  const note = `Correção do paciente: ${text.replace(/\s+/g, " ").trim().slice(0, 300)}`;
  return { ...draft, alertas: [...new Set([...(draft.alertas ?? []), note])] };
}

/* ---------- Conversa → Gemini ---------- */

export interface ChatLine {
  direction: "in" | "out";
  body: string;
}

/**
 * O histórico no formato do Gemini: papéis alternados (mensagens seguidas do
 * mesmo lado viram uma só), começando pelo paciente, no máximo `limit` falas.
 */
export function geminiContents(lines: ReadonlyArray<ChatLine>, limit = 40): Array<{ role: "user" | "model"; parts: { text: string }[] }> {
  const out: Array<{ role: "user" | "model"; parts: { text: string }[] }> = [];
  for (const line of lines) {
    const body = line.body.trim();
    if (!body) continue;
    const role = line.direction === "in" ? "user" : "model";
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n${body}`;
    else out.push({ role, parts: [{ text: body }] });
  }
  let trimmed = out.slice(-limit);
  if (trimmed[0]?.role === "model") trimmed = [{ role: "user", parts: [{ text: "(início da conversa)" }] }, ...trimmed];
  return trimmed;
}

/** A janela de 24 h da Meta: fora dela, só modelo aprovado. */
export function windowOpen(lastInboundAt: Date | string | null, now = Date.now()): boolean {
  if (!lastInboundAt) return false;
  const t = new Date(lastInboundAt).getTime();
  return Number.isFinite(t) && now - t < 24 * 60 * 60 * 1000 - 5 * 60 * 1000;
}
