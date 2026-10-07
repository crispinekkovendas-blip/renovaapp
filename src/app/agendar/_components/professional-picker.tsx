import Link from "next/link";
import { BOOKING_WINDOW_DAYS, nextSlotLabel, type BookingDay } from "@/lib/booking-slots";
import { BookingAvatar } from "./booking-avatar";
import type { BookingProfessional } from "./types";

/**
 * Passo 1: a equipe, cada cartão já com o primeiro horário livre — quem
 * não tem vaga nos próximos dias aparece por último, apagado, mas ainda
 * clicável (a próxima tela explica e oferece o contato).
 */
export function ProfessionalPicker({
  professionals,
  daysByProfessional,
  today,
}: {
  professionals: BookingProfessional[];
  daysByProfessional: Map<number, BookingDay[]>;
  today: string;
}) {
  const ordered = [...professionals].sort((a, b) => {
    const aOpen = (daysByProfessional.get(a.id)?.length ?? 0) > 0 ? 0 : 1;
    const bOpen = (daysByProfessional.get(b.id)?.length ?? 0) > 0 ? 0 : 1;
    return aOpen - bOpen;
  });

  return (
    <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      {ordered.map((prof) => {
        const first = daysByProfessional.get(prof.id)?.[0];
        return (
          <li key={prof.id}>
            <Link
              href={`/agendar?prof=${prof.id}`}
              className={`card flex min-h-20 items-center gap-4 p-4 transition-colors hover:border-pine-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600 sm:p-5 ${
                first ? "" : "opacity-70"
              }`}
            >
              <BookingAvatar name={prof.name} color={prof.color} />
              <span className="min-w-0 flex-1">
                <span className="block break-words font-display text-lg font-semibold leading-tight text-pine-950">
                  {prof.name}
                </span>
                {prof.specialty?.trim() ? (
                  <span className="mt-0.5 block text-sm text-pine-900/60">{prof.specialty}</span>
                ) : null}
                <span className={`mt-1.5 block text-xs font-bold ${first ? "text-pine-700" : "text-pine-900/50"}`}>
                  {first
                    ? `Próximo horário: ${nextSlotLabel(first, today)}`
                    : `Sem horário livre nos próximos ${BOOKING_WINDOW_DAYS} dias`}
                </span>
              </span>
              <span aria-hidden="true" className="text-xl text-pine-900/40">
                ›
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
