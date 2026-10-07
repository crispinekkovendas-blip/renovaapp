"use client";

import { memo } from "react";
import type { DragEvent } from "react";
import { ATESTADO_SUBKINDS } from "@/lib/documents";
import type { AtestadoSubkind } from "@/lib/documents";
import type { ComposerTemplate } from "@/lib/composer";
import type { ComposerTab } from "@/lib/composer-editor";
import { ModelTiles } from "./model-tiles";
import { TypeRail } from "./type-rail";
import { CHIP_ROW } from "./ui";

/** Tipo MIME do modelo arrastado para o editor (ver `TextEditorCard`). */
export const TEMPLATE_DRAG_TYPE = "text/renova-modelo";

export interface TabOption {
  tab: ComposerTab;
  label: string;
}

export interface TypePickerProps {
  tabs: ReadonlyArray<TabOption>;
  tab: ComposerTab;
  /** Quantas vezes cada modelo já saiu num documento ("Mais usados" dos modelos). */
  templateUsage: Readonly<Record<number, number>>;
  subkind: AtestadoSubkind | null;
  /** Modelos (não protocolos) do tipo/subtipo do editor. */
  kindTemplates: ReadonlyArray<ComposerTemplate>;
  protocols: ReadonlyArray<ComposerTemplate>;
  /** Modelo carregado no editor, para destacar o chip. */
  templateId: number | null;
  /** Pilha cheia: protocolos ficam desabilitados. */
  full: boolean;
  onSelectTab(tab: ComposerTab): void;
  onSelectSubkind(subkind: AtestadoSubkind): void;
  onApplyTemplate(template: ComposerTemplate): void;
}

function startTemplateDrag(e: DragEvent, template: ComposerTemplate) {
  e.dataTransfer.setData(TEMPLATE_DRAG_TYPE, String(template.id));
  e.dataTransfer.effectAllowed = "copy";
}

/**
 * Os tipos (fileira no celular), os subtipos do atestado e os modelos em quadradinhos. Memo:
 * nada aqui depende do texto, então digitar no editor não o refaz.
 */
export const TypePicker = memo(function TypePicker({
  tabs,
  tab,
  templateUsage,
  subkind,
  kindTemplates,
  protocols,
  templateId,
  full,
  onSelectTab,
  onSelectSubkind,
  onApplyTemplate,
}: TypePickerProps) {
  return (
    <>
      {/* No computador a barra é uma coluna ao lado (emit-composer); aqui, a fileira do celular. */}
      <TypeRail tabs={tabs} tab={tab} onSelect={onSelectTab} className="lg:hidden" />
      {tab === "atestado" ? (
        <nav aria-label="Tipo de atestado" className={`${CHIP_ROW} gap-1.5`}>
          {ATESTADO_SUBKINDS.map((item) => (
            <button
              key={item.subkind}
              type="button"
              onClick={() => onSelectSubkind(item.subkind)}
              className={`doc-subtab shrink-0 whitespace-nowrap${item.subkind === subkind ? " active" : ""}`}
              aria-pressed={item.subkind === subkind}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}

      {tab !== "receita" && (kindTemplates.length > 0 || protocols.length > 0) ? (
        <ModelTiles
          templates={kindTemplates}
          protocols={protocols}
          usage={templateUsage}
          templateId={templateId}
          full={full}
          onApply={onApplyTemplate}
          onDragStart={startTemplateDrag}
        />
      ) : null}
    </>
  );
});
