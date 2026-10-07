"use client";

import { useId, useState } from "react";
import type { ReactNode } from "react";
import type { GuideRecipe } from "@/lib/guide-search";
import type { RxProtocolGroup } from "@/lib/rx-library/types";
import { TARJA_LABEL } from "@/lib/medications";
import { highlight } from "@/lib/smart-search";
import { Highlighted } from "./smart-search-input";
import { FilterChips } from "./filter-chips";
import { SEE_MORE_ITEM } from "./review-history";
import { RevisionCarousel } from "./revision-carousel";
import { useGuideData } from "./guide-data";

/**
 * As receitas prontas para folhear: chips por grupo e, em cada grupo, uma
 * linha por condição — nome, CID e os remédios — que abre a receita como sai
 * no papel (o que mudou desde a publicação com marca-texto e, embaixo, o
 * carrossel do histórico) e a orientação ao paciente. A busca fica no alto
 * do Guia clínico e procura nas três abas (guide-search.tsx).
 */
export function ClinicalGuide({ groups }: { groups: readonly RxProtocolGroup[] }) {
  const entries = useGuideData().receitas;
  const [group, setGroup] = useState<RxProtocolGroup | null>(null);
  return (
    <div>
      <FilterChips
        label="Grupos"
        options={groups.map((g) => ({ key: g, count: entries.filter((e) => e.group === g).length }))}
        total={entries.length}
        value={group}
        onChange={(g) => setGroup(g as RxProtocolGroup | null)}
      />
      <div className="space-y-6">
        {(group ? [group] : groups).map((g) => {
          const rows = entries.filter((e) => e.group === g);
          if (rows.length === 0) return null;
          return (
            <section key={g}>
              <h2 className="mb-2 text-xs font-extrabold tracking-[0.12em] text-pine-900/50 uppercase">{g}</h2>
              <ul className="grid items-start gap-2 lg:grid-cols-2">
                {rows.map((entry) => (
                  <li key={entry.name} className="min-w-0">
                    <GuideRow entry={entry} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Uma condição: fechada, nome, CID e remédios; aberta, a receita, a orientação e o histórico. */
export function GuideRow({
  entry,
  terms = [],
  onUse,
  meta,
  line,
  buttonId,
  active = false,
  onHover,
  defaultOpen = false,
}: {
  entry: GuideRecipe;
  /** Palavras da busca que casaram, em destaque no nome. */
  terms?: readonly string[];
  onUse?(): void;
  /** Linha embaixo do nome (na busca: a fonte e o grupo). */
  meta?: ReactNode;
  /** No lugar dos remédios, fechada: o trecho que casou com a busca. */
  line?: ReactNode;
  /** Para a busca abrir esta linha pelo teclado (Enter). */
  buttonId?: string;
  /** A linha escolhida com ↑ ↓ na busca. */
  active?: boolean;
  onHover?(): void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [orientation, setOrientation] = useState(false);
  const panelId = useId();
  return (
    <article
      onMouseEnter={onHover}
      className={`min-w-0 rounded-2xl border bg-white transition-colors ${
        open
          ? "border-pine-300 shadow-[0_10px_28px_-20px_rgba(61,14,107,0.4)]"
          : active
            ? "border-pine-400 bg-pine-50/40"
            : "border-pine-900/10 hover:border-pine-400"
      }`}
    >
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-current={active ? "true" : undefined}
        onClick={() => {
          if (!open) onUse?.();
          setOpen((v) => !v);
        }}
        className="flex w-full min-w-0 items-start gap-3 rounded-2xl px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug font-bold break-words text-pine-950">
            <Highlighted parts={highlight(entry.name, terms)} />
          </span>
          {meta}
          {!open ? (
            <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-pine-900/55">
              {line ?? entry.items.map((i) => i.name).join(" · ")}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
          <span className="chip bg-pine-50 text-pine-800 tabular-nums">{entry.cid}</span>
          <span aria-hidden className={`text-lg leading-none text-pine-400 transition-transform ${open ? "rotate-90" : ""}`}>
            ›
          </span>
        </span>
      </button>

      {open ? (
        <div id={panelId} className="px-4 pb-4">
          <ol className="space-y-2.5 border-t border-pine-900/8 pt-3">
            {entry.items.map((item, i) => (
              <li key={`${item.name}-${i}`} className="flex gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pine-100 text-[11px] font-extrabold text-pine-800">
                  {i + 1}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="font-bold text-pine-950">
                    <Mark on={entry.marked[i]}>{item.name}</Mark> <span className="font-semibold text-pine-900/45">· {item.quantity}</span>
                  </p>
                  <p className="mt-0.5 leading-snug text-pine-900/70">
                    <Mark on={entry.marked[i]}>{item.posology}</Mark>
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-semibold text-pine-900/45">
                    {item.route}
                    {item.tarja !== "livre" ? ` · ${TARJA_LABEL[item.tarja]}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          {entry.history ? <RevisionCarousel slides={entry.history.slides} /> : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
            {entry.orientation ? (
              <button type="button" aria-expanded={orientation} onClick={() => setOrientation((v) => !v)} className={SEE_MORE_ITEM}>
                {orientation ? "Esconder" : "Ver"} orientação ao paciente
              </button>
            ) : null}
          </div>

          {orientation && entry.orientation ? (
            <div className="mt-2 rounded-2xl bg-pine-50/60 p-3.5">
              <p className="text-[11px] font-bold tracking-[0.12em] text-pine-900/50 uppercase">{entry.orientation.name}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-pine-900/75">{entry.orientation.text}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

/** Marca-texto no que mudou desde o original. */
function Mark({ on, children }: { on: boolean; children: ReactNode }) {
  return on ? <mark className="rev-mark">{children}</mark> : <>{children}</>;
}
