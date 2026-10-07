import type { ReactNode } from "react";
import { Feedback } from "@/components/feedback";

/**
 * Faixa de retorno das telas de gestão (financeiro, configurações, conta)
 * depois de um redirect com `?ok=` / `?erro=`. É o `Feedback` do app: tem o
 * "×", o sucesso some sozinho e fechar limpa a URL.
 */
export function Flash({ tone, children }: { tone: "ok" | "erro"; children: ReactNode }) {
  return (
    <Feedback tone={tone} className="mb-4">
      {children}
    </Feedback>
  );
}
