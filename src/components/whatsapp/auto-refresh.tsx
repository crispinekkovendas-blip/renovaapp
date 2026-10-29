"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Atualiza a página a cada `seconds` enquanto a aba está visível — as
 * mensagens do paciente chegam pelo webhook, sem ninguém clicar.
 */
export function AutoRefresh({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      // Não atualiza no meio de uma digitação: o rascunho do campo ficaria.
      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement && active.value) return;
      router.refresh();
    }, seconds * 1000);
    return () => window.clearInterval(id);
  }, [router, seconds]);
  return null;
}
