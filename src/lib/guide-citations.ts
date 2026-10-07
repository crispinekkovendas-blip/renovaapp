/** Citações da resposta do guia ([[id]]): sem dependências, para servir ao servidor e à tela. */

/**
 * Uma citação ou um grupo delas, como o modelo às vezes escreve:
 * [[a#1]], [[a#1], [b#2]], [[a#1, b#2]].
 */
export const CITATION = /\[\[?[a-z0-9-]+#\d+\]?(?:\s*[,;]?\s*\[?[a-z0-9-]+#\d+\]?)*\]\]?/g;

/** A aba de cada fonte, pelo id: "drive-…", "receita-…" ou um tópico do plantão. */
export const SOURCE_NAME = { plantao: "Plantão", receitas: "Receitas prontas", drive: "Drive" } as const;

export function sourceOf(id: string): keyof typeof SOURCE_NAME {
  return id.startsWith("drive-") ? "drive" : id.startsWith("receita-") ? "receitas" : "plantao";
}

/** Onde abrir uma fonte citada; respostas antigas da memória não trazem o caminho. */
export function sourceHref(id: string, href?: string): string {
  if (href) return href;
  const slug = id.split("#")[0];
  if (slug.startsWith("drive-")) return `/guia/drive/${slug.slice("drive-".length)}`;
  if (slug.startsWith("receita-")) return "/guia";
  return `/guia/plantao/${slug}`;
}

/** As citações de um texto, na ordem em que aparecem, sem repetir. */
export function citedIds(text: string): string[] {
  const ids: string[] = [];
  for (const group of text.match(CITATION) ?? []) {
    for (const id of group.match(/[a-z0-9-]+#\d+/g) ?? []) if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}
