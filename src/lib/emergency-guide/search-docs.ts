import type { SearchDoc } from "../smart-search.ts";
import { EMERGENCY_GUIDE } from "./data.ts";
import { plantaoSearchDoc } from "./search.ts";
import type { PlantaoDoc } from "./search.ts";
import type { GuideTopic } from "./types.ts";
import { CURRENT_REVISION } from "../guide-revisions.ts";
import { termsFor } from "../clinical-terms.ts";

/** Correções num tópico (as do texto e a do título). */
export function topicFixes(topic: GuideTopic): number {
  return topic.blocks.filter((b) => b.fix).length + (topic.fix ? 1 : 0);
}

/** Trechos que a revisão `rev` (por padrão, a última) corrigiu, marcou ou desmarcou. */
export function topicRevised(topic: GuideTopic, rev: number = CURRENT_REVISION): number {
  return topic.blocks.filter(
    (b) => b.fix?.rev === rev || b.noteRev === rev || b.notesEarlier?.some((n) => n.withdrawnRev === rev)
  ).length;
}

/** Um documento de busca por tópico do guia, montado no servidor. */
export function plantaoDocs(): PlantaoDoc[] {
  return EMERGENCY_GUIDE.flatMap((chapter) =>
    chapter.topics.map((topic) => ({
      slug: topic.slug,
      title: topic.title,
      chapter: chapter.title,
      fixes: topicFixes(topic),
      revised: topicRevised(topic),
      drugs: topic.blocks.filter((b) => b.k === "drug").map((b) => b.t),
      subs: topic.blocks.filter((b) => b.k === "sub").map((b) => b.t),
      ...termsFor(topic.title),
      lines: topic.blocks
        .filter((b) => b.k !== "plus" && b.k !== "grid" && b.t.length > 3)
        .map((b) => b.t)
        .concat(topic.blocks.flatMap((b) => (b.rows ? b.rows.map((r) => r.join(" · ")) : []))),
    }))
  );
}

export function plantaoSearchDocs(): SearchDoc[] {
  return plantaoDocs().map(plantaoSearchDoc);
}
