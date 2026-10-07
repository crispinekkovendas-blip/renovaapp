import {
  DOCUMENT_KIND_LABEL,
  defaultFieldValues,
  fieldsFor,
  isDocumentKind,
  normalizeFieldValues,
  normalizeSubkind,
} from "./documents.ts";
import type { AtestadoSubkind, DocumentKind } from "./documents.ts";
import { parseItems, serializeItems } from "./composer.ts";
import type { ComposerItem } from "./composer.ts";
import { parseItems as parsePrescriptionItems, serializeItems as serializePrescription } from "./prescription.ts";
import type { PrescriptionItem } from "./prescription.ts";

/**
 * Rascunho do compositor de documentos: o que estava montado quando o médico
 * fechou o pop-up sem emitir — a pilha, a lista do receituário e o editor.
 *
 * Só funções puras. Quem grava é `actions-drafts.ts` (banco, migração
 * 2026-09-28-rascunhos) e, sem a migração, o navegador (`LOCAL_DRAFTS_KEY`).
 * A leitura é tolerante: um rascunho torto abre o compositor vazio, nunca
 * derruba a tela.
 */

export type DraftTab = DocumentKind | "receita";

export interface DraftEditor {
  kind: DocumentKind;
  subkind: AtestadoSubkind | null;
  templateId: number | null;
  fields: Record<string, string>;
  manualBody: string | null;
  manualTitle: string | null;
}

export interface DraftState {
  tab: DraftTab;
  editor: DraftEditor;
  items: ComposerItem[];
  rx: PrescriptionItem[];
}

/** Uma linha da lista de rascunhos (banco ou navegador). */
export interface DraftSummary {
  /** Número no banco; "local-…" quando ficou no navegador. */
  id: string;
  title: string;
  /** "YYYY-MM-DD HH:MM:SS", horário de São Paulo. */
  updated_at: string;
  created_at: string;
  author: string | null;
}

/** Onde os rascunhos ficam no navegador enquanto a migração não roda. */
export const LOCAL_DRAFTS_KEY = (patientId: number) => `renova:rascunhos:${patientId}`;

export function serializeDraft(state: DraftState): string {
  return JSON.stringify({
    v: 1,
    tab: state.tab,
    editor: { ...state.editor, fields: normalizeFieldValues(state.editor.fields) },
    items: JSON.parse(serializeItems(state.items)),
    rx: JSON.parse(serializePrescription(state.rx)),
  });
}

export function parseDraft(json: string | null | undefined): DraftState | null {
  if (!json) return null;
  let raw: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    raw = parsed as Record<string, unknown>;
  } catch {
    return null;
  }
  const e = (raw.editor && typeof raw.editor === "object" ? raw.editor : {}) as Record<string, unknown>;
  const kind: DocumentKind = isDocumentKind(e.kind) ? e.kind : "atestado";
  const text = (value: unknown) => (typeof value === "string" ? value : null);
  const tab: DraftTab = raw.tab === "receita" || isDocumentKind(raw.tab) ? (raw.tab as DraftTab) : kind;
  const templateId = typeof e.templateId === "number" && Number.isInteger(e.templateId) ? e.templateId : null;
  return {
    tab,
    editor: {
      kind,
      subkind: normalizeSubkind(kind, text(e.subkind)),
      templateId,
      fields: normalizeFieldValues((e.fields ?? {}) as Record<string, unknown>),
      manualBody: text(e.manualBody),
      manualTitle: text(e.manualTitle),
    },
    items: parseItems(JSON.stringify(raw.items ?? [])),
    rx: parsePrescriptionItems(JSON.stringify(raw.rx ?? [])),
  };
}

/**
 * O editor tem algo que o médico escreveu? Modelo aplicado sem mexer não
 * conta, nem os valores padrão do formulário ("1" dia de afastamento).
 */
function editorHasContent(editor: DraftEditor): boolean {
  if (editor.manualBody?.trim() || editor.manualTitle?.trim()) return true;
  const defaults = defaultFieldValues(fieldsFor(editor.kind, editor.subkind)) as Record<string, string>;
  return Object.entries(editor.fields).some(([key, value]) => {
    const text = `${value ?? ""}`.trim();
    return text !== "" && text !== (defaults[key] ?? "").trim();
  });
}

/** Nada montado: fechar não cria rascunho (e apaga o que existia). */
export function draftIsEmpty(state: DraftState): boolean {
  return state.items.length === 0 && state.rx.length === 0 && !editorHasContent(state.editor);
}

/**
 * O resumo da lista: "Receituário · 3 medicamentos + Atestado + 2 outros".
 * Primeiro o que está na pilha, depois o receituário em montagem, depois o
 * editor com texto.
 */
export function draftTitle(state: DraftState): string {
  const parts: string[] = [];
  const rxInStack = state.items.filter((item) => item.kind === "receituario").length;
  for (const item of state.items) {
    if (item.kind === "receituario") continue;
    parts.push(item.title?.trim() || DOCUMENT_KIND_LABEL[item.kind]);
  }
  const rxCount = state.rx.filter((item) => item.name.trim()).length;
  if (rxCount > 0 || rxInStack > 0) {
    const label = rxCount > 0 ? `Receituário · ${rxCount} ${rxCount === 1 ? "medicamento" : "medicamentos"}` : "Receituário";
    parts.unshift(label);
  }
  if (editorHasContent(state.editor) && state.tab !== "receituario") {
    const label = DOCUMENT_KIND_LABEL[state.editor.kind];
    if (!parts.includes(label)) parts.push(label);
  }
  if (parts.length === 0) return "Rascunho vazio";
  if (parts.length <= 3) return parts.join(" + ");
  return `${parts.slice(0, 2).join(" + ")} + ${parts.length - 2} outros`;
}

/**
 * "hoje às 14:32", "ontem às 09:10", "25/09 às 18:00", "25/09/2025 às 18:00".
 * `stamp` e `today` no relógio de São Paulo ("YYYY-MM-DD HH:MM:SS", "YYYY-MM-DD").
 */
export function draftWhen(stamp: string, today: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(stamp);
  if (!m) return stamp;
  const [, y, mo, d, h, mi] = m;
  const time = `${h}:${mi}`;
  const day = `${y}-${mo}-${d}`;
  if (day === today) return `hoje às ${time}`;
  const t = new Date(`${today}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() - 1);
  if (day === t.toISOString().slice(0, 10)) return `ontem às ${time}`;
  return `${d}/${mo}${y === today.slice(0, 4) ? "" : `/${y}`} às ${time}`;
}
