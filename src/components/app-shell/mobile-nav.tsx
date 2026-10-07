"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/lib/actions";
import { IconLogout } from "@/components/icons";
import { CloseButton } from "@/components/close-button";
import type { Role } from "@/lib/db";
import { activeNavItem, navItemsFor } from "./nav-config";

/**
 * A navegação do celular (abaixo de md). Duas peças:
 *
 * - **Barra no alto**: marca, o nome da seção onde se está e o avatar da conta.
 *   Fica colada no topo enquanto a página rola.
 * - **Abas embaixo**: as quatro primeiras seções do perfil, ao alcance do
 *   polegar, e "Mais" — uma folha que sobe com o resto (Relatórios,
 *   Configurações, Ajuda, Conta, Sair).
 *
 * As duas respeitam o recorte do iPhone (`env(safe-area-inset-*)`) e somem na
 * impressão. No tablet e no desktop quem navega é a `SideNav`.
 */

const MAX_TABS = 4;

export function MobileTopBar({ name }: { name: string }) {
  const pathname = usePathname();
  const current = activeNavItem(pathname);
  const title =
    pathname === "/conta" ? "Minha conta" : pathname.startsWith("/ajuda") ? "Ajuda" : (current?.label ?? "Renova");
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-[#eee7f4] bg-white/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden print:hidden">
      <div className="flex h-14 min-w-0 flex-1 items-center gap-3">
        <Link
          href="/dashboard"
          aria-label="Início"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine-950 text-base font-extrabold text-white"
        >
          R
        </Link>
        <p className="min-w-0 truncate text-[17px] font-extrabold tracking-tight text-pine-950">{title}</p>
      </div>
      <Link
        href="/conta"
        aria-label="Minha conta"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-peach-200 text-sm font-extrabold text-pine-950"
      >
        {initial}
      </Link>
    </header>
  );
}

export function MobileTabBar({ name, role }: { name: string; role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = navItemsFor(role);
  const tabs = items.slice(0, MAX_TABS);
  const rest = items.slice(MAX_TABS);
  const activeHref = activeNavItem(pathname, items)?.href;
  const isActive = (href: string) => href === activeHref;
  const moreActive = rest.some((item) => isActive(item.href)) || pathname === "/conta" || pathname.startsWith("/ajuda");

  // Trocar de página fecha a folha.
  useEffect(() => setOpen(false), [pathname]);

  // Esc fecha; a página de trás não rola com a folha aberta.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eee7f4] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden print:hidden"
      >
        <ul className="mx-auto flex max-w-lg">
          {tabs.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`tabbar-item ${active ? "active" : ""}`}
                >
                  <span className="tabbar-icon">
                    <Icon />
                  </span>
                  <span className="max-w-full truncate">{item.short ?? item.label}</span>
                </Link>
              </li>
            );
          })}
          <li className="min-w-0 flex-1">
            <button
              type="button"
              aria-expanded={open}
              aria-controls="mobile-more"
              onClick={() => setOpen((v) => !v)}
              className={`tabbar-item w-full cursor-pointer ${moreActive || open ? "active" : ""}`}
            >
              <span className="tabbar-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </span>
              <span>Mais</span>
            </button>
          </li>
        </ul>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden print:hidden" id="mobile-more">
          <div
            className="sheet-backdrop absolute inset-0 bg-pine-950/40 backdrop-blur-sm"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mais opções"
            className="sheet-panel absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] bg-white px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-12px_40px_-12px_rgba(61,14,107,0.35)]"
          >
            <div className="relative mb-1">
              <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-[#e2dcec]" aria-hidden />
              <CloseButton onClick={() => setOpen(false)} className="absolute -top-1 right-0" />
            </div>
            <Link href="/conta" className="mb-3 flex items-center gap-3 rounded-2xl bg-pine-50 p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-peach-200 font-extrabold text-pine-950">
                {name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-bold text-ink">{name}</span>
                <span className="block text-[13px] text-pine-900/60">Minha conta</span>
              </span>
            </Link>
            <ul className="flex flex-col gap-1">
              {rest.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={`nav-pill min-h-12 ${isActive(item.href) ? "active" : ""}`}>
                      <Icon />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link href="/ajuda#novidades" className="nav-pill min-h-12">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 3v2M12 19v2M4.2 6.2l1.4 1.4M18.4 16.4l1.4 1.4M3 12h2M19 12h2M4.2 17.8l1.4-1.4M18.4 7.6l1.4-1.4" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                  Novidades
                </Link>
              </li>
              <li>
                <Link href="/ajuda" className={`nav-pill min-h-12 ${pathname === "/ajuda" ? "active" : ""}`}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5V14M12 17h.01" />
                  </svg>
                  Precisando de ajuda?
                </Link>
              </li>
              <li className="mt-2 border-t border-[#eee7f4] pt-2">
                <form action={logoutAction}>
                  <button type="submit" className="nav-pill min-h-12 w-full cursor-pointer text-pine-900/70">
                    <IconLogout />
                    Sair
                  </button>
                </form>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
