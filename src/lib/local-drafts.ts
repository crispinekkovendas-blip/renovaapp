import { LOCAL_DRAFTS_KEY, draftTitle, parseDraft, serializeDraft } from "./drafts.ts";
import type { DraftState, DraftSummary } from "./drafts.ts";

/**
 * Rascunhos guardados no navegador — só enquanto a migração
 * 2026-09-28-rascunhos não roda (ou se o banco falhar ao salvar). Mesmo
 * formato da lista do banco, para a ficha mostrar os dois juntos.
 *
 * localStorage pode não existir ou estourar (janela anônima, site data
 * bloqueado): cada acesso fica num try e o pior caso é não guardar.
 */

interface StoredDraft extends DraftSummary {
  state: string;
}

/** "2026-09-28 14:32:05", no relógio de quem está usando (é o mesmo fuso da clínica). */
function nowStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function readAll(patientId: number): StoredDraft[] {
  try {
    const raw = window.localStorage.getItem(LOCAL_DRAFTS_KEY(patientId));
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as StoredDraft[]).filter((d) => d && typeof d.id === "string") : [];
  } catch {
    return [];
  }
}

function writeAll(patientId: number, list: StoredDraft[]): void {
  try {
    if (list.length === 0) window.localStorage.removeItem(LOCAL_DRAFTS_KEY(patientId));
    else window.localStorage.setItem(LOCAL_DRAFTS_KEY(patientId), JSON.stringify(list));
  } catch {
    // Sem espaço ou sem acesso: o rascunho só não fica guardado.
  }
}

export function listLocalDrafts(patientId: number): DraftSummary[] {
  return readAll(patientId)
    .map(({ state: _state, ...summary }) => summary)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function readLocalDraft(patientId: number, id: string): DraftState | null {
  return parseDraft(readAll(patientId).find((d) => d.id === id)?.state);
}

/** Grava (ou atualiza) e devolve o id. `id` null cria um novo. */
export function saveLocalDraft(patientId: number, id: string | null, state: DraftState): string {
  const list = readAll(patientId);
  const stamp = nowStamp();
  const existing = id ? list.find((d) => d.id === id) : undefined;
  const draftId = existing?.id ?? id ?? `local-${Date.now()}`;
  const entry: StoredDraft = {
    id: draftId,
    title: draftTitle(state),
    created_at: existing?.created_at ?? stamp,
    updated_at: stamp,
    author: null,
    state: serializeDraft(state),
  };
  writeAll(patientId, [entry, ...list.filter((d) => d.id !== draftId)]);
  return draftId;
}

export function removeLocalDraft(patientId: number, id: string): void {
  writeAll(
    patientId,
    readAll(patientId).filter((d) => d.id !== id)
  );
}
