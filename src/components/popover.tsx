"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { CloseButton } from "./close-button";

/**
 * Balão que abre de um botão (Revogar, Nova senha, Frases prontas).
 *
 * Continua sendo um `<details>` — abre sem JS e o `<summary>` é o botão —,
 * mas com o que se espera de um pop-up: fecha com clique fora, com Esc e
 * com o "×" do canto. O foco volta para o botão ao fechar pelo teclado.
 */
export function Popover({
  summary,
  summaryClassName,
  className = "",
  children,
}: {
  summary: ReactNode;
  summaryClassName: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    function onPointerDown(event: PointerEvent) {
      if (details!.open && !details!.contains(event.target as Node)) details!.open = false;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || !details!.open) return;
      details!.open = false;
      details!.querySelector("summary")?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <details ref={ref} className={className}>
      <summary className={`list-none [&::-webkit-details-marker]:hidden ${summaryClassName}`}>{summary}</summary>
      {children}
    </details>
  );
}

/** O "×" de dentro do balão: fecha o `<details>` mais próximo. */
export function PopoverClose({ className = "" }: { className?: string }) {
  return (
    <CloseButton
      size="sm"
      className={className}
      onClick={(event) => {
        const details = event.currentTarget.closest("details");
        if (!details) return;
        details.open = false;
        details.querySelector("summary")?.focus();
      }}
    />
  );
}
