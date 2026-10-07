import { ageFrom, fmtDate } from "../../../lib/format.ts";
import type { DocumentKind } from "../../../lib/documents.ts";

/**
 * Regras puras do prontuário (/pacientes/[id]), sem I/O nem JSX — ficam aqui
 * para as seções da ficha compartilharem e para os testes em node:test.
 */

/** "Maria da Silva" → "MS"; um nome só → uma letra. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

/** Opções do campo "Sexo" — o cadastro novo e a edição usam a mesma lista. */
export const SEX_OPTIONS = [
  { value: "F", label: "Feminino" },
  { value: "M", label: "Masculino" },
  { value: "Outro", label: "Outro" },
] as const;

/** "F" → "Feminino"; valor fora da lista aparece como veio (dado antigo). */
export function sexLabel(sex: string | null | undefined): string | null {
  if (!sex) return null;
  return SEX_OPTIONS.find((option) => option.value === sex)?.label ?? sex;
}

/** As pílulas de documento do alto da ficha, na ordem em que aparecem. */
export const DOCUMENT_SHORTCUTS: readonly { kind: DocumentKind; label: string; sub: string | null }[] = [
  { kind: "atestado", label: "Atestado", sub: "medico" },
  { kind: "encaminhamento", label: "Encaminhamento", sub: null },
  { kind: "laudo", label: "Laudo", sub: null },
  { kind: "orientacoes", label: "Orientações", sub: null },
];

/**
 * Link do compositor "Emitir documentos" já no tipo certo, amarrado ao último
 * atendimento quando há. O formato (inclusive o "&" final sem atendimento) é
 * o mesmo de antes — há links salvos e testes de ponta a ponta que dependem dele.
 */
export function emitHref(
  patientId: number,
  shortcut: Pick<(typeof DOCUMENT_SHORTCUTS)[number], "kind" | "sub">,
  latestEncounterId: number | null
): string {
  const sub = shortcut.sub ? `sub=${shortcut.sub}&` : "";
  const encounter = latestEncounterId ? `encounter=${latestEncounterId}` : "";
  return `/pacientes/${patientId}/emitir?kind=${shortcut.kind}&${sub}${encounter}`;
}

/**
 * As abas da ficha: uma coisa por vez, como no iPhone. "Mais" junta o que se
 * consulta de vez em quando (dados, anexos, consultas, financeiro).
 */
export const PATIENT_TABS = [
  { id: "resumo", label: "Resumo" },
  { id: "atendimentos", label: "Atendimentos" },
  { id: "documentos", label: "Documentos" },
  { id: "mais", label: "Mais" },
] as const;

export type PatientTab = (typeof PATIENT_TABS)[number]["id"];

/**
 * A aba aberta. Os links antigos continuam chegando ao lugar certo:
 * `?editar=1` (editar dados) abre "Mais" e `?atender=1` (novo atendimento)
 * abre "Atendimentos". Aba desconhecida → Resumo.
 */
export function patientTab(query: { aba?: string; editar?: string; atender?: string }): PatientTab {
  if (query.editar === "1") return "mais";
  if (query.atender === "1") return "atendimentos";
  return PATIENT_TABS.find((tab) => tab.id === query.aba)?.id ?? "resumo";
}

export function patientTabHref(patientId: number, tab: PatientTab): string {
  return tab === "resumo" ? `/pacientes/${patientId}` : `/pacientes/${patientId}?aba=${tab}`;
}

export interface PatientFactsInput {
  cpf: string | null;
  birth_date: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  insurance: string | null;
  insurance_number: string | null;
  city: string | null;
}

/** Linhas "rótulo → valor" do cartão "Dados do paciente"; só o que está preenchido. */
export function patientFacts(patient: PatientFactsInput): { label: string; value: string }[] {
  const rows: [string, string | null][] = [
    ["CPF", patient.cpf],
    ["Nascimento", patient.birth_date ? `${fmtDate(patient.birth_date)} (${ageFrom(patient.birth_date)})` : null],
    ["Sexo", sexLabel(patient.sex)],
    ["Telefone", patient.phone],
    ["E-mail", patient.email],
    ["Convênio", patient.insurance ?? "Particular"],
    ["Carteirinha", patient.insurance_number],
    ["Cidade", patient.city],
  ];
  return rows.flatMap(([label, value]) => (value ? [{ label, value }] : []));
}

/**
 * Segunda linha da busca de pacientes: "nome civil: …" quando há nome social,
 * e o CPF. Vazio → null (a linha não aparece).
 */
export function civilNameAndCpf(patient: { name: string; social_name?: string | null; cpf: string | null }): string | null {
  const parts = [patient.social_name?.trim() ? `nome civil: ${patient.name}` : null, patient.cpf].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** "1 atendimento" / "3 atendimentos". */
export function encounterCountLabel(count: number): string {
  return `${count} atendimento${count === 1 ? "" : "s"}`;
}

/** Avisos que voltam das actions pela URL (?ok= / ?erro=). */
export const CHART_FLASH = {
  ok: {
    cadastro: { tone: "ok", text: "Alergias e medicamentos da pré-consulta copiados para o cadastro." },
    rascunho_excluido: { tone: "ok", text: "Rascunho excluído." },
  },
  erro: {
    migracao: {
      tone: "erro",
      text: "Este recurso depende da migração 2026-09-09 (alergias e medicamentos no cadastro). Rode a migração no Supabase e tente de novo.",
    },
    nada: { tone: "aviso", text: "Essa pré-consulta não trouxe alergias nem medicamentos para copiar." },
    permissao: {
      tone: "aviso",
      text: "Documento médico é emitido pelo profissional (ou pelo administrador). A recepção pode imprimir e enviar os já emitidos.",
    },
  },
} as const;

export type FlashTone = "ok" | "erro" | "aviso";
export interface ChartFlashMessage {
  tone: FlashTone;
  text: string;
}

/** Os avisos a mostrar, na ordem de antes (ok primeiro). Chave desconhecida → nada. */
export function chartFlashMessages(ok: string | undefined, erro: string | undefined): ChartFlashMessage[] {
  const out: ChartFlashMessage[] = [];
  if (ok && Object.hasOwn(CHART_FLASH.ok, ok)) out.push(CHART_FLASH.ok[ok as keyof typeof CHART_FLASH.ok]);
  if (erro && Object.hasOwn(CHART_FLASH.erro, erro)) out.push(CHART_FLASH.erro[erro as keyof typeof CHART_FLASH.erro]);
  return out;
}
