import type { ReactNode } from "react";

/**
 * O cabeçalho de toda seção da página pública: sobretítulo pequeno em
 * versalete, título em Fraunces e, se houver, um parágrafo de apoio. `dark`
 * para as seções em fundo pinho.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  id,
  dark = false,
  className = "",
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  /** id do <h2>, para `aria-labelledby` da seção. */
  id?: string;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={`max-w-2xl ${className}`}>
      <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? "text-paper/55" : "text-pine-900/55"}`}>
        {eyebrow}
      </p>
      <h2
        id={id}
        className={`mt-3 font-display text-3xl font-semibold leading-[1.08] tracking-tight sm:text-[2.75rem] ${
          dark ? "" : "text-pine-950"
        }`}
      >
        {title}
      </h2>
      {lead ? (
        <p className={`mt-4 text-base leading-relaxed sm:text-lg ${dark ? "opacity-75" : "text-pine-900/70"}`}>{lead}</p>
      ) : null}
    </div>
  );
}
