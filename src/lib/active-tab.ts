/** Uma sub-aba de seção (Agenda › Semana, Guia clínico › Ortopedia). Sem dependências: o teste em Node lê daqui. */
export interface NavTab {
  href: string;
  label: string;
  /**
   * Aba de uso raro (o Simulador do WhatsApp, o App Android do guia): não ocupa
   * lugar na barra — só aparece enquanto se está nela, para a pessoa saber onde
   * está. Chega-se a ela pela busca (Ctrl+K) ou por um link na tela vizinha.
   */
  secondary?: boolean;
}

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * A aba ativa de uma seção é a de caminho mais longo que casa com a URL: em
 * `/guia/ortopedia/lombalgia` acende Ortopedia; em `/guia/drive/enxaqueca`,
 * só a raiz (`/guia`, o Plantão) casa, e é ela que acende.
 */
export function activeTab(pathname: string, tabs: readonly NavTab[]): NavTab | undefined {
  let best: NavTab | undefined;
  for (const tab of tabs) {
    if (matches(pathname, tab.href) && (!best || tab.href.length > best.href.length)) best = tab;
  }
  return best;
}

/** As abas que a barra mostra: as de sempre e, das raras, só a que está aberta. */
export function visibleTabs(tabs: readonly NavTab[], currentHref: string | undefined): NavTab[] {
  return tabs.filter((tab) => !tab.secondary || tab.href === currentHref);
}

interface Section {
  href: string;
  tabs?: readonly NavTab[];
}

/**
 * A seção ativa é a de caminho mais longo que casa com a URL — o dela ou o de
 * uma de suas abas. É por isso que `/configuracoes/modelos` acende Receituário
 * (onde Modelos é uma aba) e não Configurações. No empate, vale a primeira.
 */
export function activeSection<T extends Section>(pathname: string, items: readonly T[]): T | undefined {
  let best: T | undefined;
  let bestLength = 0;
  for (const item of items) {
    for (const href of [item.href, ...(item.tabs ?? []).map((tab) => tab.href)]) {
      if (matches(pathname, href) && href.length > bestLength) {
        best = item;
        bestLength = href.length;
      }
    }
  }
  return best;
}
