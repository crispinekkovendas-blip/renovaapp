/**
 * As telas do compositor de documentos. Antes era um pop-up com tudo junto;
 * agora são telas inteiras, uma por vez, com voltar — como num app:
 *
 *   tipo → montar → emissao → revisar → (pronto, página própria)
 *
 * A tela atual vive na URL (`?tela=`), então o voltar do navegador e o do
 * celular andam entre elas. Puro, para testar sem React.
 */

export const SCREENS = ["tipo", "montar", "emissao", "revisar"] as const;
export type ScreenId = (typeof SCREENS)[number];

export const SCREEN_TITLE: Record<ScreenId, string> = {
  tipo: "O que vai emitir?",
  montar: "Montar",
  emissao: "Nesta emissão",
  revisar: "Revisar e emitir",
};

/** Para onde o "←" leva quando não há tela anterior no histórico (entrou por link direto ou F5). */
export const SCREEN_PARENT: Record<ScreenId, ScreenId | null> = {
  tipo: null,
  montar: "tipo",
  emissao: "tipo",
  revisar: "emissao",
};

export function isScreen(value: unknown): value is ScreenId {
  return typeof value === "string" && (SCREENS as readonly string[]).includes(value);
}

/**
 * Onde o compositor abre. Já há documentos na pilha (Renovar, modelo,
 * rascunho) → "Nesta emissão", para ver o que vai sair; o tipo veio no link
 * ("Nova receita" do Receituário, pílula da ficha) → direto para montar;
 * senão, a escolha do tipo.
 */
export function initialScreen(opts: { itemCount: number; kindChosen: boolean }): ScreenId {
  if (opts.itemCount > 0) return "emissao";
  if (opts.kindChosen) return "montar";
  return "tipo";
}

/**
 * A tela que vale de verdade: a da URL, desde que faça sentido. Revisar sem
 * nada na pilha (F5 depois de esvaziar) cai em "Nesta emissão".
 */
export function resolveScreen(param: string | null, fallback: ScreenId, itemCount: number): ScreenId {
  const screen = isScreen(param) ? param : fallback;
  return screen === "revisar" && itemCount === 0 ? "emissao" : screen;
}

/** A URL atual com a tela trocada (mantém kind, encounter, rascunho…). */
export function screenHref(href: string, screen: ScreenId): string {
  const url = new URL(href);
  url.searchParams.set("tela", screen);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Posição na barra de progresso (1 a 4). */
export function screenIndex(screen: ScreenId): number {
  return SCREENS.indexOf(screen) + 1;
}
