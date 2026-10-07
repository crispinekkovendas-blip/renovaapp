"use client";

import { useEffect, useRef, useState } from "react";
import type { ComposerTab } from "@/lib/composer-editor";
import { TAB_BLURB } from "@/lib/composer-tabs";
import { TabIcon } from "./icons";

/**
 * Os tipos de documento como a barra lateral recolhida do YouTube: ícone e,
 * embaixo, só o nome. No computador é uma coluna estreita à esquerda do
 * compositor, parada enquanto a página rola, que abre com o mouse em cima
 * (nome inteiro + descrição); no celular, a mesma fileira de lado.
 */

export interface TypeOption {
  tab: ComposerTab;
  label: string;
}

/** Hífen opcional: só aparece se a palavra precisar quebrar. */
const SOFT_HYPHEN = String.fromCharCode(0xad);

/**
 * Nomes que cabem nos 80px da barra: "Laudo / relatório" vira "Laudo", e
 * "Encaminhamento" ganha o hífen opcional para quebrar bonito.
 */
const RAIL_LABEL: Partial<Record<ComposerTab, string>> = {
  laudo: "Laudo",
  encaminhamento: `Encaminha${SOFT_HYPHEN}mento`,
};

export function TypeRail({
  tabs,
  tab,
  onSelect,
  vertical,
  className = "",
}: {
  tabs: ReadonlyArray<TypeOption>;
  tab: ComposerTab;
  onSelect(tab: ComposerTab): void;
  /** Coluna (computador) ou fileira (celular). */
  vertical?: boolean;
  className?: string;
}) {
  return vertical ? (
    <RailColumn tabs={tabs} tab={tab} onSelect={onSelect} className={className} />
  ) : (
    <RailRow tabs={tabs} tab={tab} onSelect={onSelect} className={className} />
  );
}

type RailProps = {
  tabs: ReadonlyArray<TypeOption>;
  tab: ComposerTab;
  onSelect(tab: ComposerTab): void;
  className: string;
};

/** Espera antes de abrir: passar o mouse de raspão a caminho do editor não abre nada. */
const OPEN_DELAY = 180;

/**
 * A coluna do computador. Parada, é só ícone e nome; com o mouse em cima
 * (ou o foco do teclado dentro), abre por cima do conteúdo — sem empurrar
 * nada — com o nome inteiro e a linha do que é cada tipo, como o menu do
 * YouTube. Fecha ao sair ou ao escolher.
 */
function RailColumn({ tabs, tab, onSelect, className }: RailProps) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => cancel, []);

  return (
    // A coluna guarda os 80px no layout; a barra aberta passa por cima do conteúdo.
    <div className={`relative z-30 w-20 shrink-0 ${className}`}>
      <nav
        aria-label="Tipo de documento"
        onMouseEnter={() => {
          cancel();
          timer.current = setTimeout(() => setOpen(true), OPEN_DELAY);
        }}
        onMouseLeave={() => {
          cancel();
          setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
        className={`flex shrink-0 flex-col gap-1 overflow-hidden rounded-2xl transition-[width,background-color,box-shadow] duration-200 ease-out ${
          open ? "w-72 bg-white shadow-[0_12px_40px_-8px_rgba(40,20,70,0.28)] ring-1 ring-[#e8e1f0]" : "w-20"
        }`}
      >
        {tabs.map((item) => {
          const on = item.tab === tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => {
                onSelect(item.tab);
                cancel();
                setOpen(false);
              }}
              aria-current={on ? "page" : undefined}
              aria-label={`${item.label}: ${TAB_BLURB[item.tab]}`}
              className={`flex h-[4.75rem] shrink-0 items-center rounded-xl transition-colors ${
                open ? "w-72 flex-row gap-3 px-3 text-left" : "w-20 flex-col justify-center gap-0.5 px-0.5 text-center"
              } ${on ? "bg-pine-100 text-pine-950" : "text-pine-900/65 hover:bg-pine-50 hover:text-pine-950"}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  on ? "bg-pine-950 text-white" : "text-pine-700"
                }`}
                aria-hidden
              >
                <TabIcon tab={item.tab} className="h-[18px] w-[18px]" />
              </span>
              {open ? (
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[13.5px] leading-tight text-pine-950 ${on ? "font-extrabold" : "font-bold"}`}>
                    {item.label}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-pine-900/55">{TAB_BLURB[item.tab]}</span>
                </span>
              ) : (
                <span
                  className={`max-w-full text-[10.5px] leading-tight tracking-tight [overflow-wrap:anywhere] ${
                    on ? "font-extrabold" : "font-semibold"
                  }`}
                >
                  {RAIL_LABEL[item.tab] ?? item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** A fileira do celular: ícone e nome, rolando de lado; o tipo aberto sempre à vista. */
function RailRow({ tabs, tab, onSelect, className }: RailProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active) return;
    const left = active.offsetLeft - nav.offsetLeft;
    if (left < nav.scrollLeft || left + active.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = Math.max(0, left - 8);
    }
  }, [tab]);

  return (
    <nav ref={ref} aria-label="Tipo de documento" className={`scroll-x -mx-1 flex gap-1 px-1 ${className}`}>
      {tabs.map((item) => {
        const on = item.tab === tab;
        return (
          <button
            key={item.tab}
            type="button"
            onClick={() => onSelect(item.tab)}
            aria-current={on ? "page" : undefined}
            title={`${item.label}: ${TAB_BLURB[item.tab]}`}
            className={`flex w-20 shrink-0 flex-col items-center gap-1 rounded-xl px-0.5 py-2.5 text-center transition-colors ${
              on ? "bg-pine-100 text-pine-950" : "text-pine-900/65 hover:bg-pine-50 hover:text-pine-950"
            }`}
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                on ? "bg-pine-950 text-white" : "text-pine-700"
              }`}
              aria-hidden
            >
              <TabIcon tab={item.tab} className="h-[18px] w-[18px]" />
            </span>
            <span
              className={`max-w-full text-[10.5px] leading-tight tracking-tight [overflow-wrap:anywhere] ${
                on ? "font-extrabold" : "font-semibold"
              }`}
            >
              {RAIL_LABEL[item.tab] ?? item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
