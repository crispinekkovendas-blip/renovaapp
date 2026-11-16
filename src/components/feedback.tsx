"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { FLASH_HIDE_MS, FLASH_HOST_ID, FLASH_UNDO_MS, withoutFlash } from "@/lib/flash";
import { CloseButton } from "./close-button";

/**
 * O retorno depois de uma ação ("Salvo.", "Conflito de horário…").
 *
 * Dois jeitos de aparecer:
 * - **faixa** (padrão): no lugar onde foi posta, dentro do fluxo — para o
 *   site público, o portal e os avisos que ficam ao lado de um controle.
 * - **aviso flutuante** (`floating`): no canto fixo do app, o mesmo em todas
 *   as telas. Quem o põe é a tela (o texto é dela); quem o mostra é o
 *   `FlashHost` do layout, para onde ele vai por portal. Fora do app (sem o
 *   host), cai na faixa.
 *
 * Nos dois:
 * - Sempre tem o "×".
 * - Sucesso some sozinho depois de alguns segundos; erro e aviso ficam até
 *   alguém fechar — quem não leu a tempo não pode perder o motivo do erro.
 * - Ao fechar (ou sumir), tira `?ok=` / `?erro=` da URL sem recarregar: sem
 *   isso, atualizar a página ou voltar mostraria o mesmo aviso de novo.
 *
 * `role` faz o leitor de tela anunciar: sucesso educado, erro na hora.
 */

export type FeedbackTone = "ok" | "erro" | "aviso";

const BAND_TONE: Record<FeedbackTone, string> = {
  ok: "border-pine-200 bg-pine-50 text-pine-800",
  erro: "border-rose-200 bg-rose-50 text-rose-700",
  aviso: "border-clay-200 bg-clay-50 text-clay-900",
};

// O flutuante é um cartão do app com um fio da cor do tom: lê-se igual no claro, no escuro e no Marte.
const TOAST_TONE: Record<FeedbackTone, string> = {
  ok: "border-l-pine-600",
  erro: "border-l-rose-600",
  aviso: "border-l-clay-500",
};

/** Quanto o aviso de sucesso fica na tela. */
export const FEEDBACK_AUTO_HIDE_MS = FLASH_HIDE_MS;

export interface FeedbackAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function Feedback({
  tone,
  children,
  className = "",
  autoHide,
  onClose,
  floating = false,
  variant,
  action,
}: {
  tone: FeedbackTone;
  children: ReactNode;
  className?: string;
  /** Padrão: só o sucesso some sozinho. */
  autoHide?: boolean;
  /** Para avisos que não vêm da URL (estado do cliente): quem chama esconde. */
  onClose?: () => void;
  /** Mostra no canto fixo do app (por portal), em vez de no lugar. */
  floating?: boolean;
  /** Só o desenho, sem portal — é o que o próprio `FlashHost` usa. */
  variant?: "band" | "toast";
  /** Um botão dentro do aviso ("Desfazer"). */
  action?: FeedbackAction;
}) {
  const [open, setOpen] = useState(true);
  const [host, setHost] = useState<Element | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const hides = autoHide ?? tone === "ok";

  useEffect(() => {
    setMounted(true);
    if (floating) setHost(document.getElementById(FLASH_HOST_ID));
  }, [floating]);

  function close() {
    setOpen(false);
    if (onClose) {
      onClose();
      return;
    }
    // Lido na hora de fechar (e não com useSearchParams): funciona também em página estática.
    const { pathname, search, hash } = window.location;
    const clean = withoutFlash(pathname, search, hash);
    if (clean) router.replace(clean, { scroll: false });
  }

  useEffect(() => {
    if (!hides || !open) return;
    const timer = window.setTimeout(close, action ? FLASH_UNDO_MS : FLASH_HIDE_MS);
    return () => window.clearTimeout(timer);
    // close lê a URL no momento em que roda; reagendar a cada render não ajudaria.
  }, [hides, open]);

  if (!open) return null;
  // O flutuante só existe no navegador: antes de montar não há onde pendurá-lo.
  if (floating && !mounted) return null;

  const toast = variant === "toast" || (floating && host !== null);
  const body = toast ? (
    <div
      role={tone === "erro" ? "alert" : "status"}
      className={`toast-in pointer-events-auto flex w-full max-w-md items-center gap-1.5 rounded-2xl border border-l-4 border-[var(--color-line)] bg-white py-1.5 pr-1.5 pl-4 text-sm font-semibold text-ink shadow-[0_16px_40px_-16px_rgba(18,26,38,0.5)] mars:rounded-[3px] print:hidden ${TOAST_TONE[tone]}`}
    >
      <div className="min-w-0 flex-1 py-1.5">{children}</div>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          disabled={action.disabled}
          className="inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-full px-3 text-sm font-extrabold text-pine-700 underline-offset-2 hover:underline disabled:opacity-50 pointer-coarse:min-h-11"
        >
          {action.label}
        </button>
      ) : null}
      <CloseButton size="sm" label="Fechar aviso" onClick={close} />
    </div>
  ) : (
    <div
      role={tone === "erro" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border py-1.5 pr-1.5 pl-4 text-sm font-semibold ${BAND_TONE[tone]} ${className}`}
    >
      <div className="min-w-0 flex-1 py-1.5 sm:py-1.5">{children}</div>
      <CloseButton size="sm" label="Fechar aviso" onClick={close} className="-my-0.5" />
    </div>
  );

  return floating && host ? createPortal(body, host) : body;
}
