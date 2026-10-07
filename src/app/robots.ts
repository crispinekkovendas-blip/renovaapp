import type { MetadataRoute } from "next";
import { publicBaseUrl } from "@/lib/marketing-stats";

export const dynamic = "force-dynamic";

/**
 * Só as páginas públicas entram no índice. O portal do paciente e a
 * confirmação carregam token na URL; a área da clínica é privada.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await publicBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        // /validar é pública (quem recebeu um documento confere o código);
        // cada /validar/<código> traz `noindex` na própria página.
        allow: ["/", "/agendar", "/privacidade", "/validar"],
        disallow: [
          "/p/",
          "/confirmar/",
          "/login",
          "/dashboard",
          "/agenda",
          "/pacientes",
          "/financeiro",
          "/relatorios",
          "/configuracoes",
          "/conta",
          "/api/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
