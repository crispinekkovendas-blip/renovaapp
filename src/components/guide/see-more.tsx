"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { CloseButton } from "@/components/close-button";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * "Ver mais": um botão discreto que abre um pop-up — folha que sobe de baixo
 * no celular, cartão centralizado do sm em diante. É onde o guia guarda o
 * histórico das revisões, para a tela mostrar só o conteúdo clínico. O
 * conteúdo pode vir pronto do servidor (children) e só é montado ao abrir.
 * Fecha pelo ×, pelo Esc e por um clique fora; o foco volta para o botão.
 */
export function SeeMore({
  label,
  title,
  subtitle,
  className = "",
  children,
}: {
  label: ReactNode;
  title: string;
  subtitle?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      {open ? (
        <SeeMoreDialog
          title={title}
          subtitle={subtitle}
          onClose={() => {
            setOpen(false);
            triggerRef.current?.focus();
          }}
        >
          {children}
        </SeeMoreDialog>
      ) : null}
    </>
  );
}

function SeeMoreDialog({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  onClose(): void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      // Prende o Tab dentro do pop-up.
      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // No <body>: dentro de cartões e barras com blur, um "fixed" ficaria preso a eles.
  return createPortal(
    <div
      className="sheet-backdrop fixed inset-0 z-50 flex items-end justify-center bg-pine-950/40 backdrop-blur-sm sm:items-start sm:px-4 sm:py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="card sheet-panel sheet-center flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden rounded-b-none outline-none sm:max-h-[calc(100dvh-5rem)] sm:rounded-b-[18px]"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-[#e2dcec] sm:hidden" aria-hidden />
        <div className="flex shrink-0 items-start gap-2 border-b border-pine-900/8 px-4 pt-2 pb-3 sm:px-6 sm:pt-5">
          <div className="min-w-0 flex-1 pt-1.5 sm:pt-0">
            <h2 id={titleId} className="text-[17px] leading-snug font-extrabold break-words text-pine-950">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-[12.5px] text-pine-900/55">{subtitle}</p> : null}
          </div>
          <CloseButton onClick={() => onCloseRef.current()} className="-mr-2 sm:-mt-1" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-[13px] leading-snug text-pine-900/80 sm:px-6 sm:pb-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
