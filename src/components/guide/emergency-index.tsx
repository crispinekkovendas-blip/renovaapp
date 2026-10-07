"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PlantaoDoc } from "@/lib/emergency-guide/search";
import { FilterChips } from "./filter-chips";
import { useGuideData } from "./guide-data";

/** "Noradrenalina (2 mg/ml - ampola de 4ml)" → "Noradrenalina": só o nome, para caber no cartão. */
function shortDrug(drug: string): string {
  return drug.replace(/^\d+[.)]\s*/, "").split(/\s[([–-]|\s\d/)[0].trim();
}

/**
 * O guia de plantão para folhear: chips por capítulo e os tópicos de cada um.
 * A busca fica no alto do Guia clínico e procura nas três abas
 * (guide-search.tsx).
 */
export function EmergencyIndex() {
  const docs = useGuideData().plantao;
  const chapters = useMemo(() => [...new Set(docs.map((d) => d.chapter))], [docs]);
  const [chapter, setChapter] = useState<string | null>(null);
  return (
    <div>
      <FilterChips
        label="Capítulos"
        options={chapters.map((c) => ({ key: c, count: docs.filter((d) => d.chapter === c).length }))}
        total={docs.length}
        value={chapter}
        onChange={setChapter}
      />
      <ChapterGrid docs={docs} chapters={chapter ? [chapter] : chapters} />
    </div>
  );
}

function ChapterGrid({ docs, chapters }: { docs: readonly PlantaoDoc[]; chapters: readonly string[] }) {
  return (
    <div className="space-y-5">
      {chapters.map((chapter) => (
        <section key={chapter}>
          <h2 className="mb-2 text-xs font-extrabold tracking-[0.12em] text-pine-900/50 uppercase">{chapter}</h2>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {docs
              .filter((d) => d.chapter === chapter)
              .map((d) => {
                const preview = [...new Set(d.drugs.map(shortDrug))].slice(0, 2).join(" · ");
                return (
                  <li key={d.slug} className="min-w-0">
                    <Link
                      href={`/guia/plantao/${d.slug}`}
                      className="flex h-full min-h-14 min-w-0 flex-col justify-center rounded-2xl border border-pine-900/10 bg-white px-4 py-2.5 transition-colors hover:border-pine-400 hover:bg-pine-50/40"
                    >
                      <span className="text-[14px] leading-snug font-bold break-words text-pine-950">{d.title}</span>
                      {preview ? <span className="mt-0.5 truncate text-[11.5px] text-pine-900/55">{preview}</span> : null}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
