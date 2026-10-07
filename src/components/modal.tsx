"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { CloseButton } from "./close-button";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ children }: { children: ReactNode }) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const focusables = useCallback((): HTMLElement[] => {
    const panel = panelRef.current;
    if (!panel) return [];
    return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }, []);

  // Rotula o diálogo a partir do próprio título do conteúdo, para nenhum
  // formulário precisar saber que está dentro de um modal.
  useEffect(() => {
    const heading = panelRef.current?.querySelector("h1, h2, h3");
    if (heading && !heading.id) heading.id = titleId;
  }, [titleId]);

  // Foco entra no diálogo ao abrir e volta para o disparador ao fechar — sem
  // isso o teclado continua navegando a página de trás.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const first = focusables()[0] ?? panelRef.current;
    first?.focus();

    return () => {
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [focusables]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        router.back();
        return;
      }
      if (event.key !== "Tab") return;

      // Prende o Tab dentro do diálogo.
      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === lastItem) {
        event.preventDefault();
        firstItem.focus();
      } else if (event.shiftKey && (active === firstItem || active === panelRef.current)) {
        event.preventDefault();
        lastItem.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router, focusables]);

  return (
    // No celular é uma folha que sobe de baixo, colada nas bordas; do sm em
    // diante, o cartão centralizado de sempre.
    // Fecha com clique em qualquer ponto fora do painel: o próprio contêiner é o
    // fundo (uma camada absoluta só cobria a primeira tela quando a página rolava).
    <div
      className="sheet-backdrop fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-pine-950/40 backdrop-blur-sm sm:items-start sm:px-4 sm:py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) router.back();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="card sheet-panel sheet-center relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-b-none px-4 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] outline-none sm:max-h-none sm:overflow-visible sm:rounded-b-[18px] sm:p-6"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#e2dcec] sm:hidden" aria-hidden />
        {children}
        {/* Depois do conteúdo no DOM: o foco abre no primeiro campo, e o "×" é o último do Tab. */}
        <CloseButton onClick={() => router.back()} className="absolute top-2 right-2 z-10 sm:top-3 sm:right-3" />
      </div>
    </div>
  );
}
