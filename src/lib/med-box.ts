/**
 * Geometria da caixinha desenhada do medicamento (`MedIcon`): a cor de cada
 * marca e como o nome comercial cabe na frente da caixa.
 *
 * Sem fotos: a caixa é desenhada, com o nome da marca impresso e a faixa da
 * tarja, então serve para as 3.700 marcas da CMED, não só para as poucas que
 * têm foto livre.
 */

/** Cores de embalagem: nada de vermelho nem preto, que são da tarja. */
export const BOX_COLORS = [
  { main: "#1d5fbf", dark: "#143f80", tint: "#dbe7f8" }, // azul
  { main: "#0f8a8a", dark: "#0a5a5a", tint: "#d5eeee" }, // petróleo
  { main: "#2e8b47", dark: "#1d5a2d", tint: "#d9efdf" }, // verde
  { main: "#e07a1f", dark: "#8f4a0e", tint: "#fbe7d3" }, // laranja
  { main: "#6a3fb0", dark: "#45287a", tint: "#e6ddf4" }, // roxo
  { main: "#c2357f", dark: "#7d1f52", tint: "#f5dbe8" }, // magenta
  { main: "#23407a", dark: "#172a52", tint: "#dde3ef" }, // marinho
  { main: "#1a8fd0", dark: "#0f5a85", tint: "#d6ebf7" }, // celeste
  { main: "#7c8a1f", dark: "#4f5a12", tint: "#ebeed6" }, // oliva
  { main: "#4b4fc9", dark: "#2f327f", tint: "#e0e1f6" }, // anil
] as const;

export type BoxColor = (typeof BOX_COLORS)[number];

/** A mesma marca sempre com a mesma cor (hash FNV-1a do nome, sem acento nem caixa). */
export function boxColor(brand: string): BoxColor {
  const key = brand
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return BOX_COLORS[(h >>> 0) % BOX_COLORS.length];
}

/** Largura aproximada de um texto em negrito, em "em" (Inter 800). */
export function textWidthEm(text: string): number {
  let w = 0;
  for (const ch of text) {
    if (/[iljtfrI1.,'!|:; ]/.test(ch)) w += 0.34;
    else if (/[mwMW]/.test(ch)) w += 0.92;
    else if (/[A-Z0-9]/.test(ch)) w += 0.72;
    else w += 0.6;
  }
  return w;
}

export interface BrandLine {
  text: string;
  /** Tamanho da fonte em unidades do desenho. */
  size: number;
  /** Quando nem a fonte mínima cabe: comprime até esta largura. */
  squeeze?: number;
}

const MAX_SIZE = 13;
const MIN_SIZE = 6;
const LINE_HEIGHT = 1.05;

/** Todas as quebras de `words` em `k` linhas seguidas. */
function splits(words: string[], k: number): string[][] {
  if (k === 1) return [[words.join(" ")]];
  const out: string[][] = [];
  for (let i = 1; i <= words.length - k + 1; i++) {
    for (const rest of splits(words.slice(i), k - 1)) out.push([words.slice(0, i).join(" "), ...rest]);
  }
  return out;
}

/**
 * O nome no maior tamanho que couber em `width` × `height`: uma linha, ou
 * duas ou três quebrando entre palavras ("Losartana Potássica / Medley"). Se
 * nem a fonte mínima couber, a linha é comprimida até a largura.
 */
export function fitBrand(brand: string, width: number, height = 24): BrandLine[] {
  const words = brand.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  let best: { lines: string[]; size: number } | null = null;
  for (let k = 1; k <= Math.min(3, words.length); k++) {
    let bestK: { lines: string[]; size: number } | null = null;
    for (const lines of splits(words, k)) {
      const widest = Math.max(...lines.map(textWidthEm));
      const size = Math.min(MAX_SIZE, width / Math.max(widest, 0.01), height / (k * LINE_HEIGHT));
      if (!bestK || size > bestK.size) bestK = { lines, size };
    }
    // Uma linha a mais só se ganhar tamanho de verdade.
    if (bestK && (!best || bestK.size > best.size * 1.08)) best = bestK;
  }
  const size = Math.max(MIN_SIZE, Math.floor(best!.size * 10) / 10);
  return best!.lines.map((text) =>
    textWidthEm(text) * size > width ? { text, size, squeeze: width } : { text, size },
  );
}
