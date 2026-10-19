/** Tema claro/escuro: a chave do localStorage e o script do <head> (ver components/theme-toggle.tsx). */
export const THEME_KEY = "renova:tema";

/** Roda no <head> antes da pintura: quem escolheu escuro não vê o claro piscar. */
export const THEME_INIT_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
