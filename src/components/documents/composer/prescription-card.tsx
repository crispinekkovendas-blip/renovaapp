"use client";

import { Feedback } from "@/components/feedback";
import { MAX_COMPOSER_ITEMS } from "@/lib/composer";
import type { ComposerTemplate } from "@/lib/composer";
import type { PrescriptionItem } from "@/lib/prescription";
import type { FrequentItem } from "@/lib/rx-suggestions";
import { PrescriptionEditor } from "../prescription-editor";
import { LimitNote, QUICK_CHIP } from "./ui";

export interface PrescriptionCardProps {
  rx: PrescriptionItem[];
  onRxChange(rx: PrescriptionItem[]): void;
  allergies: string | null;
  /** Protocolos de medicamento que a própria clínica salvou (modelos de kind "receituario"). */
  rxProtocols: ReadonlyArray<ComposerTemplate>;
  /** O que este médico mais receita, para o "Seus mais receitados" do editor. */
  frequentRx: ReadonlyArray<FrequentItem>;
  full: boolean;
  protocolName: string;
  onProtocolNameChange(name: string): void;
  protocolMessage: { tone: "ok" | "erro"; text: string } | null;
  onDismissProtocolMessage: () => void;
  savingProtocol: boolean;
  onSaveProtocol(): void;
  /** O medicamento aberto no cartão (um por vez). */
  editing: { index: number; nonce: number } | null;
  onEdit(index: number | null, options?: { silent?: boolean }): void;
  /** "Ver na folha" de cada cartão. */
  onShowOnSheet?(index: number): void;
  /** Que parte mostrar (compositor em telas): a receita, a busca ou o medicamento aberto. */
  view: "lista" | "adicionar" | "medicamento";
  /** "+ Adicionar medicamento" da lista. */
  onAdd(): void;
  /** Uma receita pronta entrou inteira: volta à lista. */
  onAddedMany(): void;
}

/**
 * O receituário em três telas do compositor: "lista" (a receita, os
 * protocolos da clínica, salvar como protocolo), "adicionar" (a busca) e
 * "medicamento" (posologia, quantidade, via do que está aberto). Incluir na
 * emissão e fechar o medicamento são o botão do rodapé do compositor.
 */
export function PrescriptionCard({
  rx,
  onRxChange,
  allergies,
  rxProtocols,
  frequentRx,
  full,
  protocolName,
  onProtocolNameChange,
  protocolMessage,
  onDismissProtocolMessage,
  savingProtocol,
  onSaveProtocol,
  editing,
  onEdit,
  onShowOnSheet,
  view,
  onAdd,
  onAddedMany,
}: PrescriptionCardProps) {
  const list = view === "lista";
  return (
    <section className="card space-y-4 p-4 sm:p-5" aria-label="Receituário">
      {view === "adicionar" ? (
        <span className="chip bg-pine-50 text-pine-900/70">catálogo da ANVISA</span>
      ) : null}

      {/* Protocolos que a própria clínica salvou. As receitas prontas do Renova
          (por condição) ficam na tela de adicionar, em "Receitas prontas". */}
      {list && rxProtocols.length > 0 ? (
        <div>
          <p className="label mb-1.5">Protocolos da clínica</p>
          <div className="flex flex-wrap gap-1.5">
            {rxProtocols.map((protocol) => (
              <button
                key={protocol.id}
                type="button"
                // A lista já vem lida do servidor (como os protocolos de texto).
                onClick={() => {
                  const saved = protocol.medications ?? [];
                  if (saved.length > 0) onRxChange([...rx, ...saved]);
                }}
                title={`${protocol.medications?.length ?? 0} medicamento(s)`}
                className={QUICK_CHIP}
              >
                {protocol.name}
                <span className="ml-1 font-normal text-pine-900/45">{protocol.medications?.length ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <PrescriptionEditor
        items={rx}
        onChange={onRxChange}
        allergies={allergies}
        frequent={frequentRx}
        editing={editing}
        onEdit={onEdit}
        onShowOnSheet={onShowOnSheet}
        view={view}
        onAdd={onAdd}
        onAddedMany={onAddedMany}
      />

      {list && rx.length > 0 ? (
        <details className="rounded-2xl border border-dashed border-[var(--color-line)] p-3">
          <summary className="cursor-pointer text-[12.5px] font-bold text-pine-700">Salvar esta lista como protocolo</summary>
          <div className="mt-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
                <label className="label" htmlFor="rx-protocolo">
                  Nome do protocolo
                </label>
                <input
                  className="input"
                  id="rx-protocolo"
                  maxLength={80}
                  value={protocolName}
                  placeholder="Ex.: Gripe adulto, ITU não complicada"
                  onChange={(e) => onProtocolNameChange(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={onSaveProtocol}
                disabled={savingProtocol || protocolName.trim() === ""}
                className="btn btn-outline w-full disabled:opacity-50 sm:w-auto"
              >
                {savingProtocol ? "Salvando…" : "Salvar protocolo"}
              </button>
            </div>
            {protocolMessage ? (
              <Feedback key={protocolMessage.text} tone={protocolMessage.tone} className="mt-1.5" onClose={onDismissProtocolMessage}>
                {protocolMessage.text}
              </Feedback>
            ) : null}
            </div>
          </details>
        ) : null}
        {list && full ? <LimitNote max={MAX_COMPOSER_ITEMS} /> : null}

      </section>
    );
  }
