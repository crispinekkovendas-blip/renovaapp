import type { MetadataRoute } from "next";
import { publicBaseUrl } from "@/lib/marketing-stats";

export const dynamic = "force-dynamic";

/** As páginas públicas indexáveis — as mesmas que o robots.txt libera. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await publicBaseUrl();
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/agendar`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/validar`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacidade`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
