import { EMERGENCY_GUIDE } from "./data.ts";
import type { GuideChapter, GuideTopic } from "./types.ts";
import type { GuideTopicRef } from "./search.ts";
import { topicFixes, topicRevised } from "./search-docs.ts";
import { conciseDiff, fullLine } from "../revision-diff.ts";
import type { ConciseLine } from "../revision-diff.ts";
import type { ChangeSlide, RevisionHistory, RevisionSlide } from "../revision-slides.ts";
import type { GuideBlock } from "./types.ts";

export type { GuideBlock, GuideBlockKind, GuideChapter, GuideFix, GuideTopic } from "./types.ts";
export type { GuideTopicRef, PlantaoDoc } from "./search.ts";
export { plantaoDocs, topicFixes, topicRevised } from "./search-docs.ts";
export { EMERGENCY_GUIDE };

/**
 * Plantão e emergência: o Guia de Prescrições da Emergência inteiro, para o
 * médico consultar no hospital. O texto é o dos autores, reproduzido com
 * autorização; o que a revisão da Renova corrigiu fica marcado no próprio
 * trecho (texto original + motivo), e o que pede conferência leva um aviso.
 */
export const GUIDE_CREDIT = {
  title: "Guia de Prescrições da Emergência",
  edition: "2ª edição",
  publisher: "PS Zerado",
  authors: [
    "Beatriz Fernanda da Silva",
    "Isis Souza Ferreira",
    "Lucas Facio Rezende",
    "Tammer Ferreira Zogheib",
    "Victor Vasconcellos de Moraes Leme",
    "Rafael da Silva Araujo",
    "Diego Rangel Sobral",
    "Felipe Skiresinski Gonçalves de Oliveira",
    "David Jordão Smokou",
    "João Victor Balestreri Trevisol",
    "Amanda Azevedo Torres",
    "Matheus Severnini Fassarella",
    "Rodolfo Belz Antoniazzi",
  ],
  reviewedAt: "30 de setembro de 2026",
} as const;

/** Uma mudança do guia, para o histórico de revisões: antes, depois e motivo. */
export interface PlantaoChange {
  rev: number;
  slug: string;
  topic: string;
  chapter: string;
  kind: "fix" | "note" | "withdrawn";
  before: string | null;
  after: string;
  why: string;
  /** Só o que mudou: o trecho trocado (correção) ou a primeira frase (aviso). */
  concise: ConciseLine[];
}

let CHANGES: readonly PlantaoChange[] | null = null;

/** Todas as mudanças do guia, com o texto de antes e o de depois de cada uma (o guia é fixo: calcula uma vez). */
export function plantaoChanges(): readonly PlantaoChange[] {
  CHANGES ??= collectChanges();
  return CHANGES;
}

function collectChanges(): PlantaoChange[] {
  const out: PlantaoChange[] = [];
  for (const { chapter, topic } of FLAT) {
    const base = { slug: topic.slug, topic: topic.title, chapter: chapter.title };
    for (const b of topic.blocks) {
      const chain = [...(b.earlier ?? []), ...(b.fix ? [b.fix] : [])];
      chain.forEach((f, i) => {
        const after = chain[i + 1]?.orig ?? b.t;
        out.push({ ...base, rev: f.rev ?? 1, kind: "fix", before: f.orig, after, why: f.why, concise: [{ parts: conciseDiff(f.orig, after) }] });
      });
      for (const n of b.notesEarlier ?? []) {
        out.push({ ...base, rev: n.rev, kind: "note", before: null, after: n.note, why: b.t, concise: [fullLine(n.note, "Aviso")] });
        if (n.withdrawn && !n.replaced) {
          out.push({
            ...base,
            rev: n.withdrawnRev ?? n.rev,
            kind: "withdrawn",
            before: n.note,
            after: b.t,
            why: n.withdrawn,
            concise: [fullLine(n.note, "Aviso retirado", "del")],
          });
        }
      }
      if (b.note) {
        // Aviso que substituiu outro: o anterior vai como "antes".
        const replaced = (b.notesEarlier ?? []).find((n) => n.replaced && n.withdrawnRev === (b.noteRev ?? 1));
        out.push({
          ...base,
          rev: b.noteRev ?? 1,
          kind: "note",
          before: replaced ? replaced.note : null,
          after: b.note,
          why: b.t,
          concise: [fullLine(b.note, replaced ? "Aviso trocado" : "Aviso")],
        });
      }
    }
  }
  return out;
}

/**
 * O histórico de um trecho para o carrossel: o texto do PDF do guia, depois
 * cada correção, aviso e aviso retirado, na ordem das revisões. Null se o
 * trecho nunca mudou.
 */
export function blockHistory(block: GuideBlock, page: number): RevisionHistory | null {
  const chain = [...(block.earlier ?? []), ...(block.fix ? [block.fix] : [])];
  const earlierNotes = block.notesEarlier ?? [];
  if (chain.length === 0 && !block.note && earlierNotes.length === 0) return null;
  // As versões do texto: a do PDF, a de cada correção e a de agora.
  const versions = [...chain.map((f) => f.orig), block.t];
  const events: { rev: number; order: number; slide: ChangeSlide }[] = chain.map((f, i) => ({
    rev: f.rev ?? 1,
    order: 0,
    slide: { kind: "change", rev: f.rev ?? 1, concise: [{ parts: conciseDiff(versions[i], versions[i + 1]) }], why: f.why, tone: "fix" },
  }));
  for (const n of earlierNotes) {
    events.push({ rev: n.rev, order: 2, slide: { kind: "change", rev: n.rev, concise: [fullLine(n.note, "Aviso")], tone: "note" } });
    if (n.withdrawn) {
      const rev = n.withdrawnRev ?? n.rev;
      const label = n.replaced ? "Aviso trocado" : "Aviso retirado";
      events.push({ rev, order: 1, slide: { kind: "change", rev, concise: [fullLine(n.note, label, "del")], why: n.withdrawn, tone: "withdrawn" } });
    }
  }
  const current: ChangeSlide | null = block.note
    ? { kind: "change", rev: block.noteRev ?? 1, concise: [fullLine(block.note, "⚠ Conferir")], tone: "note" }
    : null;
  if (current) events.push({ rev: current.rev, order: 2, slide: current });
  events.sort((a, b) => a.rev - b.rev || a.order - b.order);
  const slides: RevisionSlide[] = [
    { kind: "original", source: `${GUIDE_CREDIT.title} · p. ${page}`, lines: [versions[0]] },
    ...events.map((e) => e.slide),
  ];
  return { slides, alert: current ? slides.indexOf(current) : null };
}

/** O título do tópico, quando a revisão o corrigiu. */
export function titleHistory(topic: GuideTopic): RevisionHistory | null {
  if (!topic.fix) return null;
  return {
    slides: [
      { kind: "original", source: `${GUIDE_CREDIT.title} · p. ${topic.page}`, lines: [topic.fix.orig] },
      { kind: "change", rev: 1, concise: [{ parts: conciseDiff(topic.fix.orig, topic.title) }], why: topic.fix.why, tone: "fix" },
    ],
    alert: null,
  };
}

export interface GuideLocation {
  chapter: GuideChapter;
  topic: GuideTopic;
  prev: GuideTopicRef | null;
  next: GuideTopicRef | null;
}

const FLAT: readonly { chapter: GuideChapter; topic: GuideTopic }[] = EMERGENCY_GUIDE.flatMap((chapter) =>
  chapter.topics.map((topic) => ({ chapter, topic }))
);

function ref(entry: { chapter: GuideChapter; topic: GuideTopic } | undefined): GuideTopicRef | null {
  return entry
    ? {
        slug: entry.topic.slug,
        title: entry.topic.title,
        chapter: entry.chapter.title,
        fixes: topicFixes(entry.topic),
        revised: topicRevised(entry.topic),
      }
    : null;
}

export function findGuideTopic(slug: string): GuideLocation | null {
  const i = FLAT.findIndex((e) => e.topic.slug === slug);
  if (i < 0) return null;
  return { ...FLAT[i], prev: ref(FLAT[i - 1]), next: ref(FLAT[i + 1]) };
}

export function guideSlugs(): string[] {
  return FLAT.map((e) => e.topic.slug);
}

export function guideStats() {
  const topics = FLAT.length;
  const fixes = FLAT.reduce((n, e) => n + topicFixes(e.topic), 0);
  const notes = FLAT.reduce((n, e) => n + e.topic.blocks.filter((b) => b.note).length, 0);
  const byRev = (rev: number) => {
    const changes = plantaoChanges().filter((c) => c.rev === rev);
    return {
      fixes: changes.filter((c) => c.kind === "fix").length,
      notes: changes.filter((c) => c.kind === "note").length,
      withdrawn: changes.filter((c) => c.kind === "withdrawn").length,
      topics: new Set(changes.map((c) => c.slug)).size,
    };
  };
  return { chapters: EMERGENCY_GUIDE.length, topics, fixes, notes, byRev };
}
