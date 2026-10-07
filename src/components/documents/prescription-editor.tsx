"use client";

import { Popover, PopoverClose } from "@/components/popover";
import { useEffect, useRef, useState, useTransition } from "react";
import { searchMedicationsAction } from "@/lib/actions-documents";
import { ROUTES, emptyItem, itemComplete, prescriptionWarnings, splitIntoDocuments } from "@/lib/prescription";
import type { PrescriptionItem } from "@/lib/prescription";
import { RECEIPT_KIND_LABEL, receiptKindFor } from "@/lib/medications";
import type { Tarja } from "@/lib/medications";
import { POSOLOGY_GROUPS, applyPhrase } from "@/lib/posology";
import {
  RX_PROTOCOL_GROUPS,
  applyDose,
  doseEntryFor,
  orderedOptions,
  previousFor,
  protocolItems,
  searchProtocols,
  suggestionsForItem,
} from "@/lib/rx-suggestions";
import type { DoseOption, FrequentItem, RxProtocol } from "@/lib/rx-suggestions";
import { RX_DRAG_TYPE, encodeDragItems } from "@/lib/rx-canvas";
import type { DragEvent } from "react";

/**
 * Editor do receituário: uma lista de medicamentos, não um texto.
 *
 * O que o médico vê enquanto monta:
 * - busca no catálogo da ANVISA (25 mil apresentações) com a tarja de cada um,
 *   e, nas apresentações comuns, a posologia da bula a um clique;
 * - "Seus mais receitados" (medicamento + posologia que o médico já usou) e
 *   "Receitas prontas" por condição, que entram na lista inteiras;
 * - quantidade, posologia, via e uso contínuo por item;
 * - avisos de alergia (cruzando com o cadastro), medicamento repetido e tarja
 *   preta (que não pode sair neste papel);
 * - **em quantos documentos a receita vai sair**, porque dipirona e
 *   amoxicilina juntas são dois papéis por exigência legal, e descobrir isso
 *   só na impressora seria tarde.
 *
 * Um medicamento por vez: o cartão abre ao escolher na busca e fecha em
 * "Enviar para a receita" — dali em diante ele mora na folha da prévia. Clicar
 * nele na folha (ou no "Na receita") reabre o cartão (`editing`). Na folha
 * também se arrasta o que está na busca, nos "mais receitados" e nas receitas
 * prontas.
 */

/** Arrastar para a folha: leva o item pronto; se soltou, o lado de cá limpa a busca. */
function dragItems(items: () => PrescriptionItem[], onDropped?: () => void) {
  return {
    draggable: true,
    onDragStart: (event: DragEvent) => {
      event.dataTransfer.setData(RX_DRAG_TYPE, encodeDragItems(items()));
      event.dataTransfer.effectAllowed = "copy";
    },
    onDragEnd: (event: DragEvent) => {
      if (event.dataTransfer.dropEffect !== "none") onDropped?.();
    },
  };
}

type DragProps = ReturnType<typeof dragItems>;

const TARJA_CHIP: Record<Tarja, string> = {
  livre: "bg-emerald-100 text-emerald-800",
  vermelha: "bg-rose-100 text-rose-800",
  vermelha_retida: "bg-rose-200 text-rose-900",
  preta: "bg-stone-800 text-white",
  desconhecida: "bg-stone-200 text-stone-700",
};

const TARJA_SHORT: Record<Tarja, string> = {
  livre: "Venda livre",
  vermelha: "Tarja vermelha",
  vermelha_retida: "Vermelha com retenção",
  preta: "Tarja preta",
  desconhecida: "Sem tarja informada",
};

/** Botão de subir/descer: 44px no celular, discreto no desktop. */


interface Hit {
  label: string;
  substance: string;
  concentration: string | null;
  tarja: Tarja;
  warning: string | null;
  brands: number;
}

function IconChevron({ up }: { up?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4"
    >
      <path d={up ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} />
    </svg>
  );
}

export function PrescriptionEditor({
  items,
  onChange,
  allergies,
  frequent = [],
  editing = null,
  onEdit,
  onShowOnSheet,
}: {
  items: PrescriptionItem[];
  onChange: (items: PrescriptionItem[]) => void;
  /** Alergias do cadastro, para o aviso. */
  allergies: string | null;
  /** O que este médico mais receita (`frequentItems`). */
  frequent?: ReadonlyArray<FrequentItem>;
  /**
   * O medicamento em edição — um por vez. Os outros já estão na folha; clicar
   * num deles lá (ou no "Na receita") o traz de volta. `nonce` novo = rolar até ele.
   */
  editing?: { index: number; nonce: number } | null;
  /** Abre (índice) ou fecha (null) o cartão; `silent`: fechar sem piscar na folha (removeu). */
  onEdit(index: number | null, options?: { silent?: boolean }): void;
  /** "Ver na folha": leva a prévia à página do item. */
  onShowOnSheet?(index: number): void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, startSearch] = useTransition();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(false);

  const editingItem = editing ? items[editing.index] : undefined;
  const current = editing && editingItem ? { index: editing.index, item: editingItem } : null;

  // Reaberto pela folha: o cartão vem para a vista e pisca.
  const editNonce = editing?.nonce;
  useEffect(() => {
    if (editNonce === undefined) return;
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setLit(true);
    const timer = setTimeout(() => setLit(false), 1800);
    return () => clearTimeout(timer);
  }, [editNonce]);

  // Busca com folga: o médico digita rápido e cada tecla é uma ida ao servidor.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      startSearch(async () => {
        setHits(await searchMedicationsAction(term));
        setOpen(true);
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  // Clique fora fecha a lista.
  useEffect(() => {
    if (!open) return;
    // pointerdown: fecha também com o toque do dedo fora da lista.
    const onDown = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    // Esc também fecha, como em todo pop-up do app.
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Da busca para a lista, já com a posologia da bula quando há (`dose` escolhe outra). */
  function add(hit: Hit, dose?: DoseOption) {
    open1(itemFromHit(hit, dose));
    clearSearch();
  }

  /** Um medicamento novo entra na receita e abre no cartão (o que estava aberto fica na folha). */
  function open1(item: PrescriptionItem) {
    onChange([...items, item]);
    onEdit(items.length);
  }

  /** "Enviar para a receita": fecha o cartão; o item já está na folha. Volta à busca. */
  function ship() {
    onEdit(null);
    document.getElementById("rx-busca")?.focus();
  }

  function clearSearch() {
    setQuery("");
    setHits([]);
    setOpen(false);
  }

  /** Um "mais receitado" ou uma receita pronta: entra já completo. */
  function addItems(more: PrescriptionItem[]) {
    // Um só ("mais receitados"): abre para revisar. Vários (receita pronta): vão direto para a folha.
    if (more.length === 1) open1({ ...more[0] });
    else if (more.length > 1) onChange([...items, ...more.map((item) => ({ ...item }))]);
  }

  /** Medicamento fora do catálogo (manipulado, importado) continua possível. */
  function addFreeText() {
    const name = query.trim();
    if (!name) return;
    open1({ ...emptyItem(), name });
    clearSearch();
  }

  function update(index: number, patch: Partial<PrescriptionItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const warnings = prescriptionWarnings(items, allergies);
  const documents = splitIntoDocuments(items);
  const usable = items.filter(itemComplete).length;

  return (
    <div className="space-y-4">
      {/* ── Busca ──────────────────────────────────────────── */}
      <div ref={boxRef} className="relative">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <label className="label" htmlFor="rx-busca">
            Medicamento
          </label>
          <ReadyPrescriptions
            onPick={(protocol) => addItems(protocolItems(protocol))}
            dragFor={(protocol) => dragItems(() => protocolItems(protocol))}
          />
        </div>
        <input
          className="input"
          id="rx-busca"
          value={query}
          autoComplete="off"
          placeholder="Princípio ativo ou marca — ex.: dipirona"
          enterKeyHint="search"
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
        />
        <p className="mt-1 text-[11px] text-pine-900/50">
          {searching ? "Buscando…" : "Catálogo da ANVISA. Não achou? Escreva o nome e clique em “Usar assim”."}
        </p>

        {open && (hits.length > 0 || query.trim().length >= 3) ? (
          <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-2xl border border-[#e2dcec] bg-white shadow-lg">
            <ul className="max-h-[min(18rem,45dvh)] overflow-y-auto overscroll-contain">
              {hits.map((hit) => (
                <li
                  key={`${hit.substance}-${hit.concentration ?? ""}`}
                  className="border-b border-[#f4f0f8] last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => add(hit)}
                    {...dragItems(() => [itemFromHit(hit)], clearSearch)}
                    className="flex min-h-11 w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-pine-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold text-pine-950">{hit.label}</span>
                      <span className="block text-[11.5px] text-pine-900/55">
                        {RECEIPT_KIND_LABEL[receiptKindFor(hit.tarja)]}
                        {hit.brands > 1 ? ` · ${hit.brands} apresentações` : ""}
                      </span>
                    </span>
                    <span className={`chip shrink-0 ${TARJA_CHIP[hit.tarja]}`}>{TARJA_SHORT[hit.tarja]}</span>
                  </button>
                  <HitDoses
                    hit={hit}
                    onPick={(dose) => add(hit, dose)}
                    dragFor={(dose) => dragItems(() => [itemFromHit(hit, dose)], clearSearch)}
                  />
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={addFreeText}
              className="min-h-11 w-full truncate border-t border-[#eee7f4] px-4 py-2.5 text-left text-[12.5px] font-bold text-pine-600 hover:bg-pine-50"
            >
              Usar assim: “{query.trim()}”
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Seus mais receitados ────────────────────────────── */}
      {frequent.length > 0 ? (
        <div>
          <p className="label mb-1.5">Seus mais receitados</p>
          <div className="scroll-x flex gap-1.5 lg:flex-wrap lg:overflow-visible">
            {frequent.slice(0, 10).map(({ item, count }) => (
              <button
                key={`${item.name}|${item.posology}`}
                type="button"
                onClick={() => addItems([item])}
                {...dragItems(() => [{ ...item }])}
                title={`${item.name} — ${item.posology} (${count}×)`}
                className="max-w-[16rem] shrink-0 rounded-xl border border-[#e2dcec] bg-white px-2.5 py-1 text-left transition-colors hover:border-pine-400 hover:bg-pine-50 pointer-coarse:min-h-11"
              >
                <span className="block truncate text-[12px] font-bold text-pine-950">{item.name}</span>
                <span className="block truncate text-[11px] text-pine-900/55">{item.posology}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── O medicamento em edição (um por vez) ─────────────── */}
      {current ? (
        <div
          key={current.index}
          ref={cardRef}
          className={`rounded-2xl border bg-white p-3 transition-[border-color,box-shadow] duration-500 sm:p-4 ${
            lit ? "border-pine-500 shadow-[0_0_0_3px_rgba(108,61,181,0.18)]" : "border-[#e8e1f0]"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="break-words text-[14px] font-extrabold text-pine-950">
                {current.index + 1}) {current.item.name}
              </p>
              <span className={`chip mt-1 ${TARJA_CHIP[current.item.tarja]}`}>{TARJA_SHORT[current.item.tarja]}</span>
            </div>
            <div className="-mr-1 -mt-1 flex shrink-0 items-center gap-0.5 sm:mr-0 sm:mt-0">
              {onShowOnSheet && itemComplete(current.item) ? (
                <button
                  type="button"
                  onClick={() => onShowOnSheet(current.index)}
                  className="flex h-11 items-center rounded-lg px-2 text-[11px] font-bold text-pine-600 hover:underline sm:h-auto sm:px-1"
                  title="Mostra este medicamento na folha, no papel em que ele sai"
                >
                  Ver na folha
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  onEdit(null, { silent: true });
                  onChange(items.filter((_, i) => i !== current.index));
                }}
                className="flex h-11 items-center rounded-lg px-2 text-[11px] font-bold text-rose-600 hover:underline sm:h-auto sm:px-1"
              >
                Remover
              </button>
            </div>
          </div>

          <PosologyField
            item={current.item}
            index={current.index}
            previous={previousFor(frequent, current.item.name)}
            onChange={(patch) => update(current.index, patch)}
          />

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr]">
            <div>
              <label className="label" htmlFor={`rx-qtd-${current.index}`}>
                Quantidade
              </label>
              <input
                className="input"
                id={`rx-qtd-${current.index}`}
                value={current.item.quantity}
                placeholder="1 caixa, 30 comprimidos, 1 frasco"
                onChange={(e) => update(current.index, { quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor={`rx-via-${current.index}`}>
                Via
              </label>
              <select
                className="input"
                id={`rx-via-${current.index}`}
                value={current.item.route}
                onChange={(e) => update(current.index, { route: e.target.value as PrescriptionItem["route"] })}
              >
                <option value="">—</option>
                {ROUTES.map((route) => (
                  <option key={route} value={route}>
                    {route}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <label className="flex min-h-11 items-center gap-2 text-[12.5px] font-bold text-pine-900/75 sm:min-h-0">
              <input
                type="checkbox"
                className="h-4 w-4 accent-pine-700 pointer-coarse:h-5 pointer-coarse:w-5"
                checked={current.item.continuous}
                onChange={(e) => update(current.index, { continuous: e.target.checked })}
              />
              Uso contínuo
            </label>
            {/* Enviar: o cartão fecha e o medicamento fica na folha. Sem posologia não sai. */}
            <button
              type="button"
              onClick={ship}
              disabled={!itemComplete(current.item)}
              className="btn btn-primary w-full disabled:opacity-50 sm:w-auto"
            >
              {itemComplete(current.item) ? "Enviar para a receita →" : "Escolha a posologia para enviar"}
            </button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#e2dcec] px-5 py-6 text-center text-sm text-pine-900/55">
          Nenhum medicamento ainda. Busque acima para começar a receita.
        </p>
      ) : (
        <p className="rounded-2xl border border-dashed border-[#e2dcec] px-5 py-4 text-center text-[13px] text-pine-900/55">
          Busque o próximo medicamento acima — ou clique num medicamento da folha para editá-lo.
        </p>
      )}

      {/* ── O que já está na receita: um toque reabre para editar ── */}
      {items.length > (current ? 1 : 0) ? (
        <div>
          <p className="label mb-1.5">Na receita</p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item, index) =>
              index === current?.index ? null : (
                <button
                  key={index}
                  type="button"
                  onClick={() => onEdit(index)}
                  title={itemComplete(item) ? `Editar ${item.name}` : "Sem posologia: não sai na receita. Clique para completar."}
                  className={`max-w-full truncate rounded-xl border px-2.5 py-1 text-left text-[12px] font-bold transition-colors pointer-coarse:min-h-11 ${
                    itemComplete(item)
                      ? "border-[#e2dcec] bg-white text-pine-950 hover:border-pine-400 hover:bg-pine-50"
                      : "border-amber-300 bg-amber-50 text-amber-900 hover:border-amber-400"
                  }`}
                >
                  {index + 1}) {item.name}
                  {itemComplete(item) ? null : <span className="font-normal"> · sem posologia</span>}
                </button>
              )
            )}
          </div>
        </div>
      ) : null}

      {/* ── Avisos ─────────────────────────────────────────── */}
      {warnings.length > 0 ? (
        <ul className="space-y-2">
          {warnings.map((warning, i) => (
            <li
              key={i}
              className={`rounded-xl px-4 py-2.5 text-[12.5px] font-semibold ${
                warning.kind === "bloqueado"
                  ? "bg-stone-800 text-white"
                  : warning.kind === "alergia"
                    ? "border border-rose-200 bg-rose-50 text-rose-800"
                    : "border border-amber-200 bg-amber-50 text-amber-900"
              }`}
              role={warning.kind === "alergia" ? "alert" : undefined}
            >
              {warning.message}
            </li>
          ))}
        </ul>
      ) : null}

      {/* ── Em quantos papéis isto vai sair ────────────────── */}
      {documents.length > 0 ? (
        <div className="rounded-2xl bg-pine-50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-pine-900/50">
            {documents.length === 1 ? "Sai em 1 documento" : `Sai em ${documents.length} documentos`}
          </p>
          <ul className="mt-1.5 space-y-1">
            {documents.map((doc) => (
              <li key={doc.kind} className="text-[12.5px] text-pine-900/75">
                <strong>{doc.label}</strong>
                {doc.vias > 1 ? ` · ${doc.vias} vias` : ""} — {doc.items.length} medicamento
                {doc.items.length === 1 ? "" : "s"}
                {doc.kind === "notificacao" ? " (não será emitido)" : ""}
              </li>
            ))}
          </ul>
          {usable < items.length ? (
            <p className="mt-2 text-[11.5px] text-pine-900/55">
              {items.length - usable} item(ns) sem posologia não entram.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** O item que a busca inclui: já com a posologia da bula quando há (`dose` escolhe outra). */
function itemFromHit(hit: Hit, dose?: DoseOption): PrescriptionItem {
  const item = { ...emptyItem(), name: hit.label, concentration: hit.concentration, tarja: hit.tarja };
  // Sem escolha explícita, entra com a primeira posologia pronta: quase sempre é a que se usa.
  const chosen = dose ?? doseEntryFor(hit.substance, hit.concentration)?.options[0];
  return chosen ? applyDose(item, chosen) : item;
}

/** Linha de posologia pronta: rótulo curto, a frase e a quantidade. */
function DoseText({ option }: { option: DoseOption }) {
  return (
    <>
      {option.label ? <strong className="font-bold text-pine-900">{option.label}: </strong> : null}
      {option.posology}
      <span className="text-pine-900/45"> · {option.quantity}</span>
    </>
  );
}

/**
 * Na lista da busca, abaixo da apresentação: as duas primeiras posologias da
 * bula, que já adicionam o item completo. As outras ficam no cartão do item.
 */
function HitDoses({
  hit,
  onPick,
  dragFor,
}: {
  hit: Hit;
  onPick: (dose: DoseOption) => void;
  dragFor: (dose: DoseOption) => DragProps;
}) {
  const all = orderedOptions(doseEntryFor(hit.substance, hit.concentration)?.options ?? []);
  const doses = all.slice(0, 2);
  if (doses.length === 0) return null;
  return (
    <div className="-mt-1 flex flex-col gap-0.5 px-3 pb-2">
      {doses.map((dose) => (
        <button
          key={dose.posology}
          type="button"
          onClick={() => onPick(dose)}
          {...dragFor(dose)}
          className="flex min-h-11 items-start gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] text-pine-900/75 hover:bg-pine-50 sm:min-h-0"
        >
          <span aria-hidden className="mt-px font-bold text-pine-600">
            ↳
          </span>
          <span className="min-w-0">
            <DoseText option={dose} />
          </span>
        </button>
      ))}
      {all.length > doses.length ? (
        <p className="px-2 pt-0.5 text-[11px] text-pine-900/45">
          +{all.length - doses.length} {all.length - doses.length === 1 ? "opção" : "opções"} no cartão do medicamento
        </p>
      ) : null}
    </div>
  );
}

/**
 * "Receitas prontas": a lista por condição (resfriado, cistite, lombalgia…),
 * com busca por nome ou CID. Um clique acrescenta todos os medicamentos, já
 * com posologia, e o médico ajusta na lista.
 */
function ReadyPrescriptions({
  onPick,
  dragFor,
}: {
  onPick: (protocol: RxProtocol) => void;
  dragFor: (protocol: RxProtocol) => DragProps;
}) {
  const [filter, setFilter] = useState("");
  const found = searchProtocols(filter);

  return (
    <Popover
      className="group relative open:basis-full sm:open:basis-auto"
      summary="Receitas prontas"
      summaryClassName="-my-2 flex min-h-11 cursor-pointer items-center justify-end text-[11px] font-bold text-pine-600 hover:underline sm:my-0 sm:min-h-0"
    >
      <div className="mb-2 mt-1 max-h-[min(26rem,60dvh)] overflow-y-auto overscroll-contain rounded-2xl border border-[#e2dcec] bg-white p-2 shadow-lg sm:absolute sm:right-0 sm:z-40 sm:mb-0 sm:w-96">
        <div className="sticky -top-2 z-10 -mx-2 -mt-2 mb-1 space-y-1.5 rounded-t-2xl bg-white/95 px-2 pt-2 pb-1.5 backdrop-blur">
          <div className="flex items-center justify-between pl-2">
            <p className="text-[11px] font-bold text-pine-900/60">Receitas prontas por condição</p>
            <PopoverClose />
          </div>
          <input
            className="input py-1.5 text-[13px]"
            value={filter}
            placeholder="Buscar: otite, cistite, J01…"
            aria-label="Buscar receita pronta"
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        {found.length === 0 ? (
          <p className="px-2 py-3 text-[12.5px] text-pine-900/55">Nenhuma receita pronta com esse nome.</p>
        ) : (
          RX_PROTOCOL_GROUPS.map((group) => {
            const inGroup = found.filter((protocol) => protocol.group === group);
            if (inGroup.length === 0) return null;
            return (
              <div key={group} className="mb-2 last:mb-0">
                <p className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-pine-900/45">{group}</p>
                {inGroup.map((protocol) => (
                  <button
                    key={protocol.name}
                    type="button"
                    onClick={(event) => {
                      onPick(protocol);
                      setFilter("");
                      // Escolheu: o balão sai da frente da lista.
                      const details = event.currentTarget.closest("details");
                      if (details) details.open = false;
                    }}
                    {...dragFor(protocol)}
                    className="block min-h-11 w-full rounded-lg px-2 py-2 text-left hover:bg-pine-50 sm:min-h-0 sm:py-1.5"
                  >
                    <span className="block text-[12.5px] font-bold text-pine-950">
                      {protocol.name} <span className="font-normal text-pine-900/45">· {protocol.cid}</span>
                    </span>
                    <span className="block text-[11.5px] text-pine-900/55">
                      {protocol.items.map((i) => i.dose).join(" + ")}
                    </span>
                  </button>
                ))}
              </div>
            );
          })
        )}
        <p className="px-2 pt-1 text-[10.5px] text-pine-900/50">
          Ponto de partida para adulto sem comorbidade. Tudo entra na lista para você revisar e ajustar.
        </p>
      </div>
    </Popover>
  );
}

interface PosologyChoice {
  option: DoseOption;
  source: "sua" | "bula";
}

function IconCheck() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-3 w-3"
    >
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

function IconPencil() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-3.5 w-3.5"
    >
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

/**
 * A posologia do item, pensada para quem vai usar a sugestão: a escolhida
 * aparece pronta, num cartão; tocar nele abre as outras (as que o médico já
 * usou primeiro, depois as da bula). Escrever à mão fica atrás de um "Editar"
 * pequeno — e é o caminho direto quando não há sugestão nenhuma.
 */
function PosologyField({
  item,
  index,
  previous,
  onChange,
}: {
  item: PrescriptionItem;
  index: number;
  previous: FrequentItem[];
  onChange: (patch: Partial<PrescriptionItem>) => void;
}) {
  const choices = posologyChoices(item, previous);
  const current = choices.find((c) => c.option.posology === item.posology.trim()) ?? null;
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const listId = `rx-pos-lista-${index}`;
  const hasBula = choices.some((c) => c.source === "bula");

  // Sem nenhuma sugestão, o campo livre é o único caminho.
  const freeText = editing || choices.length === 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    listRef.current?.focus();
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (editing) textRef.current?.focus();
  }, [editing]);

  function openList() {
    const selected = current ? choices.indexOf(current) : -1;
    setActive(selected >= 0 ? selected : 0);
    setOpen(true);
  }

  function choose(choice: PosologyChoice) {
    onChange(applyDose(item, choice.option, current?.option));
    setOpen(false);
    setEditing(false);
    triggerRef.current?.focus();
  }

  function onListKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") setActive((i) => Math.min(i + 1, choices.length - 1));
    else if (event.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(choices.length - 1);
    else if (event.key === "Enter" || event.key === " ") choose(choices[active]);
    else if (event.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
      return;
    } else return;
    event.preventDefault();
  }

  return (
    <div className="mt-3" ref={boxRef}>
      <div className="flex items-center justify-between gap-2">
        <label
          className="label mb-0"
          htmlFor={freeText ? `rx-pos-${index}` : undefined}
          id={`rx-pos-rotulo-${index}`}
        >
          Posologia
        </label>
        {choices.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setEditing((e) => !e);
            }}
            aria-pressed={editing}
            className="-my-2 flex min-h-11 items-center gap-1 rounded-full px-2 text-[11.5px] font-bold text-pine-600 hover:bg-pine-50 sm:my-0 sm:min-h-7"
          >
            {editing ? (
              "Ver sugestões"
            ) : (
              <>
                <IconPencil />
                Editar
              </>
            )}
          </button>
        ) : null}
      </div>

      {freeText ? (
        <div className="mt-1.5">
          <textarea
            ref={textRef}
            className="input"
            id={`rx-pos-${index}`}
            rows={2}
            value={item.posology}
            placeholder="Tomar 1 comprimido de 8 em 8 horas por 7 dias"
            onChange={(e) => onChange({ posology: e.target.value })}
          />
          <PhrasePicker onPick={(phrase) => onChange({ posology: applyPhrase(phrase) })} />
        </div>
      ) : (
        <div className="relative mt-1.5">
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-labelledby={`rx-pos-rotulo-${index} rx-pos-atual-${index}`}
            onClick={() => (open ? setOpen(false) : openList())}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                openList();
              }
            }}
            className={`flex w-full items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-[border-color,box-shadow] focus-visible:ring-2 focus-visible:ring-pine-400 focus-visible:outline-none ${
              current
                ? "border-pine-300 bg-pine-50 hover:border-pine-400"
                : "border-dashed border-pine-300 bg-white hover:border-pine-400"
            } ${open ? "shadow-[0_0_0_3px_var(--color-pine-100)]" : ""}`}
          >
            <span
              aria-hidden
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                current ? "bg-pine-600 text-white" : "border-2 border-pine-300"
              }`}
            >
              {current ? <IconCheck /> : null}
            </span>
            <span className="min-w-0 flex-1" id={`rx-pos-atual-${index}`}>
              {item.posology.trim() ? (
                <span className="block text-[14px] font-semibold leading-snug text-pine-950">{item.posology}</span>
              ) : (
                <span className="block text-[14px] font-semibold text-pine-900/60">Escolha a posologia</span>
              )}
              <span className="mt-1 block text-[11.5px] text-pine-900/55">
                {current
                  ? choiceMeta(current, item.quantity)
                  : item.posology.trim()
                    ? "Escrita por você"
                    : `${choices.length} ${choices.length === 1 ? "opção pronta" : "opções prontas"}`}
              </span>
            </span>
            <span
              aria-hidden
              className={`mt-0.5 shrink-0 text-pine-600 transition-transform duration-150 motion-reduce:transition-none ${
                open ? "rotate-180" : ""
              }`}
            >
              <IconChevron />
            </span>
          </button>

          {open ? (
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={`rx-pos-rotulo-${index}`}
              aria-activedescendant={`${listId}-${active}`}
              onKeyDown={onListKey}
              className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-[min(22rem,55dvh)] animate-[menu-in_140ms_ease-out] overflow-y-auto overscroll-contain rounded-2xl border border-[#e2dcec] bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(61,14,107,0.35)] outline-none motion-reduce:animate-none"
            >
              {choices.map((choice, i) => {
                const selected = choice === current;
                const firstOfSource = i === 0 || choices[i - 1].source !== choice.source;
                return (
                  <li key={`${choice.source}|${choice.option.posology}`} role="presentation">
                    {firstOfSource ? (
                      <p className="px-2.5 pt-2 pb-1 text-[11px] font-bold text-pine-900/50">
                        {choice.source === "sua" ? "Como você já receitou" : "Da bula, dose de adulto"}
                      </p>
                    ) : null}
                    <div
                      id={`${listId}-${i}`}
                      role="option"
                      aria-selected={selected}
                      onPointerEnter={() => setActive(i)}
                      onClick={() => choose(choice)}
                      className={`flex min-h-11 cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2 ${
                        i === active ? "bg-pine-50" : ""
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          selected ? "bg-pine-600 text-white" : "border-2 border-pine-200"
                        }`}
                      >
                        {selected ? <IconCheck /> : null}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block text-[13px] leading-snug ${
                            selected ? "font-bold text-pine-950" : "font-semibold text-pine-900"
                          }`}
                        >
                          {choice.option.posology}
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-pine-900/50">{choiceMeta(choice)}</span>
                      </span>
                    </div>
                  </li>
                );
              })}
              <li role="presentation" className="mt-1 border-t border-[#f1ecf6] pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setEditing(true);
                  }}
                  className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-bold text-pine-600 hover:bg-pine-50"
                >
                  <IconPencil />
                  Escrever outra posologia
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      )}

      {hasBula && !freeText ? (
        <p className="mt-1.5 text-[11px] text-pine-900/50">Confira peso, idade, função renal e alergias antes de emitir.</p>
      ) : null}
    </div>
  );
}

/** Primeiro como o médico já receitou este medicamento, depois a bula, sem repetir frase. */
function posologyChoices(item: PrescriptionItem, previous: FrequentItem[]): PosologyChoice[] {
  const mine: PosologyChoice[] = previous.map(({ item: past }) => ({
    source: "sua",
    option: {
      posology: past.posology,
      quantity: past.quantity,
      route: past.route || "Via oral",
      continuous: past.continuous,
    },
  }));
  const seen = new Set(mine.map((c) => c.option.posology));
  const bula: PosologyChoice[] = suggestionsForItem(item)
    .filter((option) => !seen.has(option.posology))
    .map((option) => ({ source: "bula", option }));
  return [...mine, ...bula];
}

/** "7 dias, 21 cápsulas, via oral": a quantidade da receita quando a opção já está escolhida. */
function choiceMeta(choice: PosologyChoice, quantity?: string): string {
  const { option } = choice;
  const parts = [
    option.label,
    quantity?.trim() || option.quantity,
    option.route.toLowerCase(),
    option.continuous ? "uso contínuo" : null,
  ];
  return parts.filter(Boolean).join(", ");
}

/** Frases prontas (só redação, nunca dose), para quem escreve a posologia à mão. */
function PhrasePicker({ onPick }: { onPick: (phrase: string) => void }) {
  return (
    <Popover
      className="group relative mt-1"
      summary="Frases prontas"
      summaryClassName="-my-1 inline-flex min-h-11 cursor-pointer items-center text-[11.5px] font-bold text-pine-600 hover:underline sm:my-0 sm:min-h-0"
    >
      <div className="mt-1 max-h-72 overflow-y-auto overscroll-contain rounded-2xl border border-[#e2dcec] bg-white p-2 shadow-lg sm:absolute sm:left-0 sm:z-20 sm:w-80">
        <div className="sticky -top-2 z-10 -mx-2 -mt-2 mb-1 flex items-center justify-between rounded-t-2xl bg-white/95 py-0.5 pr-1 pl-4 backdrop-blur">
          <p className="text-[11px] font-bold text-pine-900/60">Frases prontas</p>
          <PopoverClose />
        </div>
        {POSOLOGY_GROUPS.map((group) => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="px-2 py-1 text-[11px] font-bold text-pine-900/50">{group.label}</p>
            {group.phrases.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={(event) => {
                  onPick(phrase);
                  // Escolheu a frase: o balão sai da frente do campo.
                  const details = event.currentTarget.closest("details");
                  if (details) details.open = false;
                }}
                className="block min-h-11 w-full rounded-lg px-2 py-2.5 text-left text-[12.5px] text-pine-900/80 hover:bg-pine-50 sm:min-h-0 sm:py-1.5"
              >
                {phrase}
              </button>
            ))}
          </div>
        ))}
      </div>
    </Popover>
  );
}
