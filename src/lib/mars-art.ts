/**
 * Os desenhos do tema Marte. Nenhum é retrato do planeta: cada um o sugere de
 * um jeito — o relevo em curvas de nível, um cartaz em formas chapadas, as
 * dunas ao pôr do sol.
 */
export const MARS_ARTS = ["relevo", "cartaz", "dunas"] as const;
export type MarsArt = (typeof MARS_ARTS)[number];

/**
 * Um desenho por dia, em rodízio. Depende só da data ("AAAA-MM-DD"), então o
 * mesmo dia mostra o mesmo desenho no Início e no login, para todo mundo.
 */
export function marsArtOf(dateISO: string): MarsArt {
  const [year, month, day] = dateISO.split("-").map(Number);
  const days = Math.floor(Date.UTC(year, (month || 1) - 1, day || 1) / 86_400_000);
  const index = Number.isFinite(days) ? ((days % MARS_ARTS.length) + MARS_ARTS.length) % MARS_ARTS.length : 0;
  return MARS_ARTS[index];
}
