/**
 * As telas do compositor de documentos. Antes era um pop-up com tudo junto;
 * agora são telas inteiras, uma por vez, com voltar — como num app. A barra
 * de progresso tem quatro etapas; a etapa "Montar" se abre em telas menores,
 * conforme o tipo:
 *
 *   tipo → [montar] → emissao → revisar → (pronto, página própria)
 *
 *   texto (atestado, encaminhamento, laudo, orientações):
 *     modelo → montar (preencher) → previa
 *   receituário:
 *     montar (a receita) → adicionar → medicamento → … → previa
 *
 * A tela atual vive na URL (`?tela=`), então o voltar do navegador e o do
 * celular andam entre elas. Puro, para testar sem React.
 */

import type { ComposerTab } from "./composer-editor.ts";

export const SCREENS = ["tipo", "modelo", "montar", "adicionar", "medicamento", "previa", "emissao", "revisar"] as const;
export type ScreenId = (typeof SCREENS)[number];

/** As quatro etapas da barra de progresso. */
export const STEPS = ["tipo", "montar", "emissao", "revisar"] as const;
export type StepId = (typeof STEPS)[number];

export const STEP_LABEL: Record<StepId, string> = {
  tipo: "Tipo",
  montar: "Montar",
  emissao: "Nesta emissão",
  revisar: "Revisar e emitir",
};

/** Em que etapa cada tela está. */
export const SCREEN_STEP: Record<ScreenId, StepId> = {
  tipo: "tipo",
  modelo: "montar",
  montar: "montar",
  adicionar: "montar",
  medicamento: "montar",
  previa: "montar",
  emissao: "emissao",
  revisar: "revisar",
};

export const SCREEN_TITLE: Record<ScreenId, string> = {
  tipo: "O que vai emitir?",
  modelo: "Escolha o modelo",
  montar: "Montar",
  adicionar: "Adicionar medicamento",
  medicamento: "Medicamento",
  previa: "Prévia da folha",
  emissao: "Nesta emissão",
  revisar: "Revisar e emitir",
};

/** Para onde o "←" leva quando não há tela anterior no histórico (entrou por link direto ou F5). */
export const SCREEN_PARENT: Record<ScreenId, ScreenId | null> = {
  tipo: null,
  modelo: "tipo",
  montar: "tipo",
  adicionar: "montar",
  medicamento: "montar",
  previa: "montar",
  emissao: "tipo",
  revisar: "emissao",
};

export function isScreen(value: unknown): value is ScreenId {
  return typeof value === "string" && (SCREENS as readonly string[]).includes(value);
}

/** Atestado, encaminhamento, laudo e orientações: texto com modelo. */
export function isTextTab(tab: ComposerTab): boolean {
  return tab !== "receituario" && tab !== "receita";
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

/**
 * A tela que o tipo aberto aceita. "Modelo" é de texto; "Adicionar" e
 * "Medicamento" são do receituário, e "Medicamento" só com um aberto (um F5
 * esquece qual era). A receita digital (Memed) só tem a tela de montar.
 */
export function screenForTab(screen: ScreenId, tab: ComposerTab, hasOpenMedication: boolean): ScreenId {
  if (screen === "modelo" && !isTextTab(tab)) return "montar";
  if ((screen === "adicionar" || screen === "medicamento") && tab !== "receituario") return "montar";
  if (screen === "medicamento" && !hasOpenMedication) return "montar";
  if (screen === "previa" && tab === "receita") return "montar";
  return screen;
}

/** Depois de escolher o tipo: texto passa pela escolha do modelo; receituário e Memed vão direto. */
export function screenAfterType(tab: ComposerTab): ScreenId {
  return isTextTab(tab) ? "modelo" : "montar";
}

/** A URL atual com a tela trocada (mantém kind, encounter, rascunho…). */
export function screenHref(href: string, screen: ScreenId): string {
  const url = new URL(href);
  url.searchParams.set("tela", screen);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Posição da etapa na barra de progresso (1 a 4). */
export function screenIndex(screen: ScreenId): number {
  return STEPS.indexOf(SCREEN_STEP[screen]) + 1;
}
