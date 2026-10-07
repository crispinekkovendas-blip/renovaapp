import { addDaysISO, fmtDate } from "./format.ts";

/**
 * Retorno (recall): o profissional marca "retorno em N dias" no atendimento,
 * o sistema guarda `return_due` e, a partir daí, a recepção vê em
 * /agenda/retornos quem ainda não remarcou, o paciente vê o aviso no portal e
 * o cron manda um push três dias antes. Aqui ficam só as regras puras
 * (opções, datas, textos), testadas em recall.test.mjs; as consultas ficam
 * nas páginas, no cron e em hub.ts.
 */

export const RETURN_OPTIONS: ReadonlyArray<{ days: number; label: string }> = [
  { days: 0, label: "Sem retorno" },
  { days: 7, label: "7 dias" },
  { days: 15, label: "15 dias" },
  { days: 30, label: "30 dias" },
  { days: 60, label: "60 dias" },
  { days: 90, label: "90 dias" },
  { days: 180, label: "180 dias" },
];

/** Só os prazos do select valem; "sem retorno", vazio ou lixo viram null. */
export function parseReturnDays(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = typeof input === "number" ? input : Number(String(input).trim());
  if (!Number.isInteger(n) || n <= 0) return null;
  return RETURN_OPTIONS.some((option) => option.days === n) ? n : null;
}

/** Data do retorno a partir da data do atendimento; null sem prazo. */
export function returnDueFor(date: string, days: number | null): string | null {
  if (!days || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return addDaysISO(date, days);
}

/** A página de retornos olha 30 dias para trás (atrasados) e 30 para a frente. */
export const RECALL_WINDOW_DAYS = 30;

export function recallWindow(today: string): { from: string; to: string } {
  return { from: addDaysISO(today, -RECALL_WINDOW_DAYS), to: addDaysISO(today, RECALL_WINDOW_DAYS) };
}

/** O push sai três dias antes do retorno. */
export const RECALL_LEAD_DAYS = 3;

/**
 * Qual `return_due` o cron avisa hoje. O cron trabalha com a "data-alvo" dos
 * lembretes de consulta (amanhã por padrão, `?date=` para simular); o retorno
 * avisado é o de três dias à frente de hoje, ou seja, alvo + 2.
 */
export function recallDateFor(appointmentTargetDate: string): string {
  return addDaysISO(appointmentTargetDate, RECALL_LEAD_DAYS - 1);
}

/** Dias inteiros de `from` até `to` (negativo quando `to` é antes). */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const b = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}

export interface RecallStatus {
  overdue: boolean;
  /** Dias até o retorno (negativo = atrasado). */
  days: number;
  /** "atrasado há 3 dias" · "hoje" · "amanhã" · "em 5 dias" */
  label: string;
}

export function recallStatus(due: string, today: string): RecallStatus {
  const days = daysBetween(today, due);
  if (days < 0) {
    const late = -days;
    return { overdue: true, days, label: `atrasado há ${late} dia${late === 1 ? "" : "s"}` };
  }
  if (days === 0) return { overdue: false, days, label: "hoje" };
  if (days === 1) return { overdue: false, days, label: "amanhã" };
  return { overdue: false, days, label: `em ${days} dias` };
}

/** `https://<host>/agendar?prof=<id>` — o agendamento online já com o profissional escolhido. */
export function bookingUrlFor(baseUrl: string, professionalId: number): string {
  return `${baseUrl.replace(/\/+$/, "")}/agendar?prof=${professionalId}`;
}

/** Mensagem pronta da recepção no WhatsApp para quem ainda não marcou o retorno. */
export function recallMessage(input: { firstName: string; professional: string; bookingUrl: string }): string {
  return (
    `Olá ${input.firstName}! Está na hora de marcar seu retorno com ${input.professional}. ` +
    `Agende aqui: ${input.bookingUrl}`
  );
}

/** "Retorno recomendado para 12/09 com Dra. Marina" — o card do portal. */
export function recallCardTitle(due: string, professional: string): string {
  return `Retorno recomendado para ${fmtDate(due)} com ${professional}`;
}
