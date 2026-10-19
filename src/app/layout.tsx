import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
// Só a folha A4 (prévia do documento) usa a Plus Jakarta: é a fonte embutida no PDF.
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { REFRAIN } from "@/components/marketing/refrain";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  // Base das URLs absolutas (OpenGraph, canonical) em toda página.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://renovaapp.vercel.app"),
  title: { default: "Renova", template: "%s · Renova" },
  description: `Marque, confirme e receba sua receita pelo celular. ${REFRAIN}`,
};

export const viewport: Viewport = {
  themeColor: "#121a26",
  width: "device-width",
  initialScale: 1,
  // Deixa o conteúdo ir até a borda do iPhone; as barras fixas compensam com
  // env(safe-area-inset-*).
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script abaixo põe data-theme antes do React chegar.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Tema escuro escolhido antes: aplicado antes da primeira pintura, sem piscar claro. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
