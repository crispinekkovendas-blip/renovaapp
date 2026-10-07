import { sql } from "@/lib/db";
import type { Patient, Professional } from "@/lib/db";

/** Opções dos selects de "Novo agendamento" (página e modal): só id e nome. */
export async function loadNewAppointmentOptions() {
  const [professionals, patients] = await Promise.all([
    sql<Pick<Professional, "id" | "name">>`SELECT id, name FROM professionals WHERE active = 1 ORDER BY name`,
    sql<Pick<Patient, "id" | "name">>`SELECT id, name FROM patients ORDER BY name`,
  ]);
  return { professionals, patients };
}
