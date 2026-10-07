/** Validação e horário de término do POST /api/v1/appointments. Puro, testável. */

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * "HH:MM" + minutos. Não dá a volta no dia: 23:30 + 60 vira "24:30", como
 * sempre foi — a comparação de conflito é textual e continua coerente.
 */
export function endTimeFor(startTime: string, durationMinutes: number): string {
  const [h, m] = startTime.split(":").map(Number);
  const endMinutes = h * 60 + m + durationMinutes;
  return `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
}
