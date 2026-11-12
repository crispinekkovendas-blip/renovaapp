/** Tema claro, escuro ou Marte: a chave do localStorage e o script do <head> (ver components/theme-toggle.tsx). */
export const THEME_KEY = "renova:tema";

/** "light" é a ausência de `data-theme` no <html>. */
export type Theme = "light" | "dark" | "mars";

/** O que veio do localStorage ou do `data-theme`: qualquer outra coisa é claro. */
export function parseTheme(value: unknown): Theme {
  return value === "dark" || value === "mars" ? value : "light";
}

/**
 * O tema que o botão liga a seguir: claro → escuro → Marte → claro. Marte é do
 * app do médico; no site público e no portal o botão só alterna claro e escuro
 * (e quem chega lá em Marte volta para o claro).
 */
export function nextTheme(current: Theme, withMars: boolean): Theme {
  if (current === "light") return "dark";
  if (current === "dark" && withMars) return "mars";
  return "light";
}

/** Roda no <head> antes da pintura: quem escolheu escuro ou Marte não vê o claro piscar. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="mars")document.documentElement.dataset.theme=t}catch(e){}`;
