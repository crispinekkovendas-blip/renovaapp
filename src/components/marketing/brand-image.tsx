import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * A marca em imagem (favicon, ícone de tela inicial, prévia de link), no tema
 * "Tevet & Iyar": um "R" reto em Karla 700 sobre o azul-marinho de Tevet, com o
 * fio de bronze de Iyar embaixo. O Satori (por trás do `ImageResponse`) não
 * enxerga fontes do sistema, então a fonte vai junto, em TTF (OFL).
 */

/** Fundo claro das imagens (a névoa do site) e o azul-marinho da marca. */
export const BRAND_PEACH = "#e6ebf2";
export const BRAND_PINE = "#121a26";
export const BRAND_BRONZE = "#b8955a";

export type BrandFont = {
  name: string;
  data: Buffer;
  weight: 400 | 600 | 700;
  style: "normal" | "italic";
};

export async function brandFonts(): Promise<BrandFont[]> {
  const karla = await readFile(join(process.cwd(), "src/components/marketing/fonts/karla-bold.ttf"));
  return [{ name: "Karla", data: karla, weight: 700, style: "normal" }];
}

/**
 * O quadrado com o "R". `radius` em fração do lado (0 para o ícone da Apple,
 * que o iOS arredonda sozinho); `inverted` troca para névoa com R marinho.
 */
export function BrandMark({
  size,
  radius = 0.22,
  inverted = false,
}: {
  size: number;
  radius?: number;
  inverted?: boolean;
}) {
  const ink = inverted ? BRAND_PINE : "#ffffff";
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: inverted ? BRAND_PEACH : BRAND_PINE,
        borderRadius: Math.round(size * radius),
        color: ink,
        fontFamily: "Karla",
        fontWeight: 700,
        fontSize: Math.round(size * 0.6),
        lineHeight: 1,
      }}
    >
      <span style={{ marginTop: Math.round(size * 0.04) }}>R</span>
      <span
        style={{
          width: Math.round(size * 0.34),
          height: Math.max(2, Math.round(size * 0.05)),
          marginTop: Math.round(size * 0.05),
          background: BRAND_BRONZE,
          borderRadius: 999,
        }}
      />
    </div>
  );
}
