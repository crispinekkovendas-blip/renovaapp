/** Uma sub-aba de seção (Agenda › Semana, Guia clínico › Ortopedia). Sem dependências: o teste em Node lê daqui. */
export interface NavTab {
  href: string;
  label: string;
}

/**
 * A aba ativa de uma seção é a de caminho mais longo que casa com a URL: em
 * `/guia/ortopedia/lombalgia` acende Ortopedia; em `/guia/drive/enxaqueca`,
 * só a raiz (`/guia`, o Plantão) casa, e é ela que acende.
 */
export function activeTab(pathname: string, tabs: readonly NavTab[]): NavTab | undefined {
  let best: NavTab | undefined;
  for (const tab of tabs) {
    const matches = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    if (matches && (!best || tab.href.length > best.href.length)) best = tab;
  }
  return best;
}
