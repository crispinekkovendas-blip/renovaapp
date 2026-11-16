import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth";

/**
 * A porta do Guia clínico: só confere o perfil. O guia inteiro (receitas,
 * emergência e Drive) chega um nível abaixo, em `(conteudo)/layout.tsx` — e
 * entre os dois fica o `loading.tsx` desta pasta. Assim, ao clicar em "Guia
 * clínico" o esqueleto aparece na hora, enquanto o conteúdo (que é grande)
 * ainda está baixando; com o guia neste layout, a tela ficava parada até
 * tudo chegar.
 */
export default async function GuiaGate({ children }: { children: ReactNode }) {
  await requireRole("admin", "profissional");
  return <>{children}</>;
}
