/**
 * Helpers de semana (segunda a domingo) sobre datas ISO `YYYY-MM-DD`.
 *
 * Tudo é calculado em UTC a partir dos componentes ano/mês/dia da string,
 * para não depender do fuso horário do servidor.
 */

export const WEEKDAY_SHORT_PT = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

export const MONTH_LONG_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const;

const DAY_MS = 86_400_000;

function parseISO(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function toISO(utcMs: number): string {
  return new Date(utcMs).toISOString().slice(0, 10);
}

/** Segunda-feira da semana que contém `dateISO`. */
export function weekStartISO(dateISO: string): string {
  const ms = parseISO(dateISO);
  const dow = new Date(ms).getUTCDay(); // 0 = domingo … 6 = sábado
  const offsetFromMonday = (dow + 6) % 7; // segunda = 0 … domingo = 6
  return toISO(ms - offsetFromMonday * DAY_MS);
}

/** Os 7 dias a partir de `startISO` (segunda → domingo), em ordem. */
export function weekDaysISO(startISO: string): string[] {
  const ms = parseISO(startISO);
  return Array.from({ length: 7 }, (_, i) => toISO(ms + i * DAY_MS));
}

/** Desloca `startISO` em `deltaWeeks` semanas (negativo volta no tempo). */
export function shiftWeekISO(startISO: string, deltaWeeks: number): string {
  return toISO(parseISO(startISO) + deltaWeeks * 7 * DAY_MS);
}

/**
 * Rótulo do intervalo em pt-BR, por exemplo:
 * - "18 a 24 de agosto de 2026"
 * - "31 de agosto a 6 de setembro de 2026"
 * - "29 de dezembro de 2025 a 4 de janeiro de 2026"
 */
export function weekRangeLabelPT(startISO: string, endISO: string): string {
  const [sy, sm, sd] = startISO.slice(0, 10).split("-").map(Number);
  const [ey, em, ed] = endISO.slice(0, 10).split("-").map(Number);
  const startMonth = MONTH_LONG_PT[sm - 1];
  const endMonth = MONTH_LONG_PT[em - 1];

  if (sy !== ey) return `${sd} de ${startMonth} de ${sy} a ${ed} de ${endMonth} de ${ey}`;
  if (sm !== em) return `${sd} de ${startMonth} a ${ed} de ${endMonth} de ${ey}`;
  return `${sd} a ${ed} de ${endMonth} de ${ey}`;
}
