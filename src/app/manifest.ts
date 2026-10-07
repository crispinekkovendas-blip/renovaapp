import type { MetadataRoute } from "next";
import { getPublicClinic } from "@/lib/marketing-stats";

/**
 * Manifesto do portal do paciente como app instalável. O `start_url` é
 * `/p/app`, que reabre o último link guardado no aparelho; o escopo `/p/`
 * mantém o app só no portal — o resto do site abre no navegador.
 */

export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  // Sem banco, o nome genérico (getPublicClinic nunca lança).
  const { name: clinic } = await getPublicClinic();
  return {
    name: `${clinic} · Meu portal`,
    short_name: "Renova",
    description: "Sua próxima consulta, suas receitas e seus lembretes — sem login, sem senha.",
    start_url: "/p/app",
    scope: "/p/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    background_color: "#ffe4d6",
    theme_color: "#0c221c",
    icons: [
      { src: "/api/pwa/icon?size=192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/api/pwa/icon?size=512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/api/pwa/icon?size=512&maskable=1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
