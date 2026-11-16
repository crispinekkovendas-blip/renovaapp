"use client";

import { nextTheme } from "@/lib/theme";
import { applyTheme, currentTheme, useTheme } from "./use-theme";

/**
 * Botão de tema do site público e do portal: alterna claro e escuro e mostra o
 * tema que liga a seguir. No app do médico a escolha (com o tema Marte) fica em
 * Minha conta — components/theme-picker.tsx.
 */

const LABEL = { light: "Tema claro", dark: "Tema escuro" } as const;

function Icon({ theme }: { theme: "light" | "dark" }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className: "h-5 w-5 shrink-0",
  };
  if (theme === "light") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export function ThemeToggle({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const next = nextTheme(useTheme());

  return (
    <button
      type="button"
      onClick={() => applyTheme(nextTheme(currentTheme()))}
      aria-label={`Usar ${LABEL[next].toLowerCase()}`}
      title={LABEL[next]}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-pine-800 transition-colors hover:bg-pine-100 ${className}`}
    >
      <Icon theme={next} />
      {compact ? null : <span>{LABEL[next]}</span>}
    </button>
  );
}
