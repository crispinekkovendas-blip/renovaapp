"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { requireSession } from "./auth";
import { str } from "./form-fields.ts";
import { todayISO } from "./format";
import { withFlash } from "./flash.ts";
import { canStartVisit, visitHref } from "./visit.ts";
import { chargeConcluded } from "./appointment-charge";

/*
 * As duas pontas do atendimento guiado (ver lib/visit.ts). Quem atende é o
 * profissional ou o admin; a recepção muda o status pela agenda, como sempre.
 */

/**
 * "Atender": põe a consulta em atendimento e abre a ficha no lugar certo — o
 * formulário, se ainda não há atendimento de hoje; o painel, se já há.
 */
export async function startVisitAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (session.role === "recepcao") redirect("/dashboard?erro=sem_permissao");
  const id = Number(str(formData, "id"));

  const [appointment] = id
    ? await sql<{ patient_id: number; status: string }>`SELECT patient_id, status FROM appointments WHERE id = ${id}`
    : [];
  if (!appointment) redirect("/dashboard?erro=consulta_fechada");
  // Concluída, falta ou cancelada: não há o que iniciar — só a ficha.
  if (!canStartVisit(appointment.status)) redirect(`/pacientes/${appointment.patient_id}`);

  if (appointment.status !== "em_atendimento") {
    await sql`UPDATE appointments SET status = 'em_atendimento' WHERE id = ${id} AND status IN ('agendado', 'confirmado')`;
    revalidatePath("/", "layout");
  }

  const [recorded] = await sql`
    SELECT id FROM encounters WHERE patient_id = ${appointment.patient_id} AND date = ${todayISO()} LIMIT 1`;
  redirect(visitHref(appointment.patient_id, { form: !recorded }));
}

/**
 * "Concluir atendimento": fecha a consulta, lança a cobrança (se ela tem valor)
 * e volta ao Início, onde está o próximo paciente. O aviso leva o "Desfazer".
 */
export async function finishVisitAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  if (session.role === "recepcao") redirect("/dashboard?erro=sem_permissao");
  const id = Number(str(formData, "id"));

  const closed = id
    ? await sql`UPDATE appointments SET status = 'concluido' WHERE id = ${id} AND status = 'em_atendimento' RETURNING id`
    : [];
  if (closed.length === 0) redirect("/dashboard?erro=consulta_fechada");

  const charged = await chargeConcluded(id);
  revalidatePath("/", "layout");
  redirect(withFlash("/dashboard", "concluido", { undo: { kind: "consulta", id }, valor: charged }));
}
