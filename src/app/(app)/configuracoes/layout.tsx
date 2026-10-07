import { requireRole } from "@/lib/auth";

/**
 * Cobre /configuracoes e as subpáginas. O profissional passa porque Modelos
 * também é dele (os próprios modelos e protocolos); as páginas que são só do
 * admin (a principal, api, horarios) checam o perfil de novo por conta própria.
 * A recepção fica de fora de tudo.
 */
export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin", "profissional");
  return <>{children}</>;
}
