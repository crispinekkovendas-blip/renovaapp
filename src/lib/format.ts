import type { AppointmentStatus } from "./db";

export function moneyBR(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseMoneyBR(input: string): number {
  const cleaned = input.replace(/[R$\s.]/g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.round(value * 100);
}

export const APP_TZ = "America/Sao_Paulo";

export function todayISO(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: APP_TZ });
}

export function nowHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: APP_TZ, hour: "numeric", hour12: false }).format(new Date())
  );
}

/** Link wa.me a partir de um telefone BR em formato livre. */
export function waLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (!digits.startsWith("55")) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function monthISO(): string {
  return todayISO().slice(0, 7);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function fmtDateLong(iso: string): string {
  const label = new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function fmtMonthLong(isoMonth: string): string {
  const label = new Date(`${isoMonth}-15T12:00:00`).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function ageFrom(birth: string | null | undefined): string {
  if (!birth) return "—";
  const b = new Date(`${birth}T12:00:00`);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const beforeBirthday =
    now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
  if (beforeBirthday) age -= 1;
  return `${age} anos`;
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  em_atendimento: "Em atendimento",
  concluido: "Concluído",
  faltou: "Faltou",
  cancelado: "Cancelado",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "Pix",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  convenio: "Convênio",
  outro: "Outro",
};

/** "08:30" + 45 → "09:15". Passa da meia-noite sem dar a volta ("23:30" + 60 → "24:30"), como sempre foi. */
export function addMinutesHHMM(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
