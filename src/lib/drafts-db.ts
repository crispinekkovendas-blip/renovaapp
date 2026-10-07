import { sql } from "@/lib/db";
import type { DraftSummary } from "./drafts";

/**
 * Leitura dos rascunhos do compositor (migração 2026-09-28-rascunhos). Sem a
 * tabela, tudo devolve vazio: a ficha e o compositor seguem, e os rascunhos
 * ficam no navegador (ver `LOCAL_DRAFTS_KEY`).
 */

export async function draftsReady(): Promise<boolean> {
  try {
    await sql`SELECT 1 FROM document_drafts LIMIT 1`;
    return true;
  } catch {
    return false;
  }
}

/** Os rascunhos do paciente, o mais recente primeiro, com o nome de quem montou. */
export async function listDraftsForPatient(patientId: number): Promise<DraftSummary[]> {
  try {
    const rows = await sql<{
      id: number;
      title: string;
      updated_at: string;
      created_at: string;
      author: string | null;
    }>`
      SELECT d.id, d.title, d.updated_at, d.created_at, COALESCE(p.name, u.name) AS author
      FROM document_drafts d
      LEFT JOIN professionals p ON p.id = d.professional_id
      LEFT JOIN users u ON u.id = d.user_id
      WHERE d.patient_id = ${patientId}
      ORDER BY d.updated_at DESC, d.id DESC`;
    return rows.map((row) => ({ ...row, id: String(row.id) }));
  } catch {
    return [];
  }
}

export async function getDraft(id: number, patientId: number): Promise<{ id: number; state: string } | null> {
  try {
    const [row] = await sql<{ id: number; state: string }>`
      SELECT id, state FROM document_drafts WHERE id = ${id} AND patient_id = ${patientId}`;
    return row ?? null;
  } catch {
    return null;
  }
}

/**
 * Apaga um rascunho do paciente. Não é Server Action de propósito: quem chama
 * (Excluir, emitir) já conferiu a sessão e a permissão.
 */
export async function deleteDraft(draftId: number, patientId: number): Promise<void> {
  if (!Number.isInteger(draftId) || draftId <= 0) return;
  await sql`DELETE FROM document_drafts WHERE id = ${draftId} AND patient_id = ${patientId}`;
}
