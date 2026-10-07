"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { IconLogout } from "@/components/icons";
import type { Role } from "@/lib/db";
import { activeNavItem, navItemsFor } from "./nav-config";

/**
 * Barra lateral clara com rótulos (o "tablet da Mevo"): marca no alto, uma
 * pílula por seção, e embaixo quem está logado com o botão de sair. No
 * celular some (quem navega é `mobile-nav.tsx`); no tablet (toque) é só
 * ícones (w-16), com rótulos a partir de lg.
 *
 * Com mouse (`peek:`), a barra fica escondida fora da tela, deixando só uma
 * faixa na borda esquerda e uma lingueta com o ícone de menu: passar o mouse (ou chegar pelo Tab) a traz por
 * cima do conteúdo, e ela volta a sumir quando o mouse sai.
 */

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  recepcao: "Recepção",
  profissional: "Profissional",
};

export function SideNav({ name, role }: { name: string; role: Role }) {
  const pathname = usePathname();
  const items = navItemsFor(role);
  const activeHref = activeNavItem(pathname, items)?.href;
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <aside className="group/side sticky top-0 hidden h-dvh w-16 shrink-0 flex-col border-r border-[#eee7f4] bg-white px-2 py-4 md:flex lg:w-56 lg:px-3 print:hidden peek:fixed peek:left-0 peek:z-40 peek:w-60 peek:-translate-x-[calc(100%-14px)] peek:px-3 peek:transition-[translate,box-shadow] peek:delay-200 peek:duration-200 peek:ease-out peek:hover:translate-x-0 peek:hover:shadow-[8px_0_32px_-12px_rgba(40,20,70,0.25)] peek:hover:delay-75 peek:has-[:focus-visible]:translate-x-0 peek:has-[:focus-visible]:delay-0">
      {/* A lingueta: sai da borda da barra escondida com o ícone de menu, para
          dizer que há navegação ali. Passar o mouse nela abre (é filha da barra). */}
      <span
        aria-hidden
        className="absolute top-5 left-full hidden h-12 items-center gap-0.5 rounded-r-2xl bg-pine-950 pr-1.5 pl-1 text-white shadow-[4px_4px_16px_-6px_rgba(40,20,70,0.45)] transition-opacity peek:flex group-hover/side:pointer-events-none group-hover/side:opacity-0 group-has-[:focus-visible]/side:opacity-0"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          className="h-[18px] w-[18px]"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3 w-3 opacity-70"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
      {/* Escondida, só a alça aparece: o conteúdo esmaece para não vazar pela faixa. */}
      <div className="flex min-h-0 flex-1 flex-col peek:opacity-0 peek:transition-opacity peek:delay-200 peek:duration-150 peek:group-hover/side:opacity-100 peek:group-hover/side:delay-75 peek:group-has-[:focus-visible]/side:opacity-100 peek:group-has-[:focus-visible]/side:delay-0">
        <Link href="/dashboard" className="mb-5 flex items-center gap-2.5 px-1.5 lg:px-2" aria-label="Início">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine-950 text-base font-extrabold text-white">
            R
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight text-pine-950 lg:block peek:block">Renova</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {items.map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-current={active ? "page" : undefined}
                className={`nav-pill justify-center lg:justify-start peek:justify-start ${active ? "active" : ""}`}
              >
                <Icon />
                <span className="hidden lg:inline peek:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Como no rodapé da barra da Mevo: "Tutoriais" e "Precisando de ajuda?" em pílulas de contorno. */}
        <div className="mb-3 hidden flex-col gap-2 lg:flex peek:flex">
          <Link
            href="/ajuda#novidades"
            className="flex items-center gap-2.5 rounded-full border border-[#e2dcec] bg-white px-3.5 py-2 text-[12.5px] font-bold text-pine-900/75 transition-colors hover:border-pine-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-pine-600"
              aria-hidden
            >
              <path d="M12 3v2M12 19v2M4.2 6.2l1.4 1.4M18.4 16.4l1.4 1.4M3 12h2M19 12h2M4.2 17.8l1.4-1.4M18.4 7.6l1.4-1.4" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
            Novidades
          </Link>
          <Link
            href="/ajuda"
            className="flex items-center gap-2.5 rounded-full border border-[#e2dcec] bg-white px-3.5 py-2 text-[12.5px] font-bold text-pine-900/75 transition-colors hover:border-pine-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-pine-600"
              aria-hidden
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 17h.01" />
            </svg>
            Precisando de ajuda?
          </Link>
        </div>

        <div className="mt-1 flex flex-col gap-1 border-t border-[#eee7f4] pt-3">
          <Link
            href="/conta"
            title={`${name} · ${ROLE_LABEL[role]} — minha conta`}
            className={`flex items-center gap-3 rounded-2xl px-1.5 py-2 transition-colors hover:bg-pine-50 lg:px-2 ${
              pathname === "/conta" ? "bg-pine-50" : ""
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-peach-200 text-sm font-extrabold text-pine-950">
              {initial}
            </span>
            <span className="hidden min-w-0 lg:block peek:block">
              <span className="block truncate text-[13px] font-bold text-ink">{name}</span>
              <span className="block text-[11.5px] text-pine-900/60">{ROLE_LABEL[role]}</span>
            </span>
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              title="Sair"
              className="nav-pill w-full cursor-pointer justify-center text-pine-900/60 hover:text-pine-950 lg:justify-start peek:justify-start"
            >
              <IconLogout />
              <span className="hidden lg:inline peek:inline">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
