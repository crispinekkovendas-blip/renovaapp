import Link from "next/link";
import { DAY_PERIOD_LABEL, dayLabel, groupSlotsByPeriod, type BookingDay } from "@/lib/booking-slots";
import { fmtDateLong } from "@/lib/format";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600";

/**
 * Passo 2: dia e horário na mesma tela. Os dias (só os que têm vaga) rolam
 * de lado; os horários do dia escolhido — ou do primeiro dia livre, se
 * nenhum foi escolhido — aparecem logo abaixo, por período. Um toque no
 * horário leva ao formulário.
 */
export function SlotPicker({
  professionalId,
  days,
  selectedDate,
  today,
}: {
  professionalId: number;
  days: BookingDay[];
  /** O `date` da URL; null = mostra o primeiro dia livre. */
  selectedDate: string | null;
  today: string;
}) {
  const active = selectedDate ? (days.find((d) => d.date === selectedDate) ?? null) : (days[0] ?? null);
  const shownDate = active?.date ?? selectedDate;

  return (
    <div>
      <nav aria-label="Dias com horário livre">
        <ul className="scroll-x -mx-4 flex gap-2 px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {days.map((day) => {
            const label = dayLabel(day.date, today);
            const current = day.date === active?.date;
            return (
              <li key={day.date} className="shrink-0">
                <Link
                  href={`/agendar?prof=${professionalId}&date=${day.date}`}
                  aria-current={current ? "date" : undefined}
                  className={`flex w-[4.75rem] flex-col items-center rounded-2xl border px-2 py-3 text-center transition-colors ${FOCUS} ${
                    current
                      ? "border-pine-950 bg-pine-950 text-white"
                      : "border-pine-900/10 bg-white text-pine-950 hover:border-pine-500"
                  }`}
                >
                  <span className={`text-[11px] font-bold uppercase ${current ? "text-white/70" : "text-pine-900/55"}`}>
                    {label.weekday}
                  </span>
                  <span className="font-display text-lg font-semibold leading-tight">{label.day}</span>
                  <span className={`mt-0.5 text-[10px] font-bold ${current ? "text-white/70" : "text-pine-700"}`}>
                    {day.slots.length} {day.slots.length === 1 ? "horário" : "horários"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <section aria-labelledby="horarios-do-dia" className="mt-6">
        {shownDate ? (
          <h2 id="horarios-do-dia" className="font-display text-lg font-semibold tracking-tight text-pine-950">
            {fmtDateLong(shownDate)}
          </h2>
        ) : null}

        {active ? (
          <div className="mt-4 space-y-5">
            {groupSlotsByPeriod(active.slots).map((group) => (
              <div key={group.period}>
                <h3 className="label">{DAY_PERIOD_LABEL[group.period]}</h3>
                <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {group.slots.map((slot) => (
                    <li key={slot}>
                      <Link
                        href={`/agendar?prof=${professionalId}&date=${active.date}&time=${slot}`}
                        aria-label={`${slot}, ${fmtDateLong(active.date)}`}
                        className={`flex min-h-12 items-center justify-center rounded-xl border border-pine-900/10 bg-white text-base font-bold text-pine-950 transition-colors hover:border-pine-500 hover:bg-pine-50 ${FOCUS}`}
                      >
                        {slot}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-peach-50 px-4 py-3 text-sm text-pine-900/70">
            Não há horário livre neste dia. Escolha um dos dias acima.
          </p>
        )}
      </section>
    </div>
  );
}
