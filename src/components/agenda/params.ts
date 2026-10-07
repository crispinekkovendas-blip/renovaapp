/**
 * Leitura dos parâmetros de URL das páginas da agenda. Puro, testado em
 * params.test.mjs: valor fora do formato cai no padrão, nunca vira erro.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `?date=` válido (AAAA-MM-DD) ou o padrão. */
export function dateParam(value: string | undefined, fallback: string): string {
  return value && ISO_DATE.test(value) ? value : fallback;
}

/** `?prof=` como id numérico; 0 quando ausente ou inválido (= todos). */
export function profParam(value: string | undefined): number {
  return value && /^\d+$/.test(value) ? Number(value) : 0;
}

/** Os parâmetros que abrem "Novo agendamento" (página e modal). */
export interface NewAppointmentSearchParams {
  date?: string;
  time?: string;
  prof?: string;
  patient?: string;
  waitlist?: string;
  erro?: string;
}
