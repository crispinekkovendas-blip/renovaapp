import Link from "next/link";
import { sql } from "@/lib/db";
import type { AppointmentStatus, Professional } from "@/lib/db";
import { todayISO } from "@/lib/format";
import { shiftWeekISO, weekDaysISO, weekRangeLabelPT, weekStartISO } from "@/lib/week";
import { WeekGrid } from "@/components/agenda/week-grid";
import type { WeekAppointment } from "@/components/agenda/week-grid";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { DateStepper } from "@/components/agenda/date-stepper";
import { dateParam, profParam } from "@/components/agenda/params";

// Ordem dos selos no resumo da semana: a do fluxo.
const STATUS_ORDER: readonly AppointmentStatus[] = [
  "agendado",
  "confirmado",
  "em_atendimento",
  "concluido",
  "faltou",
  "cancelado",
];

function weekHref(startISO: string, profId: number): string {
  return `/agenda/semana?date=${startISO}${profId ? `&prof=${profId}` : ""}`;
}

export default async function AgendaSemanaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; prof?: string }>;
}) {
  const params = await searchParams;
  const today = todayISO();
  const anchor = dateParam(params.date, today);
  const start = weekStartISO(anchor);
  const days = weekDaysISO(start);
  const profId = profParam(params.prof);

  const [professionals, appointments] = await Promise.all([
    sql<Pick<Professional, "id" | "name" | "color">>`
      SELECT id, name, color FROM professionals WHERE active = 1 ORDER BY name`,
    // Todos os status entram: a recepção quer ver cancelados/faltas (a grade os esmaece).
    sql<WeekAppointment>`
      SELECT a.id, a.date, a.start_time, a.end_time, a.status, a.patient_id, a.procedure,
        p.name AS patient_name, pr.color AS professional_color, pr.name AS professional_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN professionals pr ON pr.id = a.professional_id
      WHERE a.date >= ${days[0]} AND a.date <= ${days[6]}
        AND (${profId}::int = 0 OR a.professional_id = ${profId})
      ORDER BY a.date, a.start_time`,
  ]);

  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<AppointmentStatus, number>;
  for (const a of appointments) counts[a.status] += 1;

  // "Ver dia" abre hoje se hoje estiver nesta semana; senão, a segunda-feira dela.
  const dayLink = days.includes(today) ? today : start;
  const selectedProf = profId ? professionals.find((p) => p.id === profId) : undefined;
  const total = appointments.length;

  return (
    <>
      <PageHeader
        title="Agenda semanal"
        subtitle={weekRangeLabelPT(days[0], days[6])}
        action={
          // Mesmo arranjo da agenda do dia: no celular, ‹ data Ir › numa linha e
          // Hoje · Ver dia · Agendar dividindo a outra; do sm em diante, uma fileira só.
          <DateStepper
            prev={{ href: weekHref(shiftWeekISO(start, -1), profId), label: "Semana anterior" }}
            next={{ href: weekHref(shiftWeekISO(start, 1), profId), label: "Próxima semana" }}
            date={start}
            dateLabel="Ir para a semana da data"
            hidden={profId ? { prof: profId } : undefined}
            jump={{ href: weekHref(weekStartISO(today), profId), label: "Hoje" }}
          >
            <Link href={`/agenda?date=${dayLink}`} className="btn btn-outline">
              Ver dia
            </Link>
            <Link
              href={`/agenda/novo?date=${dayLink}${profId ? `&prof=${profId}` : ""}`}
              className="btn btn-primary"
            >
              <IconPlus className="h-4 w-4" />
              Agendar
            </Link>
          </DateStepper>
        }
      />

      {professionals.length > 0 ? (
        // No celular, uma fileira que rola de lado (chips com altura de dedo); do sm em diante, quebra linha.
        <div className="scroll-x -mx-4 mb-4 flex items-center gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <span className="shrink-0 text-[11px] font-bold text-pine-900/50">Profissional</span>
          <Link
            href={weekHref(start, 0)}
            className={`chip shrink-0 transition-colors pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:text-xs ${
              profId === 0 ? "bg-pine-700 text-white" : "bg-pine-50 text-pine-800 hover:bg-pine-100"
            }`}
          >
            Todos
          </Link>
          {professionals.map((prof) => {
            const active = prof.id === profId;
            return (
              <Link
                key={prof.id}
                href={weekHref(start, prof.id)}
                className={`chip shrink-0 transition-colors pointer-coarse:min-h-11 pointer-coarse:px-4 pointer-coarse:text-xs ${
                  active ? "bg-pine-700 text-white" : "bg-pine-50 text-pine-800 hover:bg-pine-100"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: prof.color }} />
                {prof.name}
              </Link>
            );
          })}
        </div>
      ) : null}

      <p className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-pine-900/60">
        <span className="font-bold text-pine-950">
          {total === 0
            ? "Nenhum agendamento na semana"
            : `${total} ${total === 1 ? "agendamento" : "agendamentos"} na semana`}
          {selectedProf ? ` · ${selectedProf.name}` : ""}
        </span>
        {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
          <span key={s} className="inline-flex items-center gap-1">
            <StatusBadge status={s} />
            <span className="font-bold tabular-nums text-pine-900/70">{counts[s]}</span>
          </span>
        ))}
      </p>

      {total === 0 ? (
        <EmptyState
          title="Nenhum agendamento nesta semana"
          hint={
            selectedProf
              ? `${selectedProf.name} não tem agendamentos entre ${days[0].slice(8)}/${days[0].slice(5, 7)} e ${days[6].slice(8)}/${days[6].slice(5, 7)}. Use "Todos" para ver a equipe inteira ou "Agendar" para marcar um horário.`
              : 'Use "Agendar" para marcar um horário ou navegue para outra semana.'
          }
        />
      ) : (
        <WeekGrid days={days} appointments={appointments} today={today} profId={profId || undefined} />
      )}
    </>
  );
}
