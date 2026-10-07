import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * A marca em imagem (favicon, ícone de tela inicial, prévia de link): um "R"
 * em Fraunces itálica sobre o pêssego da página. O Satori (por trás do
 * `ImageResponse`) não enxerga fontes do sistema, então as duas fontes da
 * marca vão junto, em TTF (OFL): Fraunces itálica 600 e Karla 700.
 */

export const BRAND_PEACH = "#ffe4d6";
export const BRAND_PINE = "#0c221c";

export type BrandFont = {
  name: string;
  data: Buffer;
  weight: 400 | 600 | 700;
  style: "normal" | "italic";
};

export async function brandFonts(): Promise<BrandFont[]> {
  const [fraunces, karla] = await Promise.all([
    readFile(join(process.cwd(), "src/components/marketing/fonts/fraunces-semibold-italic.ttf")),
    readFile(join(process.cwd(), "src/components/marketing/fonts/karla-bold.ttf")),
  ]);
  return [
    { name: "Fraunces", data: fraunces, weight: 600, style: "italic" },
    { name: "Karla", data: karla, weight: 700, style: "normal" },
  ];
}

/**
 * O quadrado com o "R". `radius` em fração do lado (0 para o ícone da Apple,
 * que o iOS arredonda sozinho); `inverted` troca para pinho com R pêssego.
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
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: inverted ? BRAND_PINE : BRAND_PEACH,
        borderRadius: Math.round(size * radius),
        color: inverted ? BRAND_PEACH : BRAND_PINE,
        fontFamily: "Fraunces",
        fontStyle: "italic",
        fontWeight: 600,
        fontSize: Math.round(size * 0.78),
        lineHeight: 1,
      }}
    >
      <span style={{ marginTop: Math.round(-size * 0.04), marginLeft: Math.round(-size * 0.06) }}>R</span>
    </div>
  );
}
