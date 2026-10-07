/**
 * A agenda livre do agendamento online, em funções puras: janelas de
 * atendimento + consultas ocupadas → dias com horários livres. Sem imports
 * de propósito — roda em `node --test` (ver booking-slots.test.mjs). As
 * leituras do banco ficam na página `/agendar`.
 */

/** Quantos dias a agenda online mostra, a contar de hoje. */
export const BOOKING_WINDOW_DAYS = 14;

export interface ScheduleWindow {
  professional_id: number;
  /** 0 = domingo, como em `schedules.weekday`. */
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

export interface BusyRange {
  professional_id: number;
  date: string;
  start_time: string;
  end_time: string;
}

export interface BookingDay {
  date: string;
  slots: string[];
}

/** "08:30" + 30 → "09:00". Mesma aritmética da ação que grava o agendamento. */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Dia da semana de uma data ISO, ao meio-dia (longe de virada de fuso). */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T12:00:00`).getDay();
}

/** "2026-09-30" + 2 → "2026-10-02", em UTC para não tropeçar no horário de verão. */
export function addDaysISO(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Horários livres de um dia: cada janela vira fatias de `slot_minutes`; a
 * fatia que passaria do fim da janela não entra, a que colide com uma
 * consulta também não e, hoje, só vale o que ainda não começou.
 */
export function freeSlots(
  windows: Pick<ScheduleWindow, "start_time" | "end_time" | "slot_minutes">[],
  busy: Pick<BusyRange, "start_time" | "end_time">[],
  nowTime: string | null
): string[] {
  const slots = new Set<string>();
  for (const window of windows) {
    // Duração inválida entraria em laço infinito.
    if (!(window.slot_minutes > 0)) continue;
    for (let t = window.start_time; t < window.end_time; t = addMinutes(t, window.slot_minutes)) {
      const end = addMinutes(t, window.slot_minutes);
      if (end > window.end_time) break;
      if (nowTime !== null && t <= nowTime) continue;
      if (!busy.some((b) => b.start_time < end && b.end_time > t)) slots.add(t);
    }
  }
  return [...slots].sort();
}

/**
 * Os próximos `days` dias de um profissional que têm pelo menos um horário
 * livre. Dia sem janela ou lotado nem aparece: o paciente não toca num dia
 * para descobrir que não tem vaga.
 */
export function bookingDays({
  professionalId,
  schedules,
  busy,
  today,
  nowTime,
  days = BOOKING_WINDOW_DAYS,
}: {
  professionalId: number;
  schedules: ScheduleWindow[];
  busy: BusyRange[];
  today: string;
  nowTime: string;
  days?: number;
}): BookingDay[] {
  const mine = schedules.filter((s) => s.professional_id === professionalId);
  if (mine.length === 0) return [];
  const out: BookingDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(today, i);
    const weekday = weekdayOf(date);
    const windows = mine.filter((s) => s.weekday === weekday);
    if (windows.length === 0) continue;
    const taken = busy.filter((b) => b.professional_id === professionalId && b.date === date);
    const slots = freeSlots(windows, taken, date === today ? nowTime : null);
    if (slots.length > 0) out.push({ date, slots });
  }
  return out;
}

export type DayPeriod = "manha" | "tarde" | "noite";

export const DAY_PERIOD_LABEL: Record<DayPeriod, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

/** Agrupa os horários em manhã (até 12h), tarde (até 18h) e noite, sem grupos vazios. */
export function groupSlotsByPeriod(slots: string[]): { period: DayPeriod; slots: string[] }[] {
  const groups: Record<DayPeriod, string[]> = { manha: [], tarde: [], noite: [] };
  for (const slot of slots) {
    const period: DayPeriod = slot < "12:00" ? "manha" : slot < "18:00" ? "tarde" : "noite";
    groups[period].push(slot);
  }
  return (Object.keys(groups) as DayPeriod[])
    .filter((period) => groups[period].length > 0)
    .map((period) => ({ period, slots: groups[period] }));
}

/** Parâmetros da URL de /agendar, já validados; o que não bate no formato vira null. */
export function parseBookingParams(params: { prof?: string; date?: string; time?: string }): {
  profId: number | null;
  date: string | null;
  time: string | null;
} {
  const prof = Number(params.prof);
  return {
    profId: Number.isInteger(prof) && prof > 0 ? prof : null,
    date: params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : null,
    time: params.time && /^\d{2}:\d{2}$/.test(params.time) ? params.time : null,
  };
}

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Rótulo do dia na lista: "Hoje", "Amanhã" ou "Qua", mais "30/09". */
export function dayLabel(date: string, today: string): { weekday: string; day: string } {
  const weekday =
    date === today ? "Hoje" : date === addDaysISO(today, 1) ? "Amanhã" : WEEKDAY_SHORT[weekdayOf(date)];
  return { weekday, day: `${date.slice(8, 10)}/${date.slice(5, 7)}` };
}

/** "Hoje, 14:00", "Amanhã, 09:00" ou "Qua, 30/09, 09:00": o primeiro horário livre, num cartão. */
export function nextSlotLabel(day: BookingDay, today: string): string {
  const { weekday, day: dm } = dayLabel(day.date, today);
  const when = weekday === "Hoje" || weekday === "Amanhã" ? weekday : `${weekday}, ${dm}`;
  return `${when}, ${day.slots[0]}`;
}
