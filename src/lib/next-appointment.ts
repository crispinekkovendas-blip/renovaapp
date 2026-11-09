import type { AppointmentStatus } from "./db";

interface Candidate {
  start_time: string;
  status: AppointmentStatus;
  professional_id: number;
}

export type NextKind = "em_atendimento" | "proximo" | "atrasado";

/** Até meia hora depois do horário a consulta ainda é "a próxima", não "em atraso". */
const GRACE_MINUTES = 30;

const FINISHED: ReadonlySet<AppointmentStatus> = new Set<AppointmentStatus>(["concluido", "faltou", "cancelado"]);

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Quem o início deve destacar: quem está em atendimento; senão a primeira
 * consulta aberta a partir de agora (com tolerância); senão, se todas as
 * abertas já passaram, a mais recente delas. `appointments` em ordem de horário.
 * Com `professionalId`, olha só a agenda desse profissional.
 */
export function nextAppointment<T extends Candidate>(
  appointments: readonly T[],
  now: string,
  professionalId: number | null,
): { appointment: T; kind: NextKind } | null {
  const open = appointments.filter(
    (a) => !FINISHED.has(a.status) && (professionalId === null || a.professional_id === professionalId),
  );
  const current = open.find((a) => a.status === "em_atendimento");
  if (current) return { appointment: current, kind: "em_atendimento" };
  const limit = minutesOf(now) - GRACE_MINUTES;
  const upcoming = open.find((a) => minutesOf(a.start_time) >= limit);
  if (upcoming) return { appointment: upcoming, kind: "proximo" };
  const last = open.at(-1);
  return last ? { appointment: last, kind: "atrasado" } : null;
}
