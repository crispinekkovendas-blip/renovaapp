import { ImageResponse } from "next/og";
import { BrandMark, brandFonts } from "@/components/marketing/brand-image";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Sem cantos arredondados: o iOS aplica a máscara dele (cantos transparentes ficariam pretos).
export default async function AppleIcon() {
  return new ImageResponse(<BrandMark size={size.width} radius={0} />, {
    ...size,
    fonts: await brandFonts(),
  });
}
