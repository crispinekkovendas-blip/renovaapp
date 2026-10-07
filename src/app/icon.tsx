import { ImageResponse } from "next/og";
import { BrandMark, brandFonts } from "@/components/marketing/brand-image";

// 96px (múltiplo de 48, como o Google pede): o navegador reduz para a aba.
export const size = { width: 96, height: 96 };
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(<BrandMark size={size.width} />, { ...size, fonts: await brandFonts() });
}
