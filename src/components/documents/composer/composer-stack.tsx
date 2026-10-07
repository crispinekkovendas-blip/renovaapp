"use client";

import { memo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { MAX_COMPOSER_ITEMS, itemSummary } from "@/lib/composer";
import type { ComposerItem } from "@/lib/composer";
import { canNudge, moveItem, nudge } from "@/lib/reorder";
import { IconChevron, IconPencil, IconTrash } from "./icons";
import { Banner, KIND_BAR, ROUND_BTN } from "./ui";
import type { BannerTone } from "./ui";

export interface ProtocolDraft {
  open: boolean;
  name: string;
  clinic: boolean;
  message: { tone: Extract<BannerTone, "ok" | "erro">; text: string } | null;
  saving: boolean;
}

export interface ComposerStackProps {
  items: ComposerItem[];
  onItemsChange: Dispatch<SetStateAction<ComposerItem[]>>;
  /** Código do item aberto no editor (a linha fica destacada). */
  editingCode: string | null;
  onEdit(item: ComposerItem): void;
  onRemove(code: string): void;
  protocol: ProtocolDraft;
  canManageTemplates: boolean;
  onProtocolOpen(): void;
  onProtocolClose(): void;
  onProtocolName(name: string): void;
  onProtocolClinic(clinic: boolean): void;
  onProtocolSave(): void;
}

/** "Nesta emissão": a pilha, com reordenar, editar, remover e "Salvar como protocolo". */
export function ComposerStack({
  items,
  onItemsChange,
  editingCode,
  onEdit,
  onRemove,
  protocol,
  canManageTemplates,
  onProtocolOpen,
  onProtocolClose,
  onProtocolName,
  onProtocolClinic,
  onProtocolSave,
}: ComposerStackProps) {
  return (
    <section id="emit-stack" className="space-y-2" aria-label="Documentos desta emissão">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <p className="text-sm font-bold text-pine-950">Nesta emissão</p>
        <span className="text-xs font-bold text-pine-900/50">
          {items.length} de {MAX_COMPOSER_ITEMS}
        </span>
      </div>
      <div className="card overflow-hidden">
        {items.length === 0 ? (
          <p className="px-4 py-4 text-sm text-pine-900/55 sm:px-5 sm:py-5">
            Nenhum documento ainda. Escolha um tipo acima, preencha e clique em “Incluir na emissão”.
          </p>
        ) : (
          <StackList items={items} onItemsChange={onItemsChange} editingCode={editingCode} onEdit={onEdit} onRemove={onRemove} />
        )}
        <div className="space-y-3 border-t border-pine-900/5 bg-pine-50/40 px-4 py-2 sm:px-5 sm:py-3">
          {protocol.message ? <Banner tone={protocol.message.tone}>{protocol.message.text}</Banner> : null}
          {protocol.open ? (
            <div className="rounded-xl border border-[#e2dcec] bg-white p-3">
              <p className="text-xs text-pine-900/60">
                Um protocolo guarda os tipos, modelos e campos desta pilha para emitir tudo de novo com um clique — o
                texto é refeito para cada paciente.
              </p>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
                  <label className="label" htmlFor="emit-protocol-name">
                    Nome do protocolo
                  </label>
                  <input
                    className="input"
                    id="emit-protocol-name"
                    maxLength={80}
                    placeholder="Ex.: Pós-consulta padrão"
                    value={protocol.name}
                    onChange={(e) => onProtocolName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onProtocolSave();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={onProtocolSave}
                  disabled={protocol.saving}
                  className="btn btn-primary flex-1 disabled:opacity-50 sm:flex-none"
                >
                  {protocol.saving ? "Salvando…" : "Salvar"}
                </button>
                <button type="button" onClick={onProtocolClose} className="btn btn-ghost flex-1 sm:flex-none">
                  Cancelar
                </button>
              </div>
              {canManageTemplates ? (
                <label className="mt-2 flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
                  <input
                    type="checkbox"
                    checked={protocol.clinic}
                    onChange={(e) => onProtocolClinic(e.target.checked)}
                    className="h-4 w-4 accent-pine-700"
                  />
                  Protocolo da clínica (todos os profissionais veem)
                </label>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            onClick={onProtocolOpen}
            disabled={items.length === 0}
            className="min-h-11 text-xs font-bold text-pine-700 hover:underline disabled:opacity-40 disabled:no-underline sm:min-h-0"
          >
            Salvar como protocolo
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * As linhas da pilha. Memo: só mudam com a pilha ou com o item em edição, não
 * a cada tecla no editor. Arrastar (HTML5) para o mouse; subir/descer para o
 * toque e o teclado.
 */
const StackList = memo(function StackList({
  items,
  onItemsChange,
  editingCode,
  onEdit,
  onRemove,
}: Pick<ComposerStackProps, "items" | "onItemsChange" | "editingCode" | "onEdit" | "onRemove">) {
  // Índice do item sendo arrastado.
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <ul className="divide-y divide-pine-900/5">
      {items.map((item, index) => (
        <li
          key={item.code}
          draggable
          onDragStart={(e) => {
            setDragging(index);
            e.dataTransfer.effectAllowed = "move";
            // Sem isto o Firefox não inicia o arrasto.
            e.dataTransfer.setData("text/plain", item.code);
          }}
          onDragEnd={() => setDragging(null)}
          onDragOver={(e) => {
            if (dragging === null) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            if (dragging === null) return;
            e.preventDefault();
            onItemsChange((current) => moveItem(current, dragging, index));
            setDragging(null);
          }}
          className={`relative flex cursor-grab flex-wrap items-center gap-x-3 gap-y-1 py-3 pl-5 pr-3 active:cursor-grabbing lg:flex-nowrap lg:pr-4 ${
            editingCode === item.code ? "bg-pine-50/60" : ""
          } ${dragging === index ? "opacity-40" : ""}`}
        >
          <span aria-hidden className={`absolute bottom-2 left-0 top-2 w-1 rounded-r-full ${KIND_BAR[item.kind]}`} />
          <span className="w-5 shrink-0 text-xs font-bold text-pine-900/45" title="Arraste para mudar a ordem em que os documentos saem">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 basis-[calc(100%-2rem)] lg:basis-auto">
            <p className="truncate text-sm font-bold text-pine-950">{item.title}</p>
            <p className="truncate text-xs text-pine-900/55">{itemSummary(item.body)}</p>
          </div>
          <span className="hidden shrink-0 font-mono text-[11px] font-bold text-pine-700 sm:block">{item.code}</span>
          {/* Abaixo do lg os botões descem para uma linha própria, com subir/descer:
              o arrastar do HTML5 não existe no toque. */}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onItemsChange((current) => nudge(current, index, -1))}
              disabled={!canNudge(items.length, index, -1)}
              className={`${ROUND_BTN} text-pine-700 hover:bg-pine-50 lg:pointer-fine:hidden`}
              aria-label={`Subir ${item.title}`}
              title="Subir"
            >
              <IconChevron up className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onItemsChange((current) => nudge(current, index, 1))}
              disabled={!canNudge(items.length, index, 1)}
              className={`${ROUND_BTN} text-pine-700 hover:bg-pine-50 lg:pointer-fine:hidden`}
              aria-label={`Descer ${item.title}`}
              title="Descer"
            >
              <IconChevron className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onEdit(item)}
              className={`${ROUND_BTN} text-pine-700 hover:bg-pine-50`}
              aria-label={`Editar ${item.title}`}
              title="Editar"
            >
              <IconPencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.code)}
              className={`${ROUND_BTN} text-rose-600 hover:bg-rose-50`}
              aria-label={`Remover ${item.title}`}
              title="Remover"
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
});
