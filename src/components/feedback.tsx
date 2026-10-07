"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { CloseButton } from "./close-button";

/**
 * A faixa de retorno depois de uma ação ("Salvo.", "Conflito de horário…").
 *
 * - Sempre tem o "×".
 * - Sucesso some sozinho depois de alguns segundos; erro e aviso ficam até
 *   alguém fechar — quem não leu a tempo não pode perder o motivo do erro.
 * - Ao fechar (ou sumir), tira `?ok=` / `?erro=` da URL sem recarregar: sem
 *   isso, atualizar a página ou voltar mostraria o mesmo aviso de novo.
 *
 * `role` faz o leitor de tela anunciar: sucesso educado, erro na hora.
 */

export type FeedbackTone = "ok" | "erro" | "aviso";

const TONE_CLASS: Record<FeedbackTone, string> = {
  ok: "border-pine-200 bg-pine-50 text-pine-800",
  erro: "border-rose-200 bg-rose-50 text-rose-700",
  aviso: "border-clay-200 bg-clay-50 text-clay-900",
};

/** Quanto o aviso de sucesso fica na tela. */
export const FEEDBACK_AUTO_HIDE_MS = 6000;

/** Parâmetros de retorno que as ações põem na URL e que o aviso limpa ao fechar. */
const FEEDBACK_PARAMS = ["ok", "erro", "n"];

export function Feedback({
  tone,
  children,
  className = "",
  autoHide,
  onClose,
}: {
  tone: FeedbackTone;
  children: ReactNode;
  className?: string;
  /** Padrão: só o sucesso some sozinho. */
  autoHide?: boolean;
  /** Para avisos que não vêm da URL (estado do cliente): quem chama esconde. */
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const hides = autoHide ?? tone === "ok";

  function close() {
    setOpen(false);
    if (onClose) {
      onClose();
      return;
    }
    // Lido na hora de fechar (e não com useSearchParams): funciona também em página estática.
    const { pathname, search, hash } = window.location;
    const params = new URLSearchParams(search);
    if (!FEEDBACK_PARAMS.some((key) => params.has(key))) return;
    for (const key of FEEDBACK_PARAMS) params.delete(key);
    const query = params.toString();
    router.replace(`${pathname}${query ? `?${query}` : ""}${hash}`, { scroll: false });
  }

  useEffect(() => {
    if (!hides || !open) return;
    const timer = window.setTimeout(close, FEEDBACK_AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
    // close lê a URL no momento em que roda; reagendar a cada render não ajudaria.
  }, [hides, open]);

  if (!open) return null;
  return (
    <div
      role={tone === "erro" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border py-1.5 pr-1.5 pl-4 text-sm font-semibold ${TONE_CLASS[tone]} ${className}`}
    >
      <div className="min-w-0 flex-1 py-1.5 sm:py-1.5">{children}</div>
      <CloseButton size="sm" label="Fechar aviso" onClick={close} className="-my-0.5" />
    </div>
  );
}
