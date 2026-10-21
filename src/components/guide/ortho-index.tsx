"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OrthoDoc } from "@/lib/ortho-guide";
import { orthoSearchDoc } from "@/lib/ortho-guide";
import { FIRST_DAY } from "@/lib/ortho-guide";
import { highlight } from "@/lib/smart-search";
import { FilterChips } from "./filter-chips";
import { SmartSearchInput } from "./smart-search-input";
import { useSmartSearch } from "./use-smart-search";

/**
 * O Guia de ortopedia para folhear: os atalhos do primeiro dia, a busca
 * (nome popular, manobra, remédio ou CID) e os tópicos por capítulo. A
 * busca é só desta aba — a busca única do Guia clínico ainda não a inclui.
 */
export function OrthoIndex({ docs }: { docs: readonly OrthoDoc[] }) {
  const searchDocs = useMemo(() => docs.map(orthoSearchDoc), [docs]);
  const s = useSmartSearch("guia:ortopedia", searchDocs, { urlKey: "/guia/ortopedia" });
  const bySlug = useMemo(() => new Map(docs.map((d) => [d.slug, d])), [docs]);
  const chapters = useMemo(() => [...new Set(docs.map((d) => d.chapter))], [docs]);
  const [chapter, setChapter] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const q = s.query.trim();
  const hits = useMemo(() => s.hits.map((h) => ({ doc: bySlug.get(h.id)!, terms: h.terms })).filter((h) => h.doc), [s.hits, bySlug]);

  const move = (delta: number) => {
    const next = Math.max(0, Math.min(hits.length - 1, active + delta));
    setActive(next);
    document.getElementById(`ortho-hit-${next}`)?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 bg-paper/95 px-4 pt-1 pb-3 backdrop-blur-sm sm:mx-0 sm:px-0">
        <SmartSearchInput
          label="Buscar no Guia de ortopedia"
          placeholder="Como o paciente fala, manobra, remédio ou CID: “torceu o pé”, “Lachman”, “joanete”"
          query={s.query}
          onQuery={(v) => {
            s.setQuery(v);
            setActive(0);
          }}
          ghost={s.ghost}
          recent={s.recent}
          onForgetRecent={s.forgetRecent}
          onMove={move}
          onEnter={() => document.getElementById(`ortho-hit-${active}`)?.click()}
        />
      </div>

      {q ? (
        <div role="listbox" aria-label="Resultados" className="space-y-2">
          <p className="text-xs text-pine-900/50">
            {!s.ready
              ? "Preparando a busca…"
              : hits.length === 0
                ? `Nada encontrado para “${q}” no Guia de ortopedia.`
                : `${hits.length} ${hits.length === 1 ? "resultado" : "resultados"} · ↑ ↓ e Enter para abrir · Tab completa a palavra`}
            {s.suggestion && s.suggestion !== q ? (
              <>
                {" "}
                · Você quis dizer{" "}
                <button type="button" className="font-bold text-pine-600 hover:underline" onClick={() => s.setQuery(s.suggestion!)}>
                  {s.suggestion}
                </button>
                ?
              </>
            ) : null}
          </p>
          {hits.map(({ doc, terms }, i) => (
            <Link
              key={doc.slug}
              id={`ortho-hit-${i}`}
              role="option"
              aria-selected={i === active}
              href={`/guia/ortopedia/${doc.slug}`}
              onClick={() => s.pick(doc.slug)}
              onMouseEnter={() => setActive(i)}
              className={`block rounded-2xl border bg-white px-4 py-3 transition-colors ${
                i === active ? "border-pine-400 bg-pine-50/40" : "border-pine-900/10 hover:border-pine-400"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[15px] leading-snug font-bold text-pine-950">
                  <Highlighted text={doc.title} terms={terms} />
                </span>
                <span className="chip bg-amber-100 text-amber-900">Ortopedia</span>
                {doc.cid !== "—" ? <span className="chip bg-pine-50 text-pine-800 tabular-nums">{doc.cid}</span> : null}
              </div>
              <p className="mt-0.5 text-[11.5px] font-semibold text-pine-900/50">{doc.chapter}</p>
              <p className="mt-1 text-[13px] leading-snug text-pine-900/75">
                <Highlighted text={doc.summary} terms={terms} />
              </p>
              {doc.aliases.some((a) => terms.some((t) => a.toLowerCase().includes(t))) ? (
                <p className="mt-1 text-[12px] text-pine-900/55">
                  Também: <Highlighted text={doc.aliases.join(" · ")} terms={terms} />
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <>
          <FirstDay bySlug={bySlug} />
          <FilterChips
            label="Capítulos"
            options={chapters.map((c) => ({ key: c, count: docs.filter((d) => d.chapter === c).length }))}
            total={docs.length}
            value={chapter}
            onChange={setChapter}
          />
          <ChapterGrid docs={docs} chapters={chapter ? [chapter] : chapters} />
        </>
      )}
    </div>
  );
}

function Highlighted({ text, terms }: { text: string; terms: readonly string[] }) {
  if (terms.length === 0) return <>{text}</>;
  return (
    <>
      {highlight(text, terms).map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded bg-sun-300/60 px-0.5 text-inherit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </>
  );
}

/** Os cinco tópicos de base, na ordem de leitura do primeiro dia. */
function FirstDay({ bySlug }: { bySlug: Map<string, OrthoDoc> }) {
  return (
    <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 sm:p-4">
      <h2 className="text-xs font-extrabold tracking-[0.12em] text-amber-900 uppercase">Primeiro dia — leia nesta ordem</h2>
      <ol className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-5">
        {FIRST_DAY.map((s, i) => {
          const doc = bySlug.get(s.slug);
          if (!doc) return null;
          return (
            <li key={s.slug} className="min-w-0">
              <Link
                href={`/guia/ortopedia/${s.slug}`}
                className="flex h-full min-w-0 items-start gap-2 rounded-xl border border-amber-200/80 bg-white px-3 py-2.5 transition-colors hover:border-amber-400 sm:flex-col sm:gap-1"
              >
                <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-900 text-[12px] font-extrabold text-white">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] leading-snug font-bold text-pine-950">{s.label}</span>
                  <span className="block text-[11.5px] text-pine-900/55">{s.hint}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ChapterGrid({ docs, chapters }: { docs: readonly OrthoDoc[]; chapters: readonly string[] }) {
  return (
    <div className="space-y-5">
      {chapters.map((chapter) => (
        <section key={chapter}>
          <h2 className="mb-2 text-xs font-extrabold tracking-[0.12em] text-pine-900/50 uppercase">{chapter}</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {docs
              .filter((d) => d.chapter === chapter)
              .map((d) => (
                <li key={d.slug} className="min-w-0">
                  <Link
                    href={`/guia/ortopedia/${d.slug}`}
                    className="flex h-full min-h-14 min-w-0 flex-col justify-center rounded-2xl border border-pine-900/10 bg-white px-4 py-2.5 transition-colors hover:border-pine-400 hover:bg-pine-50/40"
                  >
                    <span className="text-[14px] leading-snug font-bold break-words text-pine-950">{d.title}</span>
                    <span className="mt-0.5 truncate text-[11.5px] text-pine-900/55">{d.aliases.slice(0, 3).join(" · ")}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
