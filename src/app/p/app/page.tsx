import type { Metadata } from "next";
import { AppStart } from "@/components/pwa/app-start";

/**
 * `start_url` do portal instalado. Toda a lógica é do cliente (o link fica
 * no localStorage do aparelho); esta casca só existe para os metadados.
 */

export const metadata: Metadata = {
  title: "Meu portal",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Meu portal", statusBarStyle: "default" },
};

export default function PortalAppPage() {
  return <AppStart />;
}
