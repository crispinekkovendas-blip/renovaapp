"use client";

import { useEffect, useState } from "react";
import { THEME_KEY as KEY } from "@/lib/theme";

/**
 * Tema claro/escuro. Começa sempre claro; o escuro só liga pelo botão, e a
 * escolha fica neste navegador (localStorage). O CSS do escuro está em
 * src/app/theme-dark.css (html[data-theme="dark"]).
 */

export function ThemeToggle({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.dataset.theme === "dark");
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      // Sem armazenamento: vale só até recarregar.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
      title={dark ? "Tema claro" : "Tema escuro"}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-pine-800 transition-colors hover:bg-pine-100 ${className}`}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5 shrink-0">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5 shrink-0">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
      {compact ? null : <span>{dark ? "Tema claro" : "Tema escuro"}</span>}
    </button>
  );
}
