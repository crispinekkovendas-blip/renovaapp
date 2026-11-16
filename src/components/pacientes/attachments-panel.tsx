"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Attachment } from "@/lib/db";
import { ALLOWED_MIME_TYPES, MAX_ATTACHMENT_BYTES, fmtBytes, validateAttachment } from "@/lib/attachments";
import { fmtDate } from "@/lib/format";
import { Alert } from "@/components/alert";
import { showFlash } from "@/lib/flash-bus";

type EncounterRef = { id: number; date: string };

type Props = {
  patientId: number;
  encounters: EncounterRef[];
  attachments: Attachment[];
};

const ACCEPT = ALLOWED_MIME_TYPES.join(",");

/**
 * Exclusões à espera do "Desfazer": o anexo some da lista na hora, mas só sai
 * do banco quando o aviso some (ou a pessoa fecha a aba). Fica fora do
 * componente porque o aviso vive no layout e sobrevive à troca de tela.
 */
const pendingDeletes = new Map<number, () => void>();
let leaveHooked = false;

function flushPendingDeletes(): void {
  for (const commit of [...pendingDeletes.values()]) commit();
}

function byDateDesc(a: EncounterRef, b: EncounterRef): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return b.id - a.id;
}

export function AttachmentsPanel({ patientId, encounters, attachments }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  // Some da lista o que está à espera do "Desfazer" (inclusive ao voltar para esta tela no meio da espera).
  const [hidden, setHidden] = useState<ReadonlySet<number>>(() => new Set(pendingDeletes.keys()));
  const [refreshing, startRefresh] = useTransition();
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const sortedEncounters = [...encounters].sort(byDateDesc);
  const encounterDate = new Map(encounters.map((e) => [e.id, e.date]));
  const busy = sending || refreshing;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = formRef.current;
    if (!form) return;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];
    if (!file) {
      setError("Selecione um arquivo.");
      return;
    }
    // Mesma regra do servidor — poupa um upload de 10 MB que voltaria com 400.
    const localError = validateAttachment({ name: file.name, type: file.type, size: file.size });
    if (localError) {
      setError(localError);
      return;
    }

    setError(null);
    setSending(true);
    try {
      const response = await fetch("/api/anexos", { method: "POST", body: new FormData(form) });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? `Falha ao enviar (${response.status}).`);
        return;
      }
      form.reset();
      startRefresh(() => router.refresh());
    } catch {
      setError("Não foi possível enviar. Verifique a conexão e tente de novo.");
    } finally {
      setSending(false);
    }
  }

  const show = (id: number) =>
    setHidden((set) => {
      const next = new Set(set);
      next.delete(id);
      return next;
    });

  /**
   * Sem pergunta antes: o anexo some e o aviso oferece "Desfazer". A exclusão de
   * verdade (que não tem volta — o arquivo sai do banco) só acontece quando o
   * aviso some sem o botão ter sido usado.
   */
  function handleDelete(id: number) {
    setError(null);
    setHidden((set) => new Set(set).add(id));

    const commit = () => {
      if (!pendingDeletes.delete(id)) return; // já saiu, ou foi desfeito
      // keepalive: se a pessoa fechar a aba com o aviso na tela, o pedido ainda sai.
      fetch(`/api/anexos/${id}`, { method: "DELETE", keepalive: true })
        .then(async (response) => {
          // 404 = já foi excluído em outra aba; a lista atualizada resolve.
          if (!response.ok && response.status !== 404) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(payload?.error ?? `Falha ao excluir (${response.status}).`);
          }
          if (alive.current) startRefresh(() => router.refresh());
          else router.refresh();
        })
        .catch((cause: unknown) => {
          if (!alive.current) return;
          show(id);
          setError(
            cause instanceof Error && cause.message.startsWith("Falha")
              ? cause.message
              : "Não foi possível excluir. Verifique a conexão e tente de novo.",
          );
        });
    };

    pendingDeletes.set(id, commit);
    if (!leaveHooked) {
      leaveHooked = true;
      window.addEventListener("pagehide", flushPendingDeletes);
    }
    showFlash({
      tone: "ok",
      text: "Anexo excluído.",
      action: {
        label: "Desfazer",
        run: () => {
          pendingDeletes.delete(id);
          if (alive.current) show(id);
        },
      },
      onExpire: commit,
    });
  }

  const visible = attachments.filter((attachment) => !hidden.has(attachment.id));

  return (
    <div className="space-y-3">
      {visible.length === 0 ? (
        <p className="card px-5 py-4 text-sm text-pine-900/55">
          Nenhum anexo ainda. Envie resultados de exames, fotos ou PDFs para guardá-los no prontuário.
        </p>
      ) : (
        <div className="card divide-y divide-pine-900/5">
          {visible.map((attachment) => {
            const tiedDate =
              attachment.encounter_id !== null ? encounterDate.get(attachment.encounter_id) : undefined;
            return (
              <div key={attachment.id} className="flex items-center justify-between gap-3 px-4 py-3">
                {/* O link cobre nome e detalhes: um alvo de toque inteiro, não só a linha do nome. */}
                <a
                  href={`/api/anexos/${attachment.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block min-w-0 flex-1 py-0.5"
                  title={attachment.file_name}
                >
                  <span className="block truncate text-sm font-bold text-pine-700 group-hover:underline">
                    {attachment.file_name}
                  </span>
                  <span className="block text-xs text-pine-900/55">
                    {fmtBytes(attachment.size_bytes)} · {fmtDate(attachment.created_at.slice(0, 10))}
                    {tiedDate ? ` · Atendimento de ${fmtDate(tiedDate)}` : ""}
                  </span>
                </a>
                <button
                  type="button"
                  className="btn btn-ghost shrink-0 px-3 py-1 text-xs text-rose-600"
                  onClick={() => handleDelete(attachment.id)}
                  aria-label={`Excluir ${attachment.file_name}`}
                  disabled={refreshing}
                >
                  Excluir
                </button>
              </div>
            );
          })}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="card space-y-3 p-4" aria-busy={busy}>
        <input type="hidden" name="patient_id" value={patientId} />
        <div>
          <label className="label" htmlFor="anexo-file">
            Arquivo
          </label>
          <input
            className="input sm:text-sm"
            type="file"
            id="anexo-file"
            name="file"
            aria-describedby="anexo-file-hint"
            accept={ACCEPT}
            required
            disabled={busy}
          />
          <p id="anexo-file-hint" className="mt-1 text-xs text-pine-900/50">
            PDF, JPEG, PNG ou WebP · até {fmtBytes(MAX_ATTACHMENT_BYTES)}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="anexo-encounter">
            Atendimento
          </label>
          <select className="input" id="anexo-encounter" name="encounter_id" defaultValue="" disabled={busy}>
            <option value="">Sem vínculo</option>
            {sortedEncounters.map((encounter) => (
              <option key={encounter.id} value={encounter.id}>
                {fmtDate(encounter.date)}
              </option>
            ))}
          </select>
        </div>
        {error ? <Alert>{error}</Alert> : null}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>
          {sending ? "Enviando…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
