"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteDraftAction } from "@/lib/actions-drafts";
import { draftWhen } from "@/lib/drafts";
import type { DraftSummary } from "@/lib/drafts";
import { listLocalDrafts, removeLocalDraft } from "@/lib/local-drafts";

/**
 * Os rascunhos do compositor: o que o médico montou e fechou sem emitir. Do
 * banco (vêm da página) e, sem a migração, do navegador — lidos aqui, depois
 * da hidratação. "Continuar" reabre o pop-up exatamente como ficou;
 * "Excluir" pede confirmação na própria linha.
 */

function useAllDrafts(patientId: number, server: DraftSummary[]): [DraftSummary[], (id: string) => void] {
  const [local, setLocal] = useState<DraftSummary[]>([]);
  useEffect(() => setLocal(listLocalDrafts(patientId)), [patientId]);
  const all = [...server, ...local].sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  const dropLocal = (id: string) => {
    removeLocalDraft(patientId, id);
    setLocal(listLocalDrafts(patientId));
  };
  return [all, dropLocal];
}

function continueHref(patientId: number, id: string) {
  return `/pacientes/${patientId}/emitir?rascunho=${encodeURIComponent(id)}`;
}

function IconDraft() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

/** A lista completa, na aba Documentos. */
export function DraftsPanel({
  patientId,
  drafts,
  today,
  canEdit,
}: {
  patientId: number;
  drafts: DraftSummary[];
  /** YYYY-MM-DD (São Paulo), para "hoje"/"ontem". */
  today: string;
  canEdit: boolean;
}) {
  const [all, dropLocal] = useAllDrafts(patientId, drafts);
  const [confirming, setConfirming] = useState<string | null>(null);
  if (all.length === 0) return null;

  return (
    <section className="mb-7" aria-labelledby="rascunhos-titulo">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="rascunhos-titulo" className="font-display text-lg font-extrabold text-pine-950">
          Rascunhos
        </h2>
        <span className="text-xs font-bold text-pine-900/45">
          {all.length} {all.length === 1 ? "em aberto" : "em aberto"}
        </span>
      </div>
      <ul className="card divide-y divide-pine-900/5">
        {all.map((draft) => {
          const local = draft.id.startsWith("local-");
          return (
            <li key={draft.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-peach-100 text-pine-800"
                aria-hidden
              >
                <IconDraft />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-bold text-pine-950">{draft.title}</p>
                <p className="text-xs text-pine-900/55">
                  Salvo {draftWhen(draft.updated_at, today)}
                  {draft.author ? ` · ${draft.author}` : ""}
                  {local ? " · neste navegador" : ""}
                </p>
              </div>
              {confirming === draft.id ? (
                <div className="flex w-full items-center justify-end gap-2 sm:w-auto" role="group" aria-label="Confirmar exclusão">
                  <span className="mr-auto text-xs font-semibold text-rose-700 sm:mr-1">Excluir este rascunho?</span>
                  <button type="button" onClick={() => setConfirming(null)} className="btn btn-ghost px-3 py-1.5 text-xs">
                    Cancelar
                  </button>
                  {local ? (
                    <button
                      type="button"
                      onClick={() => {
                        dropLocal(draft.id);
                        setConfirming(null);
                      }}
                      className="btn px-3 py-1.5 text-xs bg-rose-600 text-white hover:bg-rose-700"
                    >
                      Excluir
                    </button>
                  ) : (
                    <form action={deleteDraftAction}>
                      <input type="hidden" name="patient_id" value={patientId} />
                      <input type="hidden" name="draft_id" value={draft.id} />
                      <button type="submit" className="btn px-3 py-1.5 text-xs bg-rose-600 text-white hover:bg-rose-700">
                        Excluir
                      </button>
                    </form>
                  )}
                </div>
              ) : canEdit ? (
                <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setConfirming(draft.id)}
                    className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-bold text-pine-900/55 hover:bg-rose-50 hover:text-rose-700 sm:min-h-0 sm:py-1.5"
                  >
                    Excluir
                  </button>
                  <Link href={continueHref(patientId, draft.id)} className="btn btn-primary px-4 py-1.5 text-xs">
                    Continuar
                  </Link>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Uma linha só, no Resumo: quantos rascunhos e "Continuar" o mais recente. */
export function DraftsSummaryRow({
  patientId,
  drafts,
  today,
  canEdit,
  documentsHref,
}: {
  patientId: number;
  drafts: DraftSummary[];
  today: string;
  canEdit: boolean;
  documentsHref: string;
}) {
  const [all] = useAllDrafts(patientId, drafts);
  if (all.length === 0) return null;
  const latest = all[0];
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-peach-100 text-pine-800" aria-hidden>
        <IconDraft />
      </span>
      <Link href={documentsHref} className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-pine-900/55">
          {all.length === 1 ? "1 rascunho" : `${all.length} rascunhos`} em aberto
        </p>
        <p className="truncate text-[14px] font-bold text-pine-950">
          {latest.title} <span className="font-medium text-pine-900/50">· {draftWhen(latest.updated_at, today)}</span>
        </p>
      </Link>
      {canEdit ? (
        <Link href={continueHref(patientId, latest.id)} className="btn btn-primary shrink-0 px-4 py-1.5 text-xs">
          Continuar
        </Link>
      ) : null}
    </div>
  );
}
