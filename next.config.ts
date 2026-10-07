import path from "node:path";
import type { NextConfig } from "next";

// As rotas de imagem (favicon, apple-icon, Open Graph, ícone do PWA) leem as
// fontes da marca do disco em tempo de execução; o tracing da Vercel precisa
// saber que elas fazem parte do bundle dessas funções.
const BRAND_FONTS = ["./src/components/marketing/fonts/*"];

const nextConfig: NextConfig = {
  // O "N" do modo dev fica em cima da barra de abas do celular.
  devIndicators: false,
  experimental: {
    // Trocar de aba e voltar reaproveita a página já vista por 30 s, em vez de
    // ir ao servidor de novo; salvar qualquer coisa (revalidatePath) invalida.
    staleTimes: { dynamic: 30, static: 180 },
  },
  outputFileTracingRoot: path.join(process.cwd()),
  outputFileTracingIncludes: {
    "/opengraph-image": BRAND_FONTS,
    "/icon": BRAND_FONTS,
    "/apple-icon": BRAND_FONTS,
    "/api/pwa/icon": BRAND_FONTS,
    // Os APKs do app Android que o site entrega (app-releases.ts).
    "/api/app/apk": ["./android-releases/**"],
    "/guia/app": ["./android-releases/releases.json"],
  },
};

export default nextConfig;
