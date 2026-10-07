import type { ReactNode } from "react";
import Link from "next/link";

export interface SiteNavLink {
  href: string;
  label: string;
}

/** Foco visível nos links soltos da página pública (os botões já trazem o seu). */
export const FOCUS_RING =
  "rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600";

/**
 * A barra de cima de todas as páginas públicas: o nome da clínica (volta ao
 * início) e, à direita, o que a página pedir — na landing, as âncoras e o
 * "Agendar" sempre à mão (a barra gruda no topo); no agendamento, só o
 * caminho de volta. Encosta no topo do iPhone (viewport-fit=cover): desce
 * pelo recorte da câmera.
 */
export function SiteHeader({
  clinicName,
  nav = [],
  cta = false,
  aside,
  sticky = false,
  width = "max-w-6xl",
}: {
  clinicName: string;
  /** Âncoras da página; só aparecem a partir do tablet. */
  nav?: SiteNavLink[];
  /** Botão "Agendar" compacto à direita. */
  cta?: boolean;
  /** Conteúdo livre à direita (ex.: "← Início"). */
  aside?: ReactNode;
  sticky?: boolean;
  /** Largura da coluna, a mesma do conteúdo da página. */
  width?: string;
}) {
  return (
    <header
      className={`z-30 border-b border-pine-900/10 bg-peach-50/90 pt-[env(safe-area-inset-top)] backdrop-blur-md ${
        sticky ? "sticky top-0" : ""
      }`}
    >
      <div className={`mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6 ${width}`}>
        <Link
          href="/"
          className={`min-w-0 truncate font-display text-xl font-semibold italic text-pine-950 sm:text-2xl ${FOCUS_RING}`}
        >
          {clinicName}
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {nav.length > 0 ? (
            <nav aria-label="Seções da página" className="hidden md:block">
              <ul className="flex items-center gap-1">
                {nav.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className={`inline-flex items-center px-3 py-2 text-sm font-bold text-pine-900/70 transition-colors hover:text-pine-950 ${FOCUS_RING}`}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          {aside}
          {cta ? (
            <Link
              href="/agendar"
              className="btn btn-primary min-h-11 px-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600"
            >
              Agendar
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
