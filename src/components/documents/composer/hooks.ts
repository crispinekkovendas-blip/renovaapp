"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { saveProtocolAction, savePrescriptionProtocolAction } from "@/lib/actions-documents";
import { appendItems, parseItems, serializeItems } from "@/lib/composer";
import type { ComposerItem } from "@/lib/composer";
import { serializeItems as serializePrescription } from "@/lib/prescription";
import type { PrescriptionItem } from "@/lib/prescription";
import type { ProtocolDraft } from "./composer-stack";

/**
 * A pilha, guardada no sessionStorage (chave por paciente + atendimento):
 * sobrevive a um F5, à volta da ficha e ao salvar do Perfil, cujo redirect
 * remonta o compositor. A tela "pronto" apaga a chave depois de emitir;
 * esvaziar a pilha também apaga.
 */
export function useStoredStack(
  storageKey: string,
  seedItems: ComposerItem[]
): [ComposerItem[], Dispatch<SetStateAction<ComposerItem[]>>] {
  const [items, setItems] = useState<ComposerItem[]>(seedItems);
  const [hydrated, setHydrated] = useState(false);

  // A pilha guardada entra depois da hidratação; as sementes da URL (?from, ?modelo) vêm depois dela.
  // Só entram as que ainda não estão lá (mesmo código): em StrictMode este efeito roda duas vezes.
  useEffect(() => {
    let saved: ComposerItem[] = [];
    try {
      saved = parseItems(window.sessionStorage.getItem(storageKey));
    } catch {
      // Sem sessionStorage (janela privada, bloqueio): a pilha vive só nesta página.
    }
    if (saved.length > 0) {
      setItems((current) => {
        const known = new Set(saved.map((item) => item.code));
        return appendItems(
          saved,
          current.filter((item) => !known.has(item.code))
        );
      });
    }
    setHydrated(true);
    // As sementes já viraram itens (e estão guardadas): tira ?from e ?modelo da URL
    // para um F5, ou a volta do Perfil, não acrescentá-las de novo.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("from") || url.searchParams.has("modelo")) {
        url.searchParams.delete("from");
        url.searchParams.delete("modelo");
        // Mantém o estado do roteador do Next: com `null`, o pop-up (rota interceptada) perde o caminho de volta.
        window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}`);
      }
    } catch {
      // URL estranha: fica como está.
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (items.length === 0) window.sessionStorage.removeItem(storageKey);
      else window.sessionStorage.setItem(storageKey, serializeItems(items));
    } catch {
      // Sem sessionStorage: nada a guardar.
    }
  }, [hydrated, items, storageKey]);

  return [items, setItems];
}

const PREVIEW_STORAGE_KEY = "renova:previa";

/**
 * A coluna da prévia (desktop) aberta ou oculta. A escolha fica por
 * navegador — é preferência de quem usa, não do documento. localStorage pode
 * estourar (janela anônima, site data bloqueado): a prévia simplesmente
 * começa aberta nesse caso.
 */
export function usePreviewPreference(): [boolean, Dispatch<SetStateAction<boolean>>] {
  const [previewOn, setPreviewOn] = useState(true);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
      if (saved !== null) setPreviewOn(saved === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(PREVIEW_STORAGE_KEY, previewOn ? "1" : "0");
    } catch {}
  }, [previewOn]);
  return [previewOn, setPreviewOn];
}

/** O rascunho que `/pacientes/[id]/emitir/previa` transforma em PDF (ver previa/route.ts). */
export interface PdfDraft {
  title: string;
  body: string;
  code: string;
  kind: string;
  professionalId: number;
  /** Só no receituário: a lista serializada. */
  medicamentos?: string;
}

/** "Ver o PDF real": o PDF de verdade do rascunho, numa aba nova, sem gravar nada. */
export function useRealPdf(patientId: number): { busy: boolean; open(draft: PdfDraft): Promise<void> } {
  const [busy, setBusy] = useState(false);
  const open = useCallback(
    async (draft: PdfDraft) => {
      setBusy(true);
      try {
        const res = await fetch(`/pacientes/${patientId}/emitir/previa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        if (!res.ok) return;
        const url = URL.createObjectURL(await res.blob());
        window.open(url, "_blank", "noopener");
        // O blob fica vivo o bastante para a aba abrir; depois se solta.
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } finally {
        setBusy(false);
      }
    },
    [patientId]
  );
  return { busy, open };
}

/**
 * Os dois "Salvar como protocolo": o da pilha (tipos, modelos e campos) e o
 * da lista do receituário. Um `useTransition` só, como sempre foi: enquanto
 * um salva, os dois botões mostram "Salvando…". O estado mora aqui (e não no
 * cartão) para sobreviver à troca de pílula e ao "Voltar" da revisão.
 */
export function useProtocolDrafts(items: ComposerItem[], rx: PrescriptionItem[]) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [clinic, setClinic] = useState(false);
  const [message, setMessage] = useState<ProtocolDraft["message"]>(null);

  const [rxName, setRxNameState] = useState("");
  const [rxMessage, setRxMessage] = useState<{ tone: "ok" | "erro"; text: string } | null>(null);

  const openForm = useCallback(() => {
    setMessage(null);
    setOpen(true);
    if (typeof document !== "undefined") {
      document.getElementById("emit-stack")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);
  const closeForm = useCallback(() => setOpen(false), []);
  const clearMessage = useCallback(() => setMessage(null), []);

  function save() {
    const trimmed = name.trim();
    if (!trimmed || items.length === 0) {
      setMessage({ tone: "erro", text: "Dê um nome ao protocolo e inclua pelo menos um documento." });
      return;
    }
    const formData = new FormData();
    formData.set("name", trimmed);
    formData.set("items", serializeItems(items));
    if (clinic) formData.set("scope", "clinica");
    startSaving(async () => {
      const result = await saveProtocolAction(formData);
      if ("error" in result) {
        setMessage({
          tone: "erro",
          text:
            result.error === "migracao"
              ? "Protocolos dependem da migração 2026-09-16. Rode a migração no Supabase e tente de novo."
              : result.error === "permissao"
                ? "Só um profissional (ou o administrador) pode salvar protocolos."
                : "Dê um nome ao protocolo e inclua pelo menos um documento.",
        });
        return;
      }
      setMessage({ tone: "ok", text: `Protocolo “${trimmed}” salvo. Ele já aparece entre os modelos.` });
      setOpen(false);
      setName("");
      router.refresh();
    });
  }

  function setRxName(value: string) {
    setRxNameState(value);
    setRxMessage(null);
  }

  function saveRx() {
    const trimmed = rxName.trim();
    if (!trimmed || rx.length === 0) return;
    const form = new FormData();
    form.set("name", trimmed);
    form.set("items", serializePrescription(rx));
    startSaving(async () => {
      const result = await savePrescriptionProtocolAction(form);
      if ("error" in result) {
        setRxMessage({
          tone: "erro",
          text:
            result.error === "migracao"
              ? "Rode a migração de modelos."
              : result.error === "permissao"
                ? "Só um profissional (ou o administrador) pode salvar protocolos."
                : "Dê um nome ao protocolo.",
        });
        return;
      }
      setRxMessage({ tone: "ok", text: `Protocolo “${trimmed}” salvo.` });
      setRxNameState("");
      router.refresh();
    });
  }

  const draft: ProtocolDraft = { open, name, clinic, message, saving };
  return {
    draft,
    saving,
    openForm,
    closeForm,
    clearMessage,
    setName,
    setClinic,
    save,
    rxName,
    rxMessage,
    clearRxMessage: () => setRxMessage(null),
    setRxName,
    saveRx,
  };
}
