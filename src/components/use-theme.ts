"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY, parseTheme } from "@/lib/theme";
import type { Theme } from "@/lib/theme";

/**
 * O tema em uso neste navegador, para quem o mostra ou troca (a escolha em
 * Minha conta, o botão do site e do portal). Começa sempre claro; escuro e
 * Marte só ligam por escolha, e ela fica no localStorage — o script do <head>
 * (lib/theme.ts) a aplica antes da primeira pintura.
 *
 * As cores estão em src/app/theme-dark.css e theme-mars.css
 * (html[data-theme="dark" | "mars"]); o sabor de Marte, em mars.css.
 */

/** Avisa os outros controles da página que o tema mudou. */
const CHANGE_EVENT = "shinmed:tema";

/** Lê do documento, não de um estado: outro controle pode ter trocado o tema. */
export const currentTheme = (): Theme => parseTheme(document.documentElement.dataset.theme);

export function applyTheme(target: Theme) {
  if (target === "light") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = target;
  try {
    localStorage.setItem(THEME_KEY, target);
  } catch {
    // Sem armazenamento: vale só até recarregar.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

/** No servidor (e até hidratar) é claro; depois, o que estiver no <html>. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, currentTheme, () => "light");
}
