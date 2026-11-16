"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { Feedback } from "@/components/feedback";
import { undoFlashAction } from "@/lib/actions-undo";
import { FLASH_HOST_ID, flashFromParams, withoutFlash } from "@/lib/flash";
import type { FlashUndo } from "@/lib/flash";
import { FLASH_EVENT, showFlash } from "@/lib/flash-bus";
import type { FlashEvent } from "@/lib/flash-bus";

/**
 * O canto dos avisos do app: um só, fixo, igual em todas as telas. No celular
 * fica logo abaixo da barra do alto (embaixo estão as abas e o botão de
 * salvar); no computador, no alto à direita, abaixo da busca — um erro fica
 * na tela até ser fechado e não pode tapar a busca nesse meio-tempo.
 *
 * Chegam por três caminhos e saem com a mesma cara:
 * - a URL (`?ok=` / `?erro=` de um código geral — ver `lib/flash.ts`);
 * - as telas que têm texto próprio (`<Feedback floating>`, por portal);
 * - o navegador (`showFlash`, para o que não passa por redirect — excluir um anexo).
 */
export function FlashHost() {
  return (
    <div
      id={FLASH_HOST_ID}
      className="pointer-events-none fixed inset-x-0 top-[calc(4.25rem+env(safe-area-inset-top))] z-[70] flex flex-col items-center gap-2 px-4 md:items-end md:px-8 print:hidden"
    >
      {/* useSearchParams pede um limite de Suspense; o canto em si já existe antes, para os portais. */}
      <Suspense fallback={null}>
        <UrlFlashes />
      </Suspense>
      <EventFlashes />
    </div>
  );
}

function UrlFlashes() {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const [undoing, startUndo] = useTransition();

  const messages = flashFromParams({
    ok: search.get("ok"),
    erro: search.get("erro"),
    desfazer: search.get("desfazer"),
    valor: search.get("valor"),
  });
  if (messages.length === 0) return null;
  // Outra ação na mesma tela (pagar o segundo lançamento) muda a URL: o aviso recomeça.
  const key = `${pathname}?${search.toString()}`;

  function undo(target: FlashUndo) {
    startUndo(async () => {
      const error = await undoFlashAction(target.kind, target.id);
      const clean = withoutFlash(window.location.pathname, window.location.search, window.location.hash);
      if (clean) router.replace(clean, { scroll: false });
      router.refresh();
      showFlash(error ? { tone: "erro", text: error } : { tone: "ok", text: "Desfeito." });
    });
  }

  return messages.map((message) => (
    <Feedback
      key={`${key}|${message.text}`}
      tone={message.tone}
      variant="toast"
      action={
        message.undo
          ? { label: undoing ? "Desfazendo…" : "Desfazer", onClick: () => undo(message.undo as FlashUndo), disabled: undoing }
          : undefined
      }
    >
      {message.text}
    </Feedback>
  ));
}

function EventFlashes() {
  const [items, setItems] = useState<(FlashEvent & { id: number })[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    const onFlash = (event: Event) => {
      const detail = (event as CustomEvent<FlashEvent>).detail;
      if (!detail?.text) return;
      setItems((list) => [...list, { ...detail, id: nextId.current++ }]);
    };
    window.addEventListener(FLASH_EVENT, onFlash);
    return () => window.removeEventListener(FLASH_EVENT, onFlash);
  }, []);

  const remove = (id: number) => setItems((list) => list.filter((item) => item.id !== id));

  return items.map((item) => (
    <Feedback
      key={item.id}
      tone={item.tone}
      variant="toast"
      // Fechar no "×" ou deixar sumir é a mesma coisa: a ação não foi desfeita, então vale.
      onClose={() => {
        remove(item.id);
        item.onExpire?.();
      }}
      action={
        item.action
          ? {
              label: item.action.label,
              onClick: () => {
                remove(item.id);
                item.action?.run();
              },
            }
          : undefined
      }
    >
      {item.text}
    </Feedback>
  ));
}
