import { draftLines } from "./triage.ts";
import type { TriageDraft } from "./triage.ts";

/**
 * O resumo da teleconsulta: o Gemini lê a triagem e a conversa do médico com
 * o paciente e devolve os campos do atendimento. É sempre uma SUGESTÃO — o
 * médico edita tudo antes de salvar no prontuário.
 */

export interface ConsultSummary {
  queixa: string;
  anamnese: string;
  exame: string;
  diagnostico: string;
  cid: string;
  conduta: string;
  prescricao: string;
  alergias: string[];
  medicamentos: string[];
  alertas: string[];
  retornoDias: number | null;
}

export const SUMMARY_SCHEMA = {
  type: "object",
  properties: {
    queixa: { type: "string" },
    anamnese: { type: "string" },
    exame: { type: "string" },
    diagnostico: { type: "string" },
    cid: { type: "string" },
    conduta: { type: "string" },
    prescricao: { type: "string" },
    alergias: { type: "array", items: { type: "string" } },
    medicamentos: { type: "array", items: { type: "string" } },
    alertas: { type: "array", items: { type: "string" } },
    retorno_dias: { type: "integer" },
  },
  required: ["queixa", "anamnese", "conduta"],
} as const;

export interface TranscriptLine {
  author: string;
  body: string;
}

export function summarySystemPrompt(): string {
  return [
    "Você organiza o registro de uma teleconsulta feita pelo WhatsApp, para o prontuário médico.",
    "Use SOMENTE o que está na triagem e na conversa. Não invente exame físico, diagnóstico, dose ou medicamento que o médico não disse.",
    "Campos:",
    "- queixa: a queixa principal, curta.",
    "- anamnese: história clínica organizada (início, evolução, sintomas, antecedentes relevantes), em texto corrido.",
    "- exame: o que foi observado/informado na teleconsulta (sinais referidos, medidas informadas, achados em foto/vídeo citados pelo médico). Vazio se nada.",
    "- diagnostico: hipótese(s) que o MÉDICO mencionou. Vazio se ele não mencionou.",
    "- cid: código CID-10 só se o médico citou ou se a hipótese do médico for inequívoca; senão vazio.",
    "- conduta: orientações, exames pedidos, encaminhamentos e sinais de retorno que o médico deu.",
    "- prescricao: os medicamentos que o MÉDICO prescreveu, um por linha, com a posologia exatamente como ele disse. Vazio se não prescreveu.",
    "- alergias: TODAS as alergias citadas (triagem + conversa). \"Nega\" não entra na lista.",
    "- medicamentos: medicamentos de uso contínuo do paciente.",
    "- alertas: o que o médico precisa ver primeiro numa próxima consulta (alergia grave, gestação, interação, sinal de alarme).",
    "- retorno_dias: se o médico falou em retorno (ex.: \"volte em 15 dias\"), o número de dias; senão omita.",
    "Escreva em português, linguagem técnica de prontuário, sem floreios.",
  ].join("\n");
}

export function summaryUserPrompt(draft: TriageDraft, transcript: ReadonlyArray<TranscriptLine>): string {
  return [
    "TRIAGEM (respondida pelo paciente):",
    ...draftLines(draft).map((l) => l.replace(/\*/g, "")),
    "",
    "CONVERSA DA TELECONSULTA:",
    ...transcript.map((t) => `${t.author}: ${t.body}`),
  ].join("\n");
}

const str = (v: unknown, max = 4000): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const list = (v: unknown): string[] =>
  Array.isArray(v)
    ? [...new Set(v.map((x) => str(x, 200)).filter((x) => x && !/^(nega|nenhum|nenhuma|n[aã]o)\b/i.test(x)))].slice(0, 30)
    : [];

export function parseConsultSummary(raw: string): ConsultSummary | null {
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
  const days = Math.round(Number(data.retorno_dias));
  const cid = str(data.cid, 12).toUpperCase();
  return {
    queixa: str(data.queixa, 500),
    anamnese: str(data.anamnese),
    exame: str(data.exame),
    diagnostico: str(data.diagnostico, 1000),
    cid: /^[A-Z]\d{2}(\.?\d{1,2})?$/.test(cid) ? cid : "",
    conduta: str(data.conduta),
    prescricao: str(data.prescricao),
    alergias: list(data.alergias),
    medicamentos: list(data.medicamentos),
    alertas: list(data.alertas),
    retornoDias: Number.isFinite(days) && days > 0 && days <= 365 ? days : null,
  };
}

/** Sem Gemini (ou se ele falhar): a triagem vira o ponto de partida do atendimento. */
export function summaryFromDraft(draft: TriageDraft): ConsultSummary {
  const anamnese = [
    draft.historia,
    draft.sintomas?.length ? `Sintomas: ${draft.sintomas.join(", ")}.` : "",
    draft.doencas ? `Antecedentes: ${draft.doencas}.` : "",
    draft.cirurgias ? `Cirurgias/internações: ${draft.cirurgias}.` : "",
    draft.habitos ? `Hábitos: ${draft.habitos}.` : "",
    draft.gestante ? `Gestação/amamentação: ${draft.gestante}.` : "",
    draft.objetivo ? `Espera da consulta: ${draft.objetivo}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const negative = (s?: string) => !s || /^(nega|nenhum|nenhuma|n[aã]o)\b/i.test(s);
  return {
    queixa: draft.queixa ?? "",
    anamnese,
    exame: draft.medidas ? `Medidas informadas pelo paciente: ${draft.medidas}` : "",
    diagnostico: "",
    cid: "",
    conduta: "",
    prescricao: "",
    alergias: negative(draft.alergias) ? [] : [draft.alergias as string],
    medicamentos: negative(draft.medicamentos) ? [] : [draft.medicamentos as string],
    alertas: draft.alertas ?? [],
    retornoDias: null,
  };
}
