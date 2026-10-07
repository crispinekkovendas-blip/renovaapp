import { ImageResponse } from "next/og";
import { BrandMark, BRAND_PEACH, brandFonts } from "@/components/marketing/brand-image";

/**
 * Ícone do portal instalável: a mesma marca do favicon e da prévia de link
 * (`BrandMark`, Fraunces itálica). `?size=192|512`; `?maskable=1` entrega a
 * versão sem cantos arredondados e com a marca 20% menor, dentro da zona
 * segura que o Android recorta.
 */

export const dynamic = "force-dynamic";

const CACHE = "public, max-age=604800, immutable";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const size = params.get("size") === "512" ? 512 : 192;
  const maskable = params.get("maskable") === "1";
  const fonts = await brandFonts();

  const image = maskable ? (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_PEACH,
      }}
    >
      <BrandMark size={Math.round(size * 0.8)} radius={0} />
    </div>
  ) : (
    <BrandMark size={size} />
  );

  return new ImageResponse(image, {
    width: size,
    height: size,
    fonts,
    headers: { "Cache-Control": CACHE },
  });
}
