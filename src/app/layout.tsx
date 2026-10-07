import type { Metadata, Viewport } from "next";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/karla";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { REFRAIN } from "@/components/marketing/refrain";

export const metadata: Metadata = {
  // Base das URLs absolutas (OpenGraph, canonical) em toda página.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://renovaapp.vercel.app"),
  title: { default: "Renova", template: "%s · Renova" },
  description: `Marque, confirme e receba sua receita pelo celular. ${REFRAIN}`,
};

export const viewport: Viewport = {
  themeColor: "#0c221c",
  width: "device-width",
  initialScale: 1,
  // Deixa o conteúdo ir até a borda do iPhone; as barras fixas compensam com
  // env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
