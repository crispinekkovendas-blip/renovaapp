"use client";

import { Feedback } from "@/components/feedback";
import { MAX_COMPOSER_ITEMS } from "@/lib/composer";
import type { ComposerTemplate } from "@/lib/composer";
import type { PrescriptionItem } from "@/lib/prescription";
import type { FrequentItem } from "@/lib/rx-suggestions";
import { IconPlus } from "@/components/icons";
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
  /** Em quantos documentos a lista sai e com quantos medicamentos (`prescriptionSummary`). */
  docCount: number;
  medicationCount: number;
  full: boolean;
  protocolName: string;
  onProtocolNameChange(name: string): void;
  protocolMessage: { tone: "ok" | "erro"; text: string } | null;
  onDismissProtocolMessage: () => void;
  savingProtocol: boolean;
  onSaveProtocol(): void;
  onInclude(): void;
  /** O medicamento aberto no cartão (um por vez). */
  editing: { index: number; nonce: number } | null;
  onEdit(index: number | null, options?: { silent?: boolean }): void;
  /** "Ver na folha" de cada cartão. */
  onShowOnSheet?(index: number): void;
}

/** O receituário: a lista de medicamentos, os protocolos da clínica e "Incluir". */
export function PrescriptionCard({
  rx,
  onRxChange,
  allergies,
  rxProtocols,
  frequentRx,
  docCount,
  medicationCount,
  full,
  protocolName,
  onProtocolNameChange,
  protocolMessage,
  onDismissProtocolMessage,
  savingProtocol,
  onSaveProtocol,
  onInclude,
  editing,
  onEdit,
  onShowOnSheet,
}: PrescriptionCardProps) {
  return (
    <section className="card space-y-4 p-4 sm:p-5" aria-label="Receituário">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-display text-lg font-extrabold text-pine-950">Receituário</p>
        <span className="chip bg-pine-50 text-pine-900/70">catálogo da ANVISA</span>
      </div>

      {/* Protocolos que a própria clínica salvou. As receitas prontas do Renova
          (por condição) ficam no editor, em "Receitas prontas". */}
      {rxProtocols.length > 0 ? (
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
      />

      {rx.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e2dcec] p-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
              <label className="label" htmlFor="rx-protocolo">
                Salvar esta lista como protocolo
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
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {full ? <LimitNote max={MAX_COMPOSER_ITEMS} /> : null}
        <button type="button" onClick={() => onRxChange([])} className="btn btn-outline" disabled={rx.length === 0}>
          Limpar
        </button>
        <button
          type="button"
          onClick={onInclude}
          className="btn btn-primary flex-1 disabled:opacity-50 sm:flex-none"
          disabled={docCount === 0 || full}
        >
          <IconPlus className="h-4 w-4" />
          {docCount > 1 ? `Incluir ${docCount} documentos (${medicationCount} medicamentos)` : "Incluir na emissão"}
        </button>
      </div>
    </section>
  );
}
