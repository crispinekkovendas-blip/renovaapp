"use client";

import { useEffect, useState } from "react";
import { stackStorageKeyPrefix } from "@/lib/composer-rail";

/**
 * Pedaços com JS da tela "Documentos emitidos": abrir o WhatsApp sozinho uma
 * vez (guardado em sessionStorage para um F5 não abrir de novo), copiar o
 * link do portal e esquecer a pilha que o compositor guardou. Sem JS a página
 * continua inteira — os botões de link bastam.
 */

/** A emissão deu certo: apaga toda pilha guardada deste paciente (qualquer atendimento). */
export function ClearEmitStacks({ patientId }: { patientId: number }) {
  useEffect(() => {
    try {
      const prefix = stackStorageKeyPrefix(patientId);
      const keys: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i += 1) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(prefix)) keys.push(key);
      }
      for (const key of keys) window.sessionStorage.removeItem(key);
    } catch {
      // Sem sessionStorage não havia pilha guardada.
    }
  }, [patientId]);
  return null;
}

export function AutoOpenWhatsApp({ href, storageKey }: { href: string; storageKey: string }) {
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Sem sessionStorage (janela privada, bloqueio): abre mesmo assim, uma vez por render.
    }
    // Bloqueador de pop-up pode segurar: o botão "Enviar pelo WhatsApp" continua na tela.
    window.open(href, "_blank", "noopener");
  }, [href, storageKey]);
  return null;
}

export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2500);
        } catch {
          window.prompt("Copie o link:", text);
        }
      }}
    >
      {copied ? done : label}
    </button>
  );
}
