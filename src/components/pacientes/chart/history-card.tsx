"use client";

import { useState } from "react";
import { saveClinicalHistoryAction } from "@/lib/actions";
import { HISTORY_SECTIONS, hasLine, toggleLine } from "@/lib/clinical-history";
import type { ClinicalHistory, HistoryKey } from "@/lib/clinical-history";
import { SectionTitle } from "@/components/ui";

/**
 * Antecedentes do paciente (história clínica): pessoais, cirúrgicos,
 * familiares, hábitos, gineco-obstétricos e vacinas. Lendo, só as seções
 * preenchidas; editando, cada seção tem atalhos para o que mais se escreve
 * ("HAS", "Ex-tabagista"…) — um toque põe a linha, outro tira.
 */
export function HistoryCard({
  patientId,
  history,
  showGyn,
}: {
  patientId: number;
  history: ClinicalHistory;
  /** Gineco-obstétricos só para quem não está cadastrado como sexo masculino. */
  showGyn: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClinicalHistory>(history);
  const sections = HISTORY_SECTIONS.filter((s) => showGyn || s.key !== "gineco" || history.gineco);
  const filled = sections.filter((s) => history[s.key]?.trim());

  const set = (key: HistoryKey, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  return (
    <section id="antecedentes" className="scroll-mt-20">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <SectionTitle>Antecedentes</SectionTitle>
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setDraft(history);
              setEditing(true);
            }}
            className="-my-2 min-h-11 rounded-full px-3 text-xs font-bold text-pine-600 hover:bg-pine-50 sm:my-0 sm:min-h-0 sm:py-1"
          >
            {filled.length ? "Editar" : "Preencher"}
          </button>
        ) : null}
      </div>

      {!editing ? (
        filled.length ? (
          <dl className="card divide-y divide-pine-900/5">
            {filled.map((s) => (
              <div key={s.key} className="px-4 py-3 sm:px-5">
                <dt className="text-[11px] font-bold text-pine-900/55">{s.label}</dt>
                <dd className="mt-0.5 whitespace-pre-line text-sm text-pine-950">{history[s.key]}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="card flex w-full flex-col items-start px-4 py-4 text-left hover:bg-pine-50/60 sm:px-5"
          >
            <span className="text-sm font-bold text-pine-950">Nenhum antecedente registrado</span>
            <span className="mt-0.5 text-xs text-pine-900/55">
              Doenças crônicas, cirurgias, família, hábitos e vacinas — com atalhos para o mais comum.
            </span>
          </button>
        )
      ) : (
        <form action={saveClinicalHistoryAction} className="card space-y-5 p-4 sm:p-5">
          <input type="hidden" name="patient_id" value={patientId} />
          {sections.map((s) => {
            const value = draft[s.key] ?? "";
            return (
              <div key={s.key}>
                <label className="label" htmlFor={`hist-${s.key}`}>
                  {s.label}
                </label>
                <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label={`Atalhos: ${s.label}`}>
                  {s.shortcuts.map((shortcut) => {
                    const on = hasLine(value, shortcut);
                    return (
                      <button
                        key={shortcut}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set(s.key, toggleLine(value, shortcut))}
                        className={`flex min-h-11 items-center rounded-full border px-2.5 text-[11.5px] font-semibold sm:min-h-7 ${
                          on
                            ? "border-pine-600 bg-pine-600 text-white"
                            : "border-pine-200 bg-white text-pine-700 hover:border-pine-400 hover:bg-pine-50"
                        }`}
                      >
                        {on ? "✓ " : ""}
                        {shortcut}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  className="input"
                  id={`hist-${s.key}`}
                  name={`hist_${s.key}`}
                  rows={Math.min(6, Math.max(2, value.split("\n").length + 1))}
                  placeholder={s.hint}
                  value={value}
                  onChange={(e) => set(s.key, e.target.value)}
                />
              </div>
            );
          })}
          <div className="mobile-action-bar flex gap-2">
            <button type="submit" className="btn btn-primary flex-1 sm:flex-none">
              Salvar antecedentes
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn btn-outline">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
