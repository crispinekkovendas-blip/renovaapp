"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { highlight } from "@/lib/smart-search";
import { SOURCE_TAG, TAB_SOURCE, cidMatches, guideItems, guideSearchDocs, orderHits, resultSnippet } from "@/lib/guide-search";
import type { GuideItem, GuideSource } from "@/lib/guide-search";
import { useGuideData } from "./guide-data";
import { useSmartSearch } from "./use-smart-search";
import { Highlighted, SmartSearchInput } from "./smart-search-input";
import { FilterChips } from "./filter-chips";
import { GuideAsk } from "./guide-ask";
import { GuideRow } from "./clinical-guide";

/** A busca única herda a memória das três buscas antigas, uma por aba. */
const INHERIT = [
  { scope: "receitas", prefix: "receitas:" },
  { scope: "plantao", prefix: "plantao:" },
  { scope: "drive", prefix: "drive:" },
] as const;

const SOURCES: readonly GuideSource[] = ["receitas", "plantao", "drive"];

/** O nome de cada fonte no filtro dos resultados. */
const FILTER_LABEL: Readonly<Record<GuideSource, string>> = { receitas: "Receitas prontas", plantao: "Plantão", drive: "Drive" };

/** Uma cor por fonte, para bater o olho na lista misturada. */
const PILL: Readonly<Record<GuideSource, string>> = {
  receitas: "bg-emerald-100 text-emerald-800",
  plantao: "bg-rose-100 text-rose-800",
  drive: "bg-sky-100 text-sky-800",
};

const MAX_RESULTS = 60;

/**
 * Uma busca só para o Guia clínico, no alto das três abas: procura nas
 * receitas prontas, no plantão e no Drive ao mesmo tempo e mostra tudo numa
 * lista, cada resultado com a fonte. Vazia, a aba mostra o que tem para
 * folhear; com texto, a lista toma o lugar da aba. Na mesma relevância, a aba
 * aberta vem antes.
 *
 * Mora no layout da seção: na troca de aba nada é baixado de novo, e a busca
 * volta a ser a da URL (?q=) — trocar de aba limpa, voltar do tópico devolve
 * os resultados. A pergunta à Super Inteligência feita daqui também fica
 * aberta enquanto o médico confere uma fonte e volta.
 */
export function GuideSearch({
  aiEnabled,
  aiOffReason,
  children,
}: {
  aiEnabled: boolean;
  /** Só para administrador: por que a IA não aparece (ex.: chave não configurada). */
  aiOffReason: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const tab = TAB_SOURCE[pathname] ?? null;
  const data = useGuideData();
  const docs = useMemo(() => guideSearchDocs(data), [data]);
  const items = useMemo(() => guideItems(data), [data]);
  const s = useSmartSearch("guia", docs, { urlKey: pathname, inherit: INHERIT });
  const q = s.query.trim();
  const searching = tab !== null && q.length > 0;
  const [source, setSource] = useState<GuideSource | null>(null);
  const [active, setActive] = useState(0);
  const [asking, setAsking] = useState<string | null>(null);
  const rowId = useId();
  const canAsk = aiEnabled && q.length >= 3;

  useEffect(() => setActive(0), [q, source]);
  useEffect(() => {
    if (!q) setSource(null);
  }, [q]);

  const ranked = useMemo(() => {
    if (!q) return [];
    const byCid = cidMatches(data, q);
    const seen = new Set(byCid);
    return [...byCid.map((id) => ({ id, terms: [] as string[], complete: true })), ...orderHits(s.hits, tab).filter((h) => !seen.has(h.id))]
      .slice(0, MAX_RESULTS)
      .flatMap((r) => {
        const item = items.get(r.id);
        return item ? [{ item, terms: r.terms, complete: r.complete }] : [];
      });
  }, [q, data, s.hits, tab, items]);

  const counts = useMemo(() => {
    const c: Record<GuideSource, number> = { receitas: 0, plantao: 0, drive: 0 };
    for (const r of ranked) c[r.item.source]++;
    return c;
  }, [ranked]);
  const present = SOURCES.filter((src) => counts[src] > 0);
  // Fonte escolhida que sumiu com a nova busca: volta a mostrar tudo.
  const filter = source && counts[source] > 0 ? source : null;
  const shown = filter ? ranked.filter((r) => r.item.source === filter) : ranked;

  const move = (delta: number) => {
    const next = Math.max(0, Math.min(shown.length - 1, active + delta));
    setActive(next);
    document.getElementById(`${rowId}-${next}`)?.scrollIntoView({ block: "nearest" });
  };

  return (
    <>
      <div className={tab ? "mx-auto max-w-5xl" : "hidden"}>
        {tab ? (
          <div className="sticky top-0 z-10 -mx-4 bg-[#faf8fc]/95 px-4 pt-1 pb-3 backdrop-blur-sm sm:mx-0 sm:px-0">
            <SmartSearchInput
              label="Buscar no Guia clínico: receitas prontas, plantão e Drive"
              placeholder="Busca em tudo: condição, remédio, sintoma ou CID"
              query={s.query}
              onQuery={s.setQuery}
              ghost={s.ghost}
              recent={s.recent}
              onForgetRecent={s.forgetRecent}
              onMove={move}
              onEnter={() => {
                if (canAsk && q.endsWith("?")) setAsking(q);
                else document.getElementById(`${rowId}-${active}`)?.click();
              }}
            />
            {canAsk && asking !== q ? (
              <button
                type="button"
                onClick={() => setAsking(q)}
                className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full bg-pine-950 px-3.5 py-2 text-left text-[13px] font-bold text-white hover:bg-pine-900 pointer-coarse:min-h-11"
              >
                <span aria-hidden>✨</span>
                <span className="truncate">Perguntar ao guia: “{q}”</span>
              </button>
            ) : null}
            {searching && s.ready ? (
              <p className="mt-1.5 px-1 text-[11.5px] text-pine-900/50" aria-live="polite">
                {ranked.length === 0
                  ? "Nada encontrado nas três abas."
                  : `${ranked.length} ${ranked.length === 1 ? "resultado" : "resultados"} em receitas, plantão e Drive · ↑ ↓ e Enter para abrir · Tab completa a palavra`}
              </p>
            ) : null}
          </div>
        ) : null}
        {tab && !aiEnabled && aiOffReason ? (
          <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-900">
            Super Inteligência desligada: {aiOffReason} (aviso visível só para administradores)
          </p>
        ) : null}
        {/* Sempre neste lugar da árvore: a resposta não se perde quando o médico abre uma fonte e volta. */}
        {asking ? (
          <div className="mb-4">
            <GuideAsk key={asking} question={asking} onClose={() => setAsking(null)} />
          </div>
        ) : null}
        {searching ? (
          !s.ready ? (
            <p className="px-1 py-6 text-sm text-pine-900/50">Preparando a busca…</p>
          ) : ranked.length === 0 ? (
            <div className="card px-5 py-8 text-center text-sm text-pine-900/60">
              <p>Nada encontrado para “{q}” nas receitas prontas, no plantão nem no Drive.</p>
              {s.suggestion ? (
                <p className="mt-2">
                  Você quis dizer{" "}
                  <button type="button" onClick={() => s.setQuery(s.suggestion ?? "")} className="font-bold text-pine-600 hover:underline">
                    {s.suggestion}
                  </button>
                  ?
                </p>
              ) : null}
            </div>
          ) : (
            <div className={`transition-opacity ${s.stale ? "opacity-60" : ""}`}>
              {present.length > 1 ? (
                <FilterChips
                  label="Fonte dos resultados"
                  options={present.map((src) => ({ key: FILTER_LABEL[src], count: counts[src] }))}
                  total={ranked.length}
                  value={filter ? FILTER_LABEL[filter] : null}
                  onChange={(label) => setSource(SOURCES.find((src) => FILTER_LABEL[src] === label) ?? null)}
                />
              ) : null}
              <ol className="space-y-2">
                {shown.map((r, i) => (
                  <li key={r.item.id} className="scroll-mt-36">
                    <ResultRow
                      item={r.item}
                      terms={r.terms}
                      query={q}
                      complete={r.complete}
                      id={`${rowId}-${i}`}
                      active={i === active}
                      // A receita com o nome exato (link da Super Inteligência) ou o único resultado já abre.
                      autoOpen={shown.length === 1 || (r.item.source === "receitas" && r.item.entry.name.toLowerCase() === q.toLowerCase())}
                      onPick={() => s.pick(r.item.id)}
                      onHover={() => setActive(i)}
                    />
                  </li>
                ))}
              </ol>
            </div>
          )
        ) : null}
      </div>
      <div hidden={searching}>{children}</div>
    </>
  );
}

/** Um resultado: a receita abre ali mesmo; o tópico do plantão e a entrada do Drive abrem a página deles. */
function ResultRow({
  item,
  terms,
  query,
  complete,
  id,
  active,
  autoOpen,
  onPick,
  onHover,
}: {
  item: GuideItem;
  terms: readonly string[];
  query: string;
  complete: boolean;
  id: string;
  active: boolean;
  autoOpen: boolean;
  onPick(): void;
  onHover(): void;
}) {
  const title = item.source === "receitas" ? item.entry.name : item.doc.title;
  const where = item.source === "receitas" ? item.entry.group : item.source === "plantao" ? item.doc.chapter : item.doc.section;
  // Achou pelo remédio, pelo nome popular ou pelo sintoma: mostra a linha que explica o porquê.
  const { line, marks } = resultSnippet(item, terms, query);
  const snippet = line ? <Highlighted parts={highlight(line, marks)} /> : null;
  const meta = (
    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] font-semibold text-pine-900/45">
      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${PILL[item.source]}`}>{SOURCE_TAG[item.source]}</span>
      <span>{where}</span>
      {!complete ? <span className="text-amber-700">casa com parte da busca</span> : null}
    </span>
  );

  if (item.source === "receitas") {
    return (
      <GuideRow
        entry={item.entry}
        terms={marks}
        meta={meta}
        line={snippet ?? undefined}
        buttonId={id}
        active={active}
        onHover={onHover}
        onUse={onPick}
        defaultOpen={autoOpen}
      />
    );
  }
  const cid = item.source === "drive" ? item.doc.cid : null;
  return (
    <Link
      id={id}
      href={item.source === "plantao" ? `/guia/plantao/${item.doc.slug}` : `/guia/drive/${item.doc.slug}`}
      onClick={onPick}
      onMouseEnter={onHover}
      aria-current={active ? "true" : undefined}
      className={`block min-w-0 rounded-2xl border bg-white px-4 py-3 transition-colors ${
        active ? "border-pine-400 bg-pine-50/40" : "border-pine-900/10 hover:border-pine-400"
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[15px] leading-snug font-bold break-words text-pine-950">
          <Highlighted parts={highlight(title, marks)} />
        </span>
        {cid ? <span className="chip shrink-0 bg-pine-50 text-[11px] text-pine-800 tabular-nums">{cid}</span> : null}
      </span>
      {meta}
      {snippet ? <span className="mt-1 line-clamp-2 block text-[13px] leading-snug break-words text-pine-900/65">{snippet}</span> : null}
    </Link>
  );
}
