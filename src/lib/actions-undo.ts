"use server";

import { revalidatePath } from "next/cache";
import { sql } from "./db";
import { requireSession } from "./auth";
import { revertAppointmentStatusAction } from "./actions-agenda";
import { isUndoKind } from "./flash.ts";

/**
 * O "Desfazer" do aviso. Só entra aqui o que volta atrás sem perder nada:
 * cada caso confere que o registro ainda está como a ação o deixou — se
 * alguém mexeu nele no meio do caminho, recusa em vez de adivinhar.
 *
 * Devolve a mensagem de erro, ou `null` quando desfez.
 */
export async function undoFlashAction(kind: string, id: number): Promise<string | null> {
  const session = await requireSession();
  if (!isUndoKind(kind) || !Number.isInteger(id) || id <= 0) return "Não foi possível desfazer.";

  switch (kind) {
    case "consulta": {
      // Reabre a consulta concluída. A cobrança pendente que a conclusão gerou sai
      // junto; se já foi paga, o `revert` recusa (apagar pagamento é pior).
      const [appointment] = await sql<{ status: string }>`SELECT status FROM appointments WHERE id = ${id}`;
      if (!appointment || appointment.status !== "concluido") return "Essa consulta não está mais como concluída.";
      const form = new FormData();
      form.set("id", String(id));
      return revertAppointmentStatusAction(form);
    }
    case "pagamento": {
      if (session.role !== "admin" && session.role !== "recepcao") return "Seu perfil não pode alterar pagamentos.";
      const rows = await sql`
        UPDATE payments SET status = 'pendente', paid_at = NULL WHERE id = ${id} AND status = 'pago' RETURNING id`;
      if (rows.length === 0) return "Esse lançamento não está mais como recebido.";
      break;
    }
    case "espera": {
      const rows = await sql`
        UPDATE waitlist SET status = 'aguardando' WHERE id = ${id} AND status = 'removido' RETURNING id`;
      if (rows.length === 0) return "Essa entrada não está mais como removida.";
      break;
    }
    case "retorno": {
      // Só é oferecido quando foi o "tratado" que preencheu a coluna (ver dismissRecallAction).
      await sql`UPDATE encounters SET return_reminded_at = NULL WHERE id = ${id}`;
      break;
    }
  }

  revalidatePath("/", "layout");
  return null;
}
