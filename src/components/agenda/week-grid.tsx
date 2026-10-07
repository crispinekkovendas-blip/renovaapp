import Link from "next/link";
import type { Appointment } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { WEEKDAY_SHORT_PT } from "@/lib/week";
import { StatusBadge } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { WeekDayList } from "@/components/agenda/week-day-list";
import { SLOT_LABELS, byStartTime, clampedSlotIndex, groupBy } from "@/components/agenda/slots";
import { isMuted } from "@/components/agenda/status";

export type WeekAppointment = Pick<
  Appointment,
  | "id"
  | "date"
  | "start_time"
  | "end_time"
  | "status"
  | "patient_id"
  | "patient_name"
  | "professional_name"
  | "professional_color"
  | "procedure"
>;

export function WeekGrid({
  days,
  appointments,
  today,
  profId,
}: {
  /** Sete datas ISO, de segunda a domingo. */
  days: string[];
  appointments: WeekAppointment[];
  /** Data ISO de hoje (America/Sao_Paulo), para destaque da coluna. */
  today: string;
  /** Filtro de profissional ativo, se houver — propagado aos links de "novo agendamento". */
  profId?: number;
}) {
  // Agrupa por dia + linha, mantendo a ordem cronológica dentro da célula.
  const buckets = groupBy(
    byStartTime(appointments),
    (a) => `${a.date.slice(0, 10)}|${clampedSlotIndex(a.start_time)}`
  );

  const profQuery = profId ? `&prof=${profId}` : "";

  return (
    <>
      {/* Celular: faixa de dias + lista do dia escolhido (ver WeekDayList). */}
      <div className="md:hidden">
        <WeekDayList key={days[0]} days={days} appointments={appointments} today={today} profId={profId} />
      </div>
      <div className="card hidden overflow-x-auto md:block">
        <div
          className="grid min-w-[980px]"
          style={{
            gridTemplateColumns: "56px repeat(6, minmax(140px, 1fr)) minmax(110px, 0.75fr)",
          }}
        >
          {/* Cabeçalho */}
          <div className="sticky top-0 z-10 border-b border-pine-900/10 bg-pine-50/50 px-2 py-3" />
          {days.map((day, i) => {
            const isToday = day === today;
            const isSunday = i === 6;
            return (
              <div
                key={day}
                className={`sticky top-0 z-10 border-b border-l border-pine-900/10 px-3 py-2.5 ${
                  isToday ? "bg-clay-50" : isSunday ? "bg-stone-50" : "bg-pine-50/50"
                }`}
              >
                <Link
                  href={`/agenda?date=${day}`}
                  className={`flex items-baseline gap-1.5 text-sm font-bold hover:text-pine-600 ${
                    isToday ? "text-clay-800" : isSunday ? "text-pine-900/45" : "text-pine-950"
                  }`}
                  title="Abrir a agenda deste dia"
                >
                  <span>{WEEKDAY_SHORT_PT[i]}</span>
                  <span
                    className={`text-xs font-semibold tabular-nums ${isToday ? "text-clay-700" : "text-pine-900/55"}`}
                  >
                    {fmtDate(day).slice(0, 5)}
                  </span>
                  {isToday ? (
                    <span className="chip ml-auto bg-clay-500 px-1.5 text-[10px] text-white">Hoje</span>
                  ) : null}
                </Link>
              </div>
            );
          })}

          {/* Linhas de horário */}
          {SLOT_LABELS.map((label, row) => {
            return (
              <div key={label} className="contents">
                <div className="border-b border-pine-900/5 px-2 py-2 text-right text-xs font-bold tabular-nums text-pine-900/40">
                  {label}
                </div>
                {days.map((day, i) => {
                  const isToday = day === today;
                  const isSunday = i === 6;
                  const cell = buckets.get(`${day}|${row}`) ?? [];
                  return (
                    <div
                      key={day}
                      className={`group min-h-11 border-b border-l border-pine-900/5 p-1 ${
                        isToday ? "bg-clay-50/30" : isSunday ? "bg-stone-50/60" : ""
                      }`}
                    >
                      {cell.length === 0 ? (
                        <Link
                          href={`/agenda/novo?date=${day}&time=${label}${profQuery}`}
                          className="flex h-full min-h-9 items-center justify-center rounded-lg text-pine-900/0 transition-colors hover:bg-pine-50 group-hover:text-pine-900/30 pointer-coarse:text-pine-900/20"
                          aria-label={`Agendar ${fmtDate(day)} às ${label}`}
                        >
                          <IconPlus className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <div className="space-y-1">
                          {cell.map((a) => {
                            const muted = isMuted(a.status);
                            return (
                              <div
                                key={a.id}
                                className={`rounded-md border-l-[3px] bg-white px-1.5 py-1 shadow-sm ring-1 ring-pine-900/5 ${
                                  muted ? "opacity-50" : ""
                                }`}
                                style={{
                                  borderLeftColor: a.professional_color ?? "#3f6b58",
                                }}
                                title={[a.patient_name, a.professional_name, a.procedure].filter(Boolean).join(" · ")}
                              >
                                <p className="text-[10px] font-bold tabular-nums text-pine-900/55">
                                  {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)}
                                </p>
                                <Link
                                  href={`/pacientes/${a.patient_id}`}
                                  className={`block truncate text-xs font-bold text-pine-950 hover:text-pine-600 ${
                                    muted ? "line-through decoration-pine-900/30" : ""
                                  }`}
                                >
                                  {a.patient_name ?? "Paciente"}
                                </Link>
                                <p className="truncate text-[10px] text-pine-900/55">
                                  {[profId ? null : a.professional_name, a.procedure].filter(Boolean).join(" · ")}
                                </p>
                                <div className="mt-1">
                                  <StatusBadge status={a.status} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
