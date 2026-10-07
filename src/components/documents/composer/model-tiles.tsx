"use client";

import { useState } from "react";
import type { DragEvent } from "react";
import type { ComposerTemplate } from "@/lib/composer";
import { MOST_USED_LIMIT, mostUsedTemplates, shortTemplateName } from "@/lib/composer-tabs";
import { IconFileText } from "@/components/icons";
import { IconList } from "./icons";

/**
 * Os modelos (e protocolos) do tipo aberto em quadradinhos, 6 por fileira
 * (3 no celular). Em cima, "Mais usados" — os que mais saíram nos documentos
 * deste médico — e "Todos". Clicar aplica; arrastar para o documento também.
 */

type View = "usados" | "todos";

export function ModelTiles({
  templates,
  protocols,
  usage,
  templateId,
  full,
  onApply,
  onDragStart,
}: {
  /** Modelos (não protocolos) do tipo/subtipo do editor. */
  templates: ReadonlyArray<ComposerTemplate>;
  protocols: ReadonlyArray<ComposerTemplate>;
  /** Quantas vezes cada modelo já saiu num documento. */
  usage: Readonly<Record<number, number>>;
  /** Modelo carregado no editor, para destacar. */
  templateId: number | null;
  /** Pilha cheia: protocolos ficam desabilitados. */
  full: boolean;
  onApply(template: ComposerTemplate): void;
  onDragStart(event: DragEvent, template: ComposerTemplate): void;
}) {
  const all = [...templates, ...protocols];
  const protocolIds = new Set(protocols.map((t) => t.id));
  const hasMore = all.length > MOST_USED_LIMIT;
  const [view, setView] = useState<View>("usados");
  const list = view === "usados" && hasMore ? mostUsedTemplates(all, usage) : all;

  return (
    <section aria-label="Modelos" className="@container">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-pine-900/55">Modelos</span>
        {hasMore ? (
          <div className="inline-flex rounded-xl bg-pine-100/60 p-0.5" role="tablist" aria-label="Quais modelos mostrar">
            {(
              [
                ["usados", "Mais usados"],
                ["todos", `Todos · ${all.length}`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={view === id}
                onClick={() => setView(id)}
                className={`rounded-[10px] px-2.5 py-1 text-[12px] font-bold transition-colors pointer-coarse:min-h-11 ${
                  view === id ? "bg-white text-pine-950 shadow-sm" : "text-pine-900/60 hover:text-pine-950"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2 @xl:grid-cols-4 @2xl:grid-cols-6">
        {list.map((t) => {
          const protocol = protocolIds.has(t.id);
          const on = !protocol && templateId === t.id;
          const disabled = protocol && full;
          const count = usage[t.id] ?? 0;
          return (
            <button
              key={t.id}
              type="button"
              draggable={!disabled}
              onDragStart={(event) => onDragStart(event, t)}
              onClick={() => onApply(t)}
              disabled={disabled}
              title={
                protocol
                  ? `Protocolo: acrescenta ${t.items?.length ?? 0} documento(s) à emissão. Clique ou arraste.`
                  : `${t.name}${count > 0 ? ` · usado ${count}×` : ""}. Clique ou arraste para o documento.`
              }
              className={`relative flex min-h-[5.25rem] cursor-grab flex-col rounded-xl border p-2 text-left transition-colors active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 ${
                on
                  ? "border-pine-950 bg-pine-950 text-white"
                  : "border-[#e2dcec] bg-white text-pine-950 hover:border-pine-400 hover:bg-pine-50/40"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                  on ? "bg-white/15 text-white" : protocol ? "bg-peach-100 text-pine-950" : "bg-pine-50 text-pine-600"
                }`}
                aria-hidden
              >
                {protocol ? <IconList className="h-3.5 w-3.5" /> : <IconFileText className="h-3.5 w-3.5" />}
              </span>
              <span className="mt-1.5 line-clamp-2 text-[11.5px] leading-tight font-bold tracking-tight break-words">{shortTemplateName(t.name)}</span>
              <span className={`mt-auto pt-1 text-[10px] font-bold ${on ? "text-white/60" : "text-pine-900/45"}`}>
                {protocol ? `Protocolo · ${t.items?.length ?? 0}` : t.scope === "clinica" ? "Da clínica" : t.scope === "meu" ? "Meu" : "Outro profissional"}
              </span>
              {count > 0 ? (
                <span
                  className={`absolute top-2 right-2 rounded-full px-1.5 text-[10px] font-bold tabular-nums ${
                    on ? "bg-white/15 text-white/80" : "bg-pine-50 text-pine-900/55"
                  }`}
                >
                  {count}×
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
