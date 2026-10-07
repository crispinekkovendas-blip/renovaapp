import { fmtDate } from "../../lib/format.ts";

/**
 * Textos prontos do WhatsApp da agenda. Puros (testados em messages.test.mjs):
 * o link assinado e o telefone chegam de fora.
 */

interface AppointmentText {
  patient_name?: string;
  professional_name?: string;
  date: string;
  start_time: string;
}

/** Cartão da agenda: pedido de confirmação com o link assinado. */
export function confirmMessage(a: AppointmentText, confirmLink: string | undefined): string {
  return `Olá ${a.patient_name}! Confirmando sua consulta na Clínica Renova em ${fmtDate(a.date)} às ${a.start_time} com ${a.professional_name}. Responda SIM ou confirme pelo link: ${confirmLink}`;
}

/** Cartão da agenda: link da sala de teleconsulta. */
export function telemedMessage(a: AppointmentText, roomUrl: string): string {
  return `Olá ${a.patient_name}! Sua teleconsulta na Clínica Renova é em ${fmtDate(a.date)} às ${a.start_time}. Acesse a sala pelo link: ${roomUrl}`;
}

/** Sala Jitsi da teleconsulta, ou null enquanto não foi criada. */
export function telemedRoomUrl(room: string | null): string | null {
  return room ? `https://meet.jit.si/${room}` : null;
}

/**
 * Lembrete da véspera (/agenda/lembretes): só o primeiro nome, data curta e,
 * para quem já confirmou, o link serve para avisar que não vai.
 */
export function reminderMessage(
  a: AppointmentText & { patient_name: string; professional_name: string; status: string },
  clinic: string,
  link: string
): string {
  const firstName = a.patient_name.split(/\s+/)[0];
  const day = `${a.date.slice(8, 10)}/${a.date.slice(5, 7)}`;
  const intro = `Olá ${firstName}! Lembrete da sua consulta ${day} às ${a.start_time} com ${a.professional_name} na ${clinic}.`;
  return a.status === "confirmado"
    ? `${intro} Sua presença já está confirmada. Se não puder ir, avise por aqui: ${link}`
    : `${intro} Confirme aqui: ${link}`;
}
