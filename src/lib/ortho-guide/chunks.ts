import { ORTHO_GUIDE } from "./data.ts";
import { orthoDocs } from "./index.ts";
import type { OrthoTopic } from "./types.ts";
import type { GuideChunk } from "../emergency-guide/chunks.ts";

/**
 * O Guia de ortopedia em trechos para a pergunta à IA: dois por tópico —
 * a avaliação (o que perguntar, examinar, alarme, imagem) e a conduta
 * (plano, receita, imobilização, encaminhar, atestado). O id leva o prefixo
 * "orto-", como "receita-" e "drive-" nas outras abas.
 */

function assessmentText(t: OrthoTopic): string {
  const lines = [
    `Resumo: ${t.summary}`,
    t.cid !== "—" ? `CID ${t.cid}.` : "",
    t.aliases.length ? `Como o paciente fala: ${t.aliases.join("; ")}.` : "",
    "Perguntar:",
    ...t.ask.map((a) => `- ${a}`),
    ...(t.exam.length ? ["Exame físico:", ...t.exam.map((e) => `- ${e.name}: ${e.how} Positivo: ${e.positive}`)] : []),
    "Sinais de alarme:",
    ...t.alarm.map((a) => `- ${a}`),
    ...(t.imaging.length ? ["Imagem:", ...t.imaging.map((i) => `- ${i}`)] : []),
  ];
  return lines.filter(Boolean).join("\n");
}

function conductText(t: OrthoTopic): string {
  const lines = [
    `Resumo: ${t.summary}`,
    "Conduta:",
    ...t.plan.map((p) => `- ${p}`),
    ...(t.rx.length
      ? ["Receita (adulto sem comorbidade):", ...t.rx.map((r) => `• ${r.name} — ${r.posology}${r.note ? ` [cuidado: ${r.note}]` : ""}`)]
      : []),
    ...(t.immobilize?.length ? ["Imobilização:", ...t.immobilize.map((i) => `- ${i}`)] : []),
    "Encaminhar ao ortopedista:",
    ...t.refer.map((r) => `- ${r}`),
    `Atestado: ${t.leave}`,
    `Retorno: ${t.followup}`,
    ...(t.pearls?.length ? ["Dicas:", ...t.pearls.map((p) => `- ${p}`)] : []),
    `Baseado em: ${t.sources.join("; ")}.`,
  ];
  return lines.join("\n");
}

let TERMS: Map<string, { names: string[]; exams: string[]; drugs: string[] }> | null = null;

/** Os outros nomes, as manobras e os remédios de um tópico: só para o índice da busca da IA, não para o texto. */
export function orthoTerms(slug: string): { names: string[]; exams: string[]; drugs: string[] } {
  TERMS ??= new Map(orthoDocs().map((d) => [d.slug, { names: d.aliases, exams: d.exams, drugs: d.drugs }]));
  return TERMS.get(slug) ?? { names: [], exams: [], drugs: [] };
}

/** Os trechos do Guia de ortopedia, dois por tópico. */
export function orthoChunks(): GuideChunk[] {
  return ORTHO_GUIDE.flatMap((chapter) =>
    chapter.topics.flatMap((t): GuideChunk[] => {
      const base = { slug: t.slug, topic: t.title, chapter: `Ortopedia · ${chapter.title}`, source: "ortopedia" as const, href: `/guia/ortopedia/${t.slug}` };
      return [
        { ...base, id: `orto-${t.slug}#0`, section: "Avaliação", text: assessmentText(t) },
        { ...base, id: `orto-${t.slug}#1`, section: "Conduta", text: conductText(t) },
      ];
    })
  );
}
