import Link from "next/link";
import type { Appointment, Professional } from "@/lib/db";
import { IconPlus } from "@/components/icons";
import { AppointmentCard } from "@/components/agenda/appointment-card";
import { SLOT_LABELS, clampedSlotIndex, groupBy } from "@/components/agenda/slots";

type ProfessionalChip = Pick<Professional, "id" | "name" | "color">;

const CHIP = "chip min-h-11 shrink-0 px-4 text-xs transition-colors";
const CHIP_ON = "bg-pine-700 text-white";
const CHIP_OFF = "bg-white text-pine-800 ring-1 ring-pine-900/10";

/**
 * Agenda do dia no celular: uma coluna só, como a agenda do telefone. Um
 * profissional por vez (chips no alto) ou todos misturados — aí cada cartão
 * leva a cor e o nome de quem atende.
 */
export function DayTimeline({
  date,
  professionals,
  selectedProf,
  appointments,
  confirmLinks,
  backUrl,
}: {
  date: string;
  professionals: ProfessionalChip[];
  selectedProf: ProfessionalChip | undefined;
  /** Já filtrados pelo profissional escolhido, em ordem de horário. */
  appointments: Appointment[];
  confirmLinks: ReadonlyMap<number, string>;
  backUrl: string;
}) {
  // Fora da faixa cai na primeira/última linha (o cartão mostra o horário real).
  const bySlot = groupBy(appointments, (a) => String(clampedSlotIndex(a.start_time)));
  const profQuery = selectedProf ? `&prof=${selectedProf.id}` : "";
  const showProfessional = !selectedProf && professionals.length > 1;

  return (
    <>
      {professionals.length > 1 ? (
        <nav className="scroll-x -mx-4 mb-3 flex gap-2 px-4" aria-label="Filtrar por profissional">
          <Link
            href={`/agenda?date=${date}`}
            aria-current={!selectedProf ? "page" : undefined}
            className={`${CHIP} ${!selectedProf ? CHIP_ON : CHIP_OFF}`}
          >
            Todos
          </Link>
          {professionals.map((prof) => {
            const active = prof.id === selectedProf?.id;
            return (
              <Link
                key={prof.id}
                href={`/agenda?date=${date}&prof=${prof.id}`}
                aria-current={active ? "page" : undefined}
                className={`${CHIP} gap-1.5 ${active ? CHIP_ON : CHIP_OFF}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: prof.color }} />
                {prof.name}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className="card divide-y divide-pine-900/5 overflow-hidden">
        {SLOT_LABELS.map((label, idx) => {
          const inSlot = bySlot.get(String(idx));
          return (
            <div key={label} className="flex min-w-0 gap-2 px-2 py-1">
              <span className="w-11 shrink-0 pt-3.5 text-right text-xs font-bold tabular-nums text-pine-900/45">
                {label}
              </span>
              {!inSlot ? (
                <Link
                  href={`/agenda/novo?date=${date}&time=${label}${profQuery}`}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-pine-900/30 transition-colors hover:bg-pine-50 active:bg-pine-50"
                  aria-label={`Agendar ${label}${selectedProf ? ` com ${selectedProf.name}` : ""}`}
                >
                  <IconPlus className="h-3.5 w-3.5" />
                  Livre
                </Link>
              ) : (
                <div className="min-w-0 flex-1 space-y-1.5 py-1">
                  {inSlot.map((a) => (
                    <AppointmentCard
                      key={a.id}
                      appointment={a}
                      confirmLink={confirmLinks.get(a.id)}
                      backUrl={backUrl}
                      showProfessional={showProfessional}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
