import { ORTHO_GUIDE } from "./data.ts";
import type { OrthoChapter, OrthoTopic } from "./types.ts";
import type { SearchDoc } from "../smart-search.ts";

export type { OrthoChapter, OrthoExam, OrthoRx, OrthoTopic } from "./types.ts";
export { ORTHO_GUIDE };

/**
 * Guia de ortopedia: texto próprio da Renova para o clínico que assume o
 * ambulatório de ortopedia. Não é reprodução de livro — por isso vive no
 * repositório, e não no Supabase como os guias licenciados.
 */
export const ORTHO_CREDIT = {
  title: "Guia de ortopedia ambulatorial",
  revision: 1,
  writtenAt: "21 de outubro de 2026",
  reviewedBy: null as string | null,
} as const;

/** O que o índice mostra de cada tópico (vai ao navegador: sem o corpo). */
export interface OrthoDoc {
  slug: string;
  title: string;
  chapter: string;
  cid: string;
  aliases: string[];
  summary: string;
  /** Nome das manobras, para a busca ("Lachman"). */
  exams: string[];
  /** Medicamentos da receita, para a busca. */
  drugs: string[];
}

const FLAT: { chapter: OrthoChapter; topic: OrthoTopic }[] = ORTHO_GUIDE.flatMap((chapter) =>
  chapter.topics.map((topic) => ({ chapter, topic }))
);

export function orthoSlugs(): string[] {
  return FLAT.map(({ topic }) => topic.slug);
}

export function orthoStats(): { chapters: number; topics: number; exams: number } {
  return {
    chapters: ORTHO_GUIDE.length,
    topics: FLAT.length,
    exams: FLAT.reduce((n, { topic }) => n + topic.exam.length, 0),
  };
}

/** Um tópico com o capítulo e os vizinhos, para a página dele. */
export function findOrthoTopic(slug: string): { chapter: OrthoChapter; topic: OrthoTopic; prev: OrthoTopic | null; next: OrthoTopic | null } | null {
  const i = FLAT.findIndex(({ topic }) => topic.slug === slug);
  if (i < 0) return null;
  const { chapter, topic } = FLAT[i];
  const siblings = chapter.topics;
  const j = siblings.indexOf(topic);
  return { chapter, topic, prev: siblings[j - 1] ?? null, next: siblings[j + 1] ?? null };
}

export function orthoDocs(): OrthoDoc[] {
  return FLAT.map(({ chapter, topic }) => ({
    slug: topic.slug,
    title: topic.title,
    chapter: chapter.title,
    cid: topic.cid,
    aliases: topic.aliases,
    summary: topic.summary,
    exams: topic.exam.map((e) => e.name),
    drugs: [...new Set(topic.rx.map((r) => r.name.split(/\s\d/)[0]))],
  }));
}

/**
 * Pesos como nas outras abas (guide-search.ts): título 10, outros nomes 8,
 * remédios e manobras 5, capítulo 3, resumo 1.
 */
export function orthoSearchDoc(d: OrthoDoc): SearchDoc {
  return {
    id: d.slug,
    fields: [
      { text: `${d.title} ${d.cid}`, weight: 10 },
      { text: d.aliases.join(" "), weight: 8 },
      { text: [...d.drugs, ...d.exams].join(" "), weight: 5 },
      { text: d.chapter, weight: 3 },
      { text: d.summary, weight: 1 },
    ],
  };
}

/** Atalhos do primeiro dia: os cinco tópicos de base, na ordem de leitura. */
export const FIRST_DAY: readonly { slug: string; label: string; hint: string }[] = [
  { slug: "quando-encaminhar-no-mesmo-dia", label: "O que não espera", hint: "A lista do pronto-socorro" },
  { slug: "como-pedir-o-raio-x", label: "Pedir o raio-X", hint: "Incidências por região" },
  { slug: "analgesia-em-escada", label: "Medicar a dor", hint: "Os quatro degraus" },
  { slug: "imobilizacoes-e-orteses", label: "Imobilizar", hint: "Tala, tipoia, bota" },
  { slug: "atestado-e-afastamento", label: "Atestado", hint: "Dias por condição" },
];
