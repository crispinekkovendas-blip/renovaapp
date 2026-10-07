/**
 * Faixa de horários das agendas (dia e semana): 07:00 → 19:00, de 30 em 30 min.
 * Só lógica pura, testada em slots.test.mjs; os componentes só desenham.
 */

export const SLOT_START = 7 * 60;
export const SLOT_END = 19 * 60;
export const SLOT_STEP = 30;
export const SLOT_COUNT = (SLOT_END - SLOT_START) / SLOT_STEP;

/** 450 → "07:30". */
export function slotLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Os rótulos de todas as linhas da grade: "07:00", "07:30" … "18:30". */
export const SLOT_LABELS: readonly string[] = Array.from({ length: SLOT_COUNT }, (_, i) =>
  slotLabel(SLOT_START + i * SLOT_STEP)
);

/** "09:30" ou "09:30:00" → 570. Pedaço ilegível conta como zero. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/**
 * Linha (slot de 30 min, arredondado para baixo) em que o horário começa, ou
 * -1 fora da faixa.
 */
export function slotIndexOf(startTime: string): number {
  const idx = Math.floor((timeToMinutes(startTime) - SLOT_START) / SLOT_STEP);
  return idx >= 0 && idx < SLOT_COUNT ? idx : -1;
}

/**
 * Como `slotIndexOf`, mas o que fica fora da faixa cai na primeira ou na
 * última linha, para nada sumir da agenda (dia e semana) — o cartão mostra o horário real.
 */
export function clampedSlotIndex(startTime: string): number {
  const idx = Math.floor((timeToMinutes(startTime) - SLOT_START) / SLOT_STEP);
  return Math.min(Math.max(idx, 0), SLOT_COUNT - 1);
}

/** Ordem cronológica estável (horário, depois id), sem mexer na lista original. */
export function byStartTime<T extends { start_time: string; id: number }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id - b.id);
}

/**
 * Agrupa em baldes `chave → itens`, preservando a ordem de entrada dentro de
 * cada balde. `keyOf` devolvendo null descarta o item.
 */
export function groupBy<T>(items: readonly T[], keyOf: (item: T) => string | null): Map<string, T[]> {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (key === null) continue;
    const list = buckets.get(key);
    if (list) list.push(item);
    else buckets.set(key, [item]);
  }
  return buckets;
}
