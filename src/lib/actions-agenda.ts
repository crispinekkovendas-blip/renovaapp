"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { getSession } from "./auth";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function optional(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value === "" ? null : value;
}

function safeBack(formData: FormData, fallback = "/agenda"): string {
  const back = str(formData, "back");
  return back.startsWith("/") ? back : fallback;
}

async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// ---------- Telemedicina ----------

export async function createTelemedRoomAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = Number(str(formData, "id"));
  const back = safeBack(formData);
  if (!id) redirect(back);

  const room = `renova-${id}-${crypto.randomBytes(4).toString("hex")}`;
  await sql`UPDATE appointments SET telemed_room = ${room} WHERE id = ${id} AND telemed_room IS NULL`;
  revalidatePath("/", "layout");
  redirect(back);
}

// ---------- Voltar um passo no fluxo de status ----------

/**
 * O fluxo de status é de mão única na interface (agendado → confirmado →
 * em_atendimento → concluído/faltou/cancelado), então um clique errado ficava
 * sem saída. Este é o passo para trás.
 */
const PREVIOUS_STATUS: Record<string, string> = {
  confirmado: "agendado",
  em_atendimento: "confirmado",
  concluido: "em_atendimento",
  faltou: "agendado",
  cancelado: "agendado",
};

/**
 * Volta um passo. Retorna mensagem de erro, ou `null` em caso de sucesso — o
 * chamador mostra o erro inline em vez de navegar, igual ao caminho otimista.
 *
 * Concluir uma consulta gera cobrança automática, então desfazer precisa
 * decidir o que fazer com ela: se ainda está pendente, foi efeito colateral da
 * conclusão e sai junto; se já foi paga, o desfazer é recusado — apagar
 * pagamento recebido é pior que o clique errado.
 */
export async function revertAppointmentStatusAction(formData: FormData): Promise<string | null> {
  await requireSession();
  const id = Number(str(formData, "id"));
  if (!id) return "Agendamento inválido.";

  const [appointment] = await sql<{ status: string }>`
    SELECT status FROM appointments WHERE id = ${id}`;
  if (!appointment) return "Agendamento não encontrado.";

  const previous = PREVIOUS_STATUS[appointment.status];
  if (!previous) return "Este agendamento já está no primeiro estado.";

  if (appointment.status === "concluido") {
    const [payment] = await sql<{ id: number; status: string }>`
      SELECT id, status FROM payments WHERE appointment_id = ${id}`;
    if (payment && payment.status === "pago") {
      return "Não é possível reabrir: a cobrança desta consulta já foi paga.";
    }
    if (payment) {
      await sql`DELETE FROM payments WHERE id = ${payment.id} AND status = 'pendente'`;
    }
  }

  await sql`UPDATE appointments SET status = ${previous} WHERE id = ${id} AND status = ${appointment.status}`;
  revalidatePath("/", "layout");
  return null;
}

// ---------- Lista de espera ----------

export async function addToWaitlistAction(formData: FormData): Promise<void> {
  await requireSession();
  const back = safeBack(formData);
  const patientId = Number(str(formData, "patient_id")) || null;
  const name = optional(formData, "name");
  if (!patientId && !name) redirect(`${back}${back.includes("?") ? "&" : "?"}erro=espera`);

  await sql`
    INSERT INTO waitlist (patient_id, name, phone, professional_id, notes, status)
    VALUES (${patientId}, ${name}, ${optional(formData, "phone")},
      ${Number(str(formData, "professional_id")) || null}, ${optional(formData, "notes")}, 'aguardando')`;
  revalidatePath("/", "layout");
  redirect(back);
}

export async function setWaitlistStatusAction(formData: FormData): Promise<void> {
  await requireSession();
  const id = Number(str(formData, "id"));
  const status = str(formData, "status");
  const back = safeBack(formData);
  if (id && ["aguardando", "agendado", "removido"].includes(status)) {
    await sql`UPDATE waitlist SET status = ${status} WHERE id = ${id}`;
  }
  revalidatePath("/", "layout");
  redirect(back);
}
