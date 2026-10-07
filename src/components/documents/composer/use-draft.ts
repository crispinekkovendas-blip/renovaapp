"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraftAction } from "@/lib/actions-drafts";
import { draftIsEmpty, serializeDraft } from "@/lib/drafts";
import type { DraftState } from "@/lib/drafts";
import { removeLocalDraft, saveLocalDraft } from "@/lib/local-drafts";

/**
 * O rascunho do compositor aberto: guarda sozinho alguns segundos depois de
 * cada mudança e, de novo, ao fechar (`flush`). Vai para o banco; sem a
 * migração (ou se o banco falhar) vai para o navegador — nunca se perde o que
 * foi montado por causa disso.
 *
 * Os salvamentos passam por uma fila: fechar logo depois de um autosave não
 * cria duas linhas do mesmo rascunho.
 */

export type DraftStatus =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string; where: "banco" | "navegador" }
  | { kind: "error" };

const AUTOSAVE_MS = 6000;

function clock(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function useDraft({
  patientId,
  initialId,
  state,
}: {
  patientId: number;
  initialId: string | null;
  /** O que está montado agora (pilha, receituário, editor). */
  state: DraftState;
}): { draftId: string | null; status: DraftStatus; flush(): Promise<void> } {
  const [draftId, setDraftId] = useState<string | null>(initialId);
  const [status, setStatus] = useState<DraftStatus>({ kind: "idle" });
  const idRef = useRef<string | null>(initialId);
  const stateRef = useRef(state);
  stateRef.current = state;
  const json = serializeDraft(state);
  // O que já está guardado: o estado de abertura conta como salvo (abrir e fechar não grava nada).
  const savedRef = useRef(json);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const setId = useCallback((id: string | null) => {
    idRef.current = id;
    setDraftId(id);
  }, []);

  const saveNow = useCallback(async () => {
    const current = stateRef.current;
    const currentJson = serializeDraft(current);
    if (currentJson === savedRef.current) return;
    const id = idRef.current;

    if (draftIsEmpty(current)) {
      // Esvaziou: o rascunho some da lista.
      if (id?.startsWith("local-")) removeLocalDraft(patientId, id);
      else if (id) await saveDraftAction(patientId, Number(id), currentJson).catch(() => undefined);
      setId(null);
      savedRef.current = currentJson;
      setStatus({ kind: "idle" });
      return;
    }

    setStatus({ kind: "saving" });
    if (!id?.startsWith("local-")) {
      try {
        const result = await saveDraftAction(patientId, id ? Number(id) : null, currentJson);
        if ("id" in result) {
          setId(String(result.id));
          savedRef.current = currentJson;
          setStatus({ kind: "saved", at: clock(), where: "banco" });
          return;
        }
      } catch {
        // Rede ou servidor: cai para o navegador logo abaixo.
      }
    }
    setId(saveLocalDraft(patientId, id?.startsWith("local-") ? id : null, current));
    savedRef.current = currentJson;
    setStatus({ kind: "saved", at: clock(), where: "navegador" });
  }, [patientId, setId]);

  const flush = useCallback(() => {
    queue.current = queue.current.then(saveNow, saveNow);
    return queue.current;
  }, [saveNow]);

  // Autosave: alguns segundos depois da última mudança.
  useEffect(() => {
    if (json === savedRef.current) return;
    const timer = setTimeout(() => void flush(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [json, flush]);

  return { draftId, status, flush };
}
