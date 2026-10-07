"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * O pop-up do compositor: uma folha grande por cima da ficha do paciente,
 * para ficar claro onde a tarefa começa e onde termina. Fecha pelo "×" do
 * cabeçalho, pelo Esc e por um clique fora — quem fecha é `onClose`, que no
 * compositor guarda o rascunho antes.
 *
 * Esc só fecha a folha quando nenhum balão está aberto por cima (lista de
 * posologia, gaveta de Modelos, tela cheia da prévia): esses fecham primeiro.
 */

const OPEN_LAYERS = "details[open], [role=listbox], section[role=dialog], [aria-modal=true][aria-label='Prévia em tela cheia']";

export function ComposerSheet({
  onClose,
  label,
  children,
}: {
  onClose(): void;
  label: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (panelRef.current?.querySelector(OPEN_LAYERS) || document.querySelector("[aria-label='Prévia em tela cheia']")) return;
      onCloseRef.current();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, []);

  return (
    <div
      className="sheet-backdrop fixed inset-0 z-50 bg-pine-950/45 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCloseRef.current();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        data-composer-sheet
        className="sheet-panel absolute inset-x-0 top-2 bottom-0 overflow-y-auto overscroll-contain rounded-t-[22px] bg-paper px-4 pt-4 shadow-[0_-12px_48px_-12px_rgba(40,20,70,0.35)] outline-none sm:inset-x-3 sm:top-3 sm:bottom-3 sm:rounded-[22px] sm:px-6 lg:inset-x-6 lg:top-4 lg:bottom-4 lg:px-8"
      >
        {children}
      </div>
    </div>
  );
}

/** A mesma folha para telas do servidor (o "pronto" depois de emitir): fechar leva a `closeHref`. */
export function RouteSheet({ closeHref, label, children }: { closeHref: string; label: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <ComposerSheet onClose={() => router.replace(closeHref)} label={label}>
      <div className="pb-6">{children}</div>
    </ComposerSheet>
  );
}
