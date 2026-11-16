import Link from "next/link";
import type { Appointment } from "@/lib/db";
import { startVisitAction } from "@/lib/actions-visit";
import { EmptyState, SectionTitle, StatusBadge } from "@/components/ui";
import { isClosed } from "@/components/agenda/status";

export type TodayAppointment = Pick<
  Appointment,
  "id" | "start_time" | "status" | "procedure" | "patient_id" | "patient_name" | "professional_id" | "professional_name" | "professional_color"
>;

/**
 * "Agenda de hoje" do início: para quem atende, cada linha começa (ou continua)
 * o atendimento; a recepção, e as consultas já encerradas, abrem a ficha.
 */
export function TodayAppointments({
  appointments,
  canAttend,
}: {
  appointments: TodayAppointment[];
  canAttend: boolean;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <SectionTitle>Agenda de hoje</SectionTitle>
        <Link
          href="/agenda/semana"
          className="-my-3 inline-flex min-h-11 items-center text-xs font-bold text-pine-600 hover:underline"
        >
          Ver a semana
        </Link>
      </div>
      {appointments.length === 0 ? (
        <EmptyState title="Nenhuma consulta hoje" hint="Use “Novo agendamento” para marcar a primeira." />
      ) : (
        <div className="card divide-y divide-pine-900/5">
          {appointments.map((a) => {
            const closed = isClosed(a.status);
            // Confirmado ou já em atendimento: o botão ganha destaque (é a vez dele).
            const highlight = a.status === "confirmado" || a.status === "em_atendimento";
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 sm:gap-4 sm:px-5">
                <span className="w-12 shrink-0 text-base font-extrabold tabular-nums text-pine-950">{a.start_time}</span>
                <span className="h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: a.professional_color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{a.patient_name}</span>
                  <span className="block truncate text-xs text-pine-900/55">
                    {a.procedure} · {a.professional_name}
                  </span>
                  {/* No celular o selo desce para baixo do nome, para o nome não sumir. */}
                  <span className="mt-1 block sm:hidden">
                    <StatusBadge status={a.status} />
                  </span>
                </span>
                <span className="hidden shrink-0 sm:inline-flex">
                  <StatusBadge status={a.status} />
                </span>
                {canAttend && !closed ? (
                  <form action={startVisitAction} className="shrink-0">
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className={`btn px-3 py-1.5 text-xs ${highlight ? "bg-peach-100 text-pine-950 hover:bg-peach-200" : "btn-outline"}`}
                    >
                      {a.status === "em_atendimento" ? "Continuar" : "Atender"}
                    </button>
                  </form>
                ) : (
                  <Link href={`/pacientes/${a.patient_id}`} className="btn btn-outline shrink-0 px-3 py-1.5 text-xs">
                    Abrir ficha
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
