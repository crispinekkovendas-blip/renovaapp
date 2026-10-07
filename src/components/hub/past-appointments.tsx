import type { AppointmentStatus } from "@/lib/db";
import { fmtDate } from "@/lib/format";

export interface PastAppointment {
  id: number;
  date: string;
  start_time: string;
  status: AppointmentStatus;
  professional_name: string;
}

/** Voz do paciente: "consulta" é feminino e "concluída" vira "realizada". */
const PAST_LABEL: Record<AppointmentStatus, string> = {
  agendado: "Agendada",
  confirmado: "Confirmada",
  em_atendimento: "Em atendimento",
  concluido: "Realizada",
  faltou: "Não compareceu",
  cancelado: "Cancelada",
};

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  agendado: "bg-pine-100 text-pine-800",
  confirmado: "bg-sky-100 text-sky-800",
  em_atendimento: "bg-clay-100 text-clay-800",
  concluido: "bg-emerald-100 text-emerald-800",
  faltou: "bg-rose-100 text-rose-700",
  cancelado: "bg-stone-200 text-stone-500",
};

/** "Consultas anteriores": as últimas cinco, com o status na voz do paciente. */
export function PastAppointments({ past, lastEncounterDate }: { past: PastAppointment[]; lastEncounterDate: string | null }) {
  return (
    <section className="mt-8">
      <details className="accordion" open>
        <summary>
          <span>
            Consultas anteriores
            {lastEncounterDate ? (
              <span className="mt-0.5 block font-sans text-xs font-normal tracking-normal text-pine-900/50">
                Último atendimento em {fmtDate(lastEncounterDate)}
              </span>
            ) : null}
          </span>
        </summary>
        {past.length === 0 ? (
          <p className="text-sm text-pine-900/60">Nenhuma consulta anterior.</p>
        ) : (
          <ul className="divide-y divide-pine-900/5">
            {past.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-pine-950">
                    {fmtDate(a.date)} · {a.start_time}
                  </p>
                  <p className="truncate text-xs text-pine-900/55">{a.professional_name}</p>
                </div>
                <span className={`chip shrink-0 ${STATUS_STYLE[a.status]}`}>{PAST_LABEL[a.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </details>
    </section>
  );
}
