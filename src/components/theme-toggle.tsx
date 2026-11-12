"use client";

import { useEffect, useState } from "react";
import { THEME_KEY as KEY, nextTheme, parseTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme";

/**
 * Botão de tema. Começa sempre claro; escuro e Marte só ligam pelo botão, e a
 * escolha fica neste navegador (localStorage). O botão mostra o tema que ele
 * liga a seguir: claro → escuro → Marte → claro no app do médico (`mars`);
 * no site e no portal, só claro ↔ escuro.
 *
 * As cores estão em src/app/theme-dark.css e theme-mars.css
 * (html[data-theme="dark" | "mars"]); o sabor de Marte, em mars.css.
 */

/** Avisa os outros botões da página (a barra lateral tem dois) que o tema mudou. */
const CHANGE_EVENT = "shinmed:tema";

const LABEL: Record<Theme, string> = { light: "Tema claro", dark: "Tema escuro", mars: "Tema Marte" };

const currentTheme = () => parseTheme(document.documentElement.dataset.theme);

function Icon({ theme }: { theme: Theme }) {
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
  if (theme === "dark") {
    return (
      <svg {...props}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  }
  // Marte: o planeta com duas crateras e a calota polar.
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.5 5.2c2.6 1.3 6.4 1.3 9 0" />
      <circle cx="9" cy="12.5" r="1.6" />
      <circle cx="15" cy="15" r="1" />
    </svg>
  );
}

export function ThemeToggle({
  className = "",
  compact = false,
  mars = false,
}: {
  className?: string;
  compact?: boolean;
  /** Oferece o tema Marte na volta do botão (só o app do médico). */
  mars?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const sync = () => setTheme(currentTheme());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const next = nextTheme(theme, mars);

  function toggle() {
    // Lê do documento, não do estado: outro botão pode ter trocado o tema.
    const target = nextTheme(currentTheme(), mars);
    if (target === "light") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = target;
    try {
      localStorage.setItem(KEY, target);
    } catch {
      // Sem armazenamento: vale só até recarregar.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Usar ${LABEL[next].toLowerCase().replace("marte", "Marte")}`}
      title={LABEL[next]}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold text-pine-800 transition-colors hover:bg-pine-100 ${className}`}
    >
      <Icon theme={next} />
      {compact ? null : <span>{LABEL[next]}</span>}
    </button>
  );
}
