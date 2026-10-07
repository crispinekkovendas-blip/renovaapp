"use client";

import { useState } from "react";
import type { Dispatch, DragEvent } from "react";
import Link from "next/link";
import { DOCUMENT_KIND_LABEL } from "@/lib/documents";
import type { FieldDef } from "@/lib/documents";
import { MAX_COMPOSER_ITEMS } from "@/lib/composer";
import type { ComposerTemplate } from "@/lib/composer";
import type { ComposerAction, EditorState } from "@/lib/composer-editor";
import { EXAM_PANELS, renderPanel } from "@/lib/exam-panels";
import { IconPlus } from "@/components/icons";
import { DocumentFields } from "../document-fields";
import { TEMPLATE_DRAG_TYPE } from "./type-picker";
import { LimitNote, QUICK_CHIP } from "./ui";

export interface TextEditorCardProps {
  editor: EditorState;
  dispatch: Dispatch<ComposerAction>;
  /** Título do modelo resolvido (vazio = o rótulo do tipo). */
  templateTitle: string;
  /** Nome do modelo carregado, ou "Padrão". */
  modelName: string;
  kindTemplates: ReadonlyArray<ComposerTemplate>;
  fieldDefs: ReadonlyArray<FieldDef>;
  /** O que está na tela: o manual ou o do modelo com os campos. */
  title: string;
  body: string;
  full: boolean;
  canManageTemplates: boolean;
  patientSex: string | null;
  onInclude(): void;
  /** "Limpar" / "Cancelar" da edição: volta o editor ao zero no mesmo tipo e modelo. */
  onReset(): void;
  /** Um modelo solto sobre o editor (o clique no chip continua valendo). */
  onDropTemplate(templateId: number): void;
}

/** O editor de atestado, encaminhamento, laudo e orientações: modelo, campos, título e texto. */
export function TextEditorCard({
  editor,
  dispatch,
  templateTitle,
  modelName,
  kindTemplates,
  fieldDefs,
  title,
  body,
  full,
  canManageTemplates,
  patientSex,
  onInclude,
  onReset,
  onDropTemplate,
}: TextEditorCardProps) {
  // Um modelo arrastado pousando sobre o editor.
  const [dropping, setDropping] = useState(false);
  const empty = !body.trim();

  return (
    <section
      id="emit-editor"
      className={`card space-y-4 p-4 transition-colors sm:p-5 ${dropping ? "border-pine-600 bg-pine-50/60" : ""}`}
      aria-label="Editor do documento"
      onDragOver={(e: DragEvent) => {
        if (!e.dataTransfer.types.includes(TEMPLATE_DRAG_TYPE)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        setDropping(true);
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={(e: DragEvent) => {
        const id = Number(e.dataTransfer.getData(TEMPLATE_DRAG_TYPE));
        setDropping(false);
        if (!id) return;
        e.preventDefault();
        onDropTemplate(id);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-display text-lg font-extrabold text-pine-950">{templateTitle || DOCUMENT_KIND_LABEL[editor.kind]}</p>
        <span className="chip bg-pine-50 text-pine-900/70">{modelName}</span>
        {editor.editing ? <span className="chip bg-peach-100 text-pine-950">Editando item</span> : null}
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label className="label" htmlFor="emit-template">
            Modelo
          </label>
          {canManageTemplates ? (
            <Link
              href="/configuracoes/modelos"
              className="-my-3 inline-flex min-h-11 items-center text-[11px] font-bold text-pine-600 hover:underline sm:my-0 sm:min-h-0"
            >
              Gerenciar modelos
            </Link>
          ) : null}
        </div>
        <select
          className="input"
          id="emit-template"
          value={editor.templateId ?? ""}
          onChange={(e) => dispatch({ type: "select-template", templateId: Number(e.target.value) || null })}
        >
          <option value="">Padrão</option>
          {kindTemplates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.scope === "clinica" ? `${t.name} · da clínica` : t.name}
            </option>
          ))}
        </select>
      </div>

      {editor.kind === "encaminhamento" ? (
        <div>
          <p className="label mb-1.5">Painéis de exames</p>
          <div className="flex flex-wrap gap-1.5">
            {EXAM_PANELS.map((panel) => (
              <button
                key={panel.name}
                type="button"
                title={`${panel.hint} — ${panel.exams.length} exames`}
                // Entra no texto do documento; o que já estava fica acima.
                onClick={() => dispatch({ type: "append-body", text: renderPanel(panel), currentBody: body })}
                className={QUICK_CHIP}
              >
                {panel.name}
                <span className="ml-1 font-normal text-pine-900/45">{panel.exams.length}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-pine-900/50">
            Acrescenta a lista ao texto. Cada painel é um ponto de partida — edite à vontade.
          </p>
        </div>
      ) : null}

      <DocumentFields
        fieldDefs={fieldDefs}
        values={editor.fields}
        onChange={(key, value) => dispatch({ type: "set-field", key, value })}
        idPrefix="emit"
        patientSex={patientSex}
      />

      <div>
        <label className="label" htmlFor="emit-title">
          Título na folha
        </label>
        <input
          className="input"
          id="emit-title"
          maxLength={120}
          value={title}
          onChange={(e) => dispatch({ type: "set-title", title: e.target.value })}
        />
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label className="label" htmlFor="emit-body">
            Texto do documento
          </label>
          {editor.manualBody !== null ? (
            <button
              type="button"
              className="-my-3 min-h-11 text-[11px] font-bold text-pine-600 hover:underline sm:my-0 sm:min-h-0"
              onClick={() => dispatch({ type: "reset-body" })}
            >
              Voltar ao texto do modelo
            </button>
          ) : (
            <span className="text-[11px] text-pine-900/45">segue o modelo e os campos acima</span>
          )}
        </div>
        <textarea
          className="input min-h-[12rem] text-base leading-relaxed sm:min-h-[14rem] sm:text-[15px]"
          id="emit-body"
          rows={10}
          value={body}
          onChange={(e) => dispatch({ type: "set-body", body: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {full && !editor.editing ? <LimitNote max={MAX_COMPOSER_ITEMS} /> : null}
        <button type="button" onClick={onReset} className="btn btn-outline">
          {editor.editing ? "Cancelar" : "Limpar"}
        </button>
        <button
          type="button"
          onClick={onInclude}
          className="btn btn-primary flex-1 disabled:opacity-50 sm:flex-none"
          disabled={editor.editing ? empty : empty || full}
        >
          {editor.editing ? (
            "Salvar item"
          ) : (
            <>
              <IconPlus className="h-4 w-4" />
              Incluir na emissão
            </>
          )}
        </button>
      </div>
    </section>
  );
}
