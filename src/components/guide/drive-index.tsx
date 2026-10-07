"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DriveDoc } from "@/lib/prescription-drive";
import { FilterChips } from "./filter-chips";
import { useGuideData } from "./guide-data";

/**
 * O Drive revisado para folhear: chips por seção e uma linha por condição com
 * os remédios da receita. O que a revisão mudou fica na página de cada
 * entrada (marca-texto e carrossel do histórico) e no "Revisões · ver mais"
 * do alto da aba. A busca fica no alto do Guia clínico e procura nas três
 * abas (guide-search.tsx).
 */
export function DriveIndex() {
  const docs = useGuideData().drive;
  const sections = useMemo(() => [...new Set(docs.map((d) => d.section))], [docs]);
  const [section, setSection] = useState<string | null>(null);
  return (
    <div>
      <FilterChips
        label="Seções"
        options={sections.map((sec) => ({ key: sec, count: docs.filter((d) => d.section === sec).length }))}
        total={docs.length}
        value={section}
        onChange={setSection}
      />
      <div className="space-y-6">
        {(section ? [section] : sections).map((sec) => (
          <section key={sec}>
            <h2 className="mb-2 text-xs font-extrabold tracking-[0.12em] text-pine-900/50 uppercase">{sec}</h2>
            <ul className="grid gap-2 lg:grid-cols-2">
              {docs
                .filter((d) => d.section === sec)
                .map((doc) => (
                  <li key={doc.slug} className="min-w-0">
                    <DriveRow doc={doc} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Uma condição: nome, CID e os remédios da receita. */
function DriveRow({ doc }: { doc: DriveDoc }) {
  const drugs = [...new Set(doc.drugs)].slice(0, 3).join(" · ");
  return (
    <Link
      href={`/guia/drive/${doc.slug}`}
      className="flex h-full min-w-0 flex-col rounded-2xl border border-pine-900/10 bg-white px-4 py-3 transition-colors hover:border-pine-400 hover:bg-pine-50/40"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 text-[15px] leading-snug font-bold break-words text-pine-950">{doc.title}</span>
        {doc.cid ? <span className="chip shrink-0 bg-pine-50 text-[11px] text-pine-800 tabular-nums">{doc.cid}</span> : null}
      </span>
      {drugs ? <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-pine-900/55">{drugs}</span> : null}
    </Link>
  );
}
