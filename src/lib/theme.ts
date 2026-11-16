/** Tema claro, escuro ou Marte: a chave do localStorage e o script do <head> (ver components/use-theme.ts). */
export const THEME_KEY = "renova:tema";

/** "light" é a ausência de `data-theme` no <html>. */
export type Theme = "light" | "dark" | "mars";

/** Na ordem em que aparecem em Minha conta (components/theme-picker.tsx). Marte é do app do médico. */
export const THEMES: readonly Theme[] = ["light", "dark", "mars"];

/** O que veio do localStorage ou do `data-theme`: qualquer outra coisa é claro. */
export function parseTheme(value: unknown): Theme {
  return value === "dark" || value === "mars" ? value : "light";
}

/**
 * O tema que o botão do site público e do portal liga a seguir: lá só há claro
 * e escuro. Marte se escolhe no app (Minha conta); quem chega ao site em Marte
 * volta para o claro.
 */
export function nextTheme(current: Theme): "light" | "dark" {
  return current === "light" ? "dark" : "light";
}

/** Roda no <head> antes da pintura: quem escolheu escuro ou Marte não vê o claro piscar. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="mars")document.documentElement.dataset.theme=t}catch(e){}`;
