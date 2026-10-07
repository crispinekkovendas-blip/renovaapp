"use client";

import { useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Attachment } from "@/lib/db";
import { ALLOWED_MIME_TYPES, MAX_ATTACHMENT_BYTES, fmtBytes, validateAttachment } from "@/lib/attachments";
import { fmtDate } from "@/lib/format";
import { Alert } from "@/components/alert";

type EncounterRef = { id: number; date: string };

type Props = {
  patientId: number;
  encounters: EncounterRef[];
  attachments: Attachment[];
};

const ACCEPT = ALLOWED_MIME_TYPES.join(",");

function byDateDesc(a: EncounterRef, b: EncounterRef): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return b.id - a.id;
}

export function AttachmentsPanel({ patientId, encounters, attachments }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [refreshing, startRefresh] = useTransition();

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

  async function handleDelete(id: number) {
    if (!window.confirm("Excluir este anexo? Esta ação não pode ser desfeita.")) return;
    setError(null);
    setDeletingId(id);
    try {
      const response = await fetch(`/api/anexos/${id}`, { method: "DELETE" });
      // 404 = já foi excluído em outra aba; a lista atualizada resolve.
      if (!response.ok && response.status !== 404) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? `Falha ao excluir (${response.status}).`);
        return;
      }
      startRefresh(() => router.refresh());
    } catch {
      setError("Não foi possível excluir. Verifique a conexão e tente de novo.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {attachments.length === 0 ? (
        <p className="card px-5 py-4 text-sm text-pine-900/55">
          Nenhum anexo ainda. Envie resultados de exames, fotos ou PDFs para guardá-los no prontuário.
        </p>
      ) : (
        <div className="card divide-y divide-pine-900/5">
          {attachments.map((attachment) => {
            const tiedDate =
              attachment.encounter_id !== null ? encounterDate.get(attachment.encounter_id) : undefined;
            const isDeleting = deletingId === attachment.id;
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
                  disabled={isDeleting || refreshing}
                >
                  {isDeleting ? "Excluindo…" : "Excluir"}
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
