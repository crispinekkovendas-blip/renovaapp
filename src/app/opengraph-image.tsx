import { ImageResponse } from "next/og";
import { BRAND_PEACH, BRAND_PINE, BrandMark, brandFonts } from "@/components/marketing/brand-image";
import { getPublicClinic } from "@/lib/marketing-stats";
import { REFRAIN } from "@/components/marketing/refrain";

export const alt = "Agende sua consulta online";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * A prévia do link no WhatsApp: pêssego, o nome da clínica, o refrão em
 * itálico e a chamada. O nome vem de `settings` (com o genérico de reserva).
 */
export default async function OpenGraphImage() {
  // getPublicClinic nunca lança: sem banco, vem o nome genérico.
  const [{ name: clinicName }, fonts] = await Promise.all([getPublicClinic(), brandFonts()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: BRAND_PEACH,
          color: BRAND_PINE,
          fontFamily: "Fraunces",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <BrandMark size={88} inverted />
          <div style={{ fontSize: 44, fontStyle: "italic", fontWeight: 600 }}>{clinicName}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 96, fontStyle: "italic", fontWeight: 600, lineHeight: 1.05, letterSpacing: -2 }}>
            {REFRAIN}
          </div>
          <div style={{ fontSize: 30, fontFamily: "Karla", fontWeight: 700, color: "#204239" }}>
            Agende sua consulta online →
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
