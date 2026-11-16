"use client";

import { useId } from "react";
import { THEMES } from "@/lib/theme";
import type { Theme } from "@/lib/theme";
import { applyTheme, useTheme } from "./use-theme";

/**
 * A escolha do tema do app: claro, escuro ou Marte, lado a lado, cada um com
 * uma miniatura da tela. Fica em Minha conta (todos os perfis) e em
 * Configurações (admin); antes era um botão no pé do menu, que dava a volta
 * pelos três. A escolha vale para este navegador — ver use-theme.ts.
 */

/**
 * As cores de cada miniatura são fixas (copiadas de globals.css, theme-dark.css
 * e theme-mars.css): ela mostra o tema que representa, não o que está ligado.
 */
const LOOK: Record<
  Theme,
  { label: string; paper: string; surface: string; line: string; ink: string; active: string; button: string; radius: number }
> = {
  light: {
    label: "Claro",
    paper: "#f5f6f8",
    surface: "#ffffff",
    line: "#dfe4ec",
    ink: "#1a2230",
    active: "#d3dbe6",
    button: "#121a26",
    radius: 4,
  },
  dark: {
    label: "Escuro",
    paper: "#0f141b",
    surface: "#18202a",
    line: "#2a3546",
    ink: "#e6eaf0",
    active: "#2c3d58",
    button: "#eef3fa",
    radius: 4,
  },
  mars: {
    label: "Marte",
    paper: "#000000",
    surface: "#0c0c0e",
    line: "#2b2b31",
    ink: "#f0f0fa",
    active: "#d9652f",
    button: "#f0f0fa",
    radius: 1,
  },
};

/** A tela em miniatura: menu à esquerda, título, um cartão e o botão principal. */
function Miniature({ theme }: { theme: Theme }) {
  const look = LOOK[theme];
  return (
    <svg viewBox="0 0 120 76" className="block h-auto w-full" aria-hidden>
      <rect width="120" height="76" fill={look.paper} />
      {/* Marte: o planeta atrás do conteúdo, como no Início. */}
      {theme === "mars" ? <circle cx="108" cy="8" r="22" fill="#d9652f" opacity="0.85" /> : null}
      <rect width="30" height="76" fill={look.surface} />
      <path d="M30.5 0v76" stroke={look.line} />
      <rect x="7" y="8" width="9" height="9" rx={look.radius} fill={look.button} />
      <rect x="7" y="26" width="16" height="4" rx={look.radius / 2} fill={look.active} />
      <rect x="7" y="35" width="13" height="4" rx={look.radius / 2} fill={look.line} />
      <rect x="7" y="44" width="16" height="4" rx={look.radius / 2} fill={look.line} />
      <rect x="40" y="10" width="34" height="6" rx={look.radius / 2} fill={look.ink} />
      <rect x="40.5" y="24.5" width="69" height="27" rx={look.radius} fill={look.surface} stroke={look.line} />
      <rect x="47" y="32" width="30" height="4" rx={look.radius / 2} fill={look.ink} opacity="0.7" />
      <rect x="47" y="41" width="46" height="4" rx={look.radius / 2} fill={look.line} />
      <rect x="40" y="59" width="30" height="10" rx={look.radius === 1 ? 1 : 5} fill={look.button} />
    </svg>
  );
}

export function ThemePicker({ className = "" }: { className?: string }) {
  const theme = useTheme();
  // Um nome por instância: dois grupos de rádio com o mesmo nome na página viram um só.
  const group = useId();

  return (
    <fieldset className={className}>
      <legend className="sr-only">Tema do app</legend>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {THEMES.map((value) => (
          <label key={value} className="relative block cursor-pointer">
            <input
              type="radio"
              name={group}
              value={value}
              checked={theme === value}
              onChange={() => applyTheme(value)}
              className="peer sr-only"
            />
            <span className="block overflow-hidden rounded-xl border-2 border-[var(--color-line)] transition-colors peer-checked:border-pine-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-pine-600 mars:rounded-[2px]">
              <Miniature theme={value} />
            </span>
            <span
              aria-hidden
              className="absolute top-1.5 right-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-pine-600 text-white peer-checked:flex"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </span>
            <span className="mt-1.5 block text-center text-sm font-bold text-pine-900/70 peer-checked:text-pine-950">
              {LOOK[value].label}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-3 text-xs text-pine-900/55">
        Vale só neste aparelho e navegador: cada pessoa escolhe o seu. As folhas dos documentos e os PDFs continuam
        brancos.
      </p>
    </fieldset>
  );
}
