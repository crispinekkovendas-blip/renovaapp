import Link from "next/link";
import type { Appointment } from "@/lib/db";
import { createTelemedRoomAction } from "@/lib/actions-agenda";
import { moneyBR, waLink } from "@/lib/format";
import { AppointmentStatusButtons } from "@/components/agenda/appointment-status-buttons";
import { confirmMessage, telemedMessage, telemedRoomUrl } from "@/components/agenda/messages";
import { isClosed, isMuted } from "@/components/agenda/status";

// Links pequenos do cartão (WhatsApp, sala…): no toque viram pílulas de 44px.
const CARD_LINK =
  "inline-flex items-center rounded-full text-[11px] font-bold hover:underline pointer-coarse:min-h-11 pointer-coarse:bg-pine-50 pointer-coarse:px-3 pointer-coarse:text-xs pointer-coarse:hover:no-underline";

/** Cartão do agendamento — o mesmo na grade do desktop e na linha do tempo do celular. */
export function AppointmentCard({
  appointment: a,
  confirmLink,
  backUrl,
  showProfessional,
}: {
  appointment: Appointment;
  /** Link assinado para o paciente confirmar pelo WhatsApp. */
  confirmLink: string | undefined;
  backUrl: string;
  /** Na lista com todos os profissionais misturados, o nome de quem atende. */
  showProfessional: boolean;
}) {
  const confirmWa = waLink(a.patient_phone, confirmMessage(a, confirmLink));
  const telemedUrl = telemedRoomUrl(a.telemed_room);
  const telemedWa = telemedUrl ? waLink(a.patient_phone, telemedMessage(a, telemedUrl)) : null;

  return (
    <div
      className={`min-w-0 rounded-lg border-l-4 bg-white p-2 shadow-sm ring-1 ring-pine-900/5 pointer-coarse:p-2.5 ${
        isMuted(a.status) ? "opacity-50" : ""
      }`}
      style={{ borderLeftColor: a.professional_color }}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/pacientes/${a.patient_id}`}
          className="min-w-0 truncate text-sm font-bold text-pine-950 hover:text-pine-600"
        >
          {a.patient_name}
        </Link>
      </div>
      <p className="mt-0.5 text-xs break-words text-pine-900/55">
        {a.start_time}–{a.end_time} · {a.procedure}
        {showProfessional ? ` · ${a.professional_name}` : ""}
        {a.price_cents > 0 ? ` · ${moneyBR(a.price_cents)}` : ""}
      </p>
      <AppointmentStatusButtons appointmentId={a.id} patientId={a.patient_id} status={a.status} backUrl={backUrl} />
      {!isClosed(a.status) ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-pine-900/5 pt-1.5">
          {confirmWa ? (
            <a href={confirmWa} target="_blank" rel="noopener noreferrer" className={`${CARD_LINK} text-emerald-700`}>
              WhatsApp
            </a>
          ) : null}
          {telemedUrl ? (
            <>
              <a href={telemedUrl} target="_blank" rel="noopener noreferrer" className={`${CARD_LINK} text-sky-700`}>
                Entrar na sala
              </a>
              {telemedWa ? (
                <a href={telemedWa} target="_blank" rel="noopener noreferrer" className={`${CARD_LINK} text-emerald-700`}>
                  Enviar link
                </a>
              ) : null}
            </>
          ) : (
            <form action={createTelemedRoomAction}>
              <input type="hidden" name="id" value={a.id} />
              <input type="hidden" name="back" value={backUrl} />
              <button type="submit" className={`${CARD_LINK} cursor-pointer text-pine-600`}>
                Teleconsulta
              </button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
