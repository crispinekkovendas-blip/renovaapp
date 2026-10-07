"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { activeNavItem } from "./nav-config";

/**
 * Sub-abas de uma seção (Agenda: Dia / Semana / Lembretes / Retornos;
 * Financeiro: Pagamentos / Convênios) como pílulas no alto do conteúdo.
 * Seções sem abas não mostram nada — a marca e o nome da página ficam na
 * barra lateral e no título da página.
 *
 * No celular as abas rolam de lado numa linha só, em vez de quebrar — e a
 * aba ativa rola para dentro da tela quando fica na beirada.
 */
export function SectionTabs() {
  const pathname = usePathname();
  const activeItem = activeNavItem(pathname);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  if (!activeItem?.tabs) return null;

  return (
    <nav
      ref={nav}
      aria-label={activeItem.label}
      className="scroll-x flex gap-2 px-4 pt-3 sm:px-6 md:flex-wrap md:px-8 md:pt-6 peek:pl-16 print:hidden"
    >
      {activeItem.tabs.map((tab) => {
        // A aba acende também nas páginas de dentro dela (/guia/plantao/sepse),
        // menos a da raiz da seção, que acenderia em todas.
        const active = pathname === tab.href || (tab.href !== activeItem.href && pathname.startsWith(`${tab.href}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`doc-subtab shrink-0 ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
