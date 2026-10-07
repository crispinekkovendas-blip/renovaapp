import type { Metadata } from "next";
import type { ReactNode } from "react";
import { HubPwa } from "@/components/pwa/hub-pwa";

/**
 * Envolve o portal do paciente com a camada "app": guardar o link no
 * aparelho, registrar o service worker e oferecer os lembretes por push.
 * O token NÃO é verificado aqui — a página verifica e a ação de assinar
 * verifica de novo; o componente cliente só o guarda e repassa.
 */

export const metadata: Metadata = {
  // iOS usa estas tags para abrir o portal em tela cheia depois de "Adicionar à Tela de Início".
  appleWebApp: { capable: true, title: "Meu portal", statusBarStyle: "default" },
};

export default async function PatientHubLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      {children}
      <HubPwa token={token} />
    </>
  );
}
