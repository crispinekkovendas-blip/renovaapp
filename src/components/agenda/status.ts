import type { AppointmentStatus } from "@/lib/db";

/** Cancelado ou faltou: o cartão aparece esmaecido e não conta como consulta do dia. */
export const MUTED_STATUSES: ReadonlySet<AppointmentStatus> = new Set<AppointmentStatus>(["cancelado", "faltou"]);

/** Já saiu do fluxo: sem WhatsApp, sala ou "Atender" — só "Abrir ficha". */
export const CLOSED_STATUSES: ReadonlySet<AppointmentStatus> = new Set<AppointmentStatus>([
  "cancelado",
  "faltou",
  "concluido",
]);

export function isMuted(status: AppointmentStatus): boolean {
  return MUTED_STATUSES.has(status);
}

export function isClosed(status: AppointmentStatus): boolean {
  return CLOSED_STATUSES.has(status);
}
