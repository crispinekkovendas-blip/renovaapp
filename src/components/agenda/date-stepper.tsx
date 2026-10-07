import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

/**
 * Navegação de data do cabeçalho (agenda do dia, da semana e lembretes).
 * Celular: 1ª linha ‹ data Ir ›; 2ª linha o atalho de "hoje" e as ações
 * (`children`) dividindo a largura. Do sm em diante, uma fileira só.
 * O formulário é GET sem action: recarrega a própria página com `?date=`.
 */
export function DateStepper({
  prev,
  next,
  date,
  dateLabel,
  hidden,
  jump,
  children,
}: {
  prev: { href: string; label: string };
  next: { href: string; label: string };
  /** Valor inicial do campo de data. */
  date: string;
  dateLabel: string;
  /** Campos que o formulário "Ir" precisa manter (ex.: filtro de profissional). */
  hidden?: Record<string, string | number>;
  /** Atalho para o ponto de partida ("Hoje", "Amanhã"). */
  jump: { href: string; label: string };
  children: ReactNode;
}) {
  const jumpLink = (className: string) => (
    <Link href={jump.href} className={`btn btn-outline ${className}`}>
      {jump.label}
    </Link>
  );

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-2">
        <Link href={prev.href} className="btn btn-outline shrink-0 px-2.5" aria-label={prev.label}>
          <IconChevronLeft className="h-4 w-4" />
        </Link>
        {jumpLink("hidden sm:inline-flex")}
        <form className="flex min-w-0 flex-1 items-center gap-1 sm:order-last sm:ml-1 sm:flex-none">
          <input
            type="date"
            name="date"
            defaultValue={date}
            aria-label={dateLabel}
            className="input min-w-0 flex-1 sm:w-auto sm:flex-none"
          />
          {Object.entries(hidden ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <button type="submit" className="btn btn-ghost shrink-0 px-3">
            Ir
          </button>
        </form>
        <Link href={next.href} className="btn btn-outline shrink-0 px-2.5" aria-label={next.label}>
          <IconChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex gap-2 *:flex-1 sm:*:flex-none">
        {jumpLink("sm:hidden")}
        {children}
      </div>
    </div>
  );
}
