import Link from "next/link";
import type { Appointment, Professional } from "@/lib/db";
import { IconPlus } from "@/components/icons";
import { AppointmentCard } from "@/components/agenda/appointment-card";
import { SLOT_LABELS, clampedSlotIndex, groupBy } from "@/components/agenda/slots";

/** Agenda do dia no tablet/desktop: a grade de sempre, um profissional por coluna. */
export function DayGrid({
  date,
  professionals,
  appointments,
  confirmLinks,
  backUrl,
}: {
  date: string;
  professionals: Pick<Professional, "id" | "name" | "color" | "specialty">[];
  /** Todos os do dia, em ordem de horário. */
  appointments: Appointment[];
  confirmLinks: ReadonlyMap<number, string>;
  backUrl: string;
}) {
  // Uma passada só: "profissional|linha" → cartões, na ordem de horário.
  // Consulta antes das 07:00 ou depois das 18:30 cai na primeira/última
  // linha, como na semana — sumir da agenda do dia é pior que ficar fora do lugar.
  const cells = groupBy(appointments, (a) => `${a.professional_id}|${clampedSlotIndex(a.start_time)}`);

  return (
    <div className="card overflow-x-auto">
      <div
        className="grid min-w-[640px]"
        style={{ gridTemplateColumns: `64px repeat(${Math.max(professionals.length, 1)}, minmax(180px, 1fr))` }}
      >
        <div className="border-b border-pine-900/10 bg-pine-50/50 px-2 py-3" />
        {professionals.map((prof) => (
          <div key={prof.id} className="border-b border-l border-pine-900/10 bg-pine-50/50 px-3 py-3">
            <p className="flex items-center gap-2 text-sm font-bold text-pine-950">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: prof.color }} />
              {prof.name}
            </p>
            <p className="text-xs text-pine-900/55">{prof.specialty}</p>
          </div>
        ))}

        {SLOT_LABELS.map((label, idx) => (
          <div key={label} className="contents">
            <div className="border-b border-pine-900/5 px-2 py-2 text-right text-xs font-bold text-pine-900/40">
              {label}
            </div>
            {professionals.map((prof) => {
              const cell = cells.get(`${prof.id}|${idx}`);
              return (
                <div key={prof.id} className="group min-h-12 border-b border-l border-pine-900/5 p-1">
                  {!cell ? (
                    <Link
                      href={`/agenda/novo?date=${date}&time=${label}&prof=${prof.id}`}
                      // No toque não existe hover: o "+" fica sempre à vista, bem clarinho.
                      className="flex h-full min-h-10 items-center justify-center rounded-lg text-pine-900/0 transition-colors hover:bg-pine-50 group-hover:text-pine-900/30 pointer-coarse:text-pine-900/20"
                      aria-label={`Agendar ${label} com ${prof.name}`}
                    >
                      <IconPlus className="h-4 w-4" />
                    </Link>
                  ) : (
                    cell.map((a) => (
                      <AppointmentCard
                        key={a.id}
                        appointment={a}
                        confirmLink={confirmLinks.get(a.id)}
                        backUrl={backUrl}
                        showProfessional={false}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
