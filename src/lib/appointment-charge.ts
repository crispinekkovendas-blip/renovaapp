import { sql } from "./db";
import type { Appointment } from "./db";

/**
 * A cobrança automática de uma consulta concluída: se ela tem valor e ainda não
 * tem lançamento, cria um pendente no Financeiro. Devolve o valor lançado
 * agora, em centavos (0 = sem valor, ou a cobrança já existia).
 *
 * Fora dos arquivos "use server" porque quem conclui são duas ações — o botão
 * de status da agenda e o "Concluir atendimento" da ficha — e a regra é uma só.
 */
export async function chargeConcluded(appointmentId: number): Promise<number> {
  const [appt] = await sql<Pick<Appointment, "patient_id" | "procedure" | "price_cents" | "date"> & { patient_name: string }>`
    SELECT a.patient_id, a.procedure, a.price_cents, a.date, p.name AS patient_name FROM appointments a
    JOIN patients p ON p.id = a.patient_id WHERE a.id = ${appointmentId}`;
  if (!appt || appt.price_cents <= 0) return 0;
  const [existing] = await sql`SELECT id FROM payments WHERE appointment_id = ${appointmentId}`;
  if (existing) return 0;
  await sql`
    INSERT INTO payments (patient_id, appointment_id, description, amount_cents, status, due_date)
    VALUES (${appt.patient_id}, ${appointmentId}, ${`${appt.procedure} — ${appt.patient_name}`}, ${appt.price_cents}, 'pendente', ${appt.date})`;
  return appt.price_cents;
}
