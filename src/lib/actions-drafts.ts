"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { requireSession } from "./auth";
import { canIssueDocuments } from "./document-permissions";
import { draftIsEmpty, draftTitle, parseDraft, serializeDraft } from "./drafts.ts";
import { isMigrationPending } from "./pg-errors.ts";
import { deleteDraft } from "./drafts-db";

/**
 * Rascunhos do compositor. Quem pode emitir documento (profissional, admin)
 * pode guardar e apagar rascunho; a recepção nem abre o compositor.
 *
 * `saveDraftAction` é chamada pelo compositor ao fechar (e de tempos em tempos
 * enquanto se monta). Sem a migração volta `{ local: true }` e o compositor
 * guarda no navegador.
 */

export type SaveDraftResult = { id: number; title: string } | { local: true } | { error: string };

export async function saveDraftAction(
  patientId: number,
  draftId: number | null,
  stateJson: string
): Promise<SaveDraftResult> {
  const session = await requireSession();
  if (!canIssueDocuments(session)) return { error: "permissao" };
  if (!Number.isInteger(patientId) || patientId <= 0) return { error: "paciente" };

  const state = parseDraft(stateJson);
  if (!state) return { error: "rascunho" };
  // Tudo vazio: não há o que guardar; um rascunho que ficou vazio some.
  if (draftIsEmpty(state)) {
    if (draftId) await deleteDraft(draftId, patientId).catch(() => undefined);
    return { error: "vazio" };
  }
  const title = draftTitle(state);
  const json = serializeDraft(state);

  try {
    if (draftId) {
      const [row] = await sql<{ id: number }>`
        UPDATE document_drafts
        SET state = ${json}, title = ${title},
            updated_at = to_char(timezone('America/Sao_Paulo', now()), 'YYYY-MM-DD HH24:MI:SS')
        WHERE id = ${draftId} AND patient_id = ${patientId}
        RETURNING id`;
      if (row) {
        revalidatePath(`/pacientes/${patientId}`);
        return { id: row.id, title };
      }
      // Apagado noutro computador enquanto estava aberto: vira um rascunho novo.
    }
    const [row] = await sql<{ id: number }>`
      INSERT INTO document_drafts (patient_id, professional_id, user_id, title, state)
      VALUES (${patientId}, ${session.professionalId}, ${session.userId}, ${title}, ${json})
      RETURNING id`;
    revalidatePath(`/pacientes/${patientId}`);
    return { id: row.id, title };
  } catch (error) {
    if (isMigrationPending(error)) return { local: true };
    return { error: "banco" };
  }
}

/** "Excluir" na lista de rascunhos da ficha. */
export async function deleteDraftAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const patientId = Number(formData.get("patient_id"));
  const draftId = Number(formData.get("draft_id"));
  const back = `/pacientes/${Number.isInteger(patientId) ? patientId : ""}?aba=documentos`;
  if (!canIssueDocuments(session)) redirect(`${back}&erro=permissao`);
  if (!Number.isInteger(patientId) || !Number.isInteger(draftId) || draftId <= 0) redirect(back);
  await deleteDraft(draftId, patientId).catch(() => undefined);
  revalidatePath(`/pacientes/${patientId}`);
  redirect(`${back}&ok=rascunho_excluido`);
}
