"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <>
      <button
        type="button"
        className="btn btn-outline px-3 py-1.5 text-xs"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // clipboard indisponível — o usuário ainda pode selecionar o texto
          }
        }}
      >
        {copied ? "Copiado!" : "Copiar"}
      </button>
      {/* Trocar o texto do botão não é anunciado; a região viva avisa o leitor de tela. */}
      <span className="sr-only" aria-live="polite">
        {copied ? "Chave copiada." : ""}
      </span>
    </>
  );
}
