import Link from "next/link";
import { fmtDateLong } from "@/lib/format";
import { BookingAvatar } from "./booking-avatar";
import type { BookingProfessional } from "./types";

/**
 * "Sua escolha": o profissional e, no passo 3, dia e hora — cada parte com
 * o próprio "Trocar", que volta só aquele passo. Sem `changeProfessionalHref`
 * (clínica com um profissional só), não há o que trocar ali.
 */
export function BookingSummary({
  professional,
  date,
  time,
  changeProfessionalHref,
  changeTimeHref,
}: {
  professional: BookingProfessional;
  date?: string;
  time?: string;
  changeProfessionalHref?: string;
  changeTimeHref?: string;
}) {
  return (
    <div className="card mb-6 divide-y divide-pine-900/10">
      <div className="flex items-center gap-3 p-4">
        <BookingAvatar name={professional.name} color={professional.color} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="break-words text-sm font-bold text-pine-950">{professional.name}</p>
          {professional.specialty?.trim() ? (
            <p className="text-xs text-pine-900/60">{professional.specialty}</p>
          ) : null}
        </div>
        {changeProfessionalHref ? <ChangeLink href={changeProfessionalHref} label="Trocar profissional" /> : null}
      </div>
      {date && time ? (
        <div className="flex items-center gap-3 p-4">
          <p className="min-w-0 flex-1 text-sm text-pine-900/70">
            {fmtDateLong(date)} às <strong className="text-pine-950">{time}</strong>
          </p>
          {changeTimeHref ? <ChangeLink href={changeTimeHref} label="Trocar dia e horário" /> : null}
        </div>
      ) : null}
    </div>
  );
}

function ChangeLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-xs font-bold text-pine-700 hover:bg-pine-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600 sm:min-h-9"
    >
      Trocar
    </Link>
  );
}
