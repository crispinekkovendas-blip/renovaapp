import { ORTHO_GUIDE } from "./data.ts";
import { orthoDocs } from "./index.ts";
import type { OrthoTopic } from "./types.ts";
import type { GuideChunk } from "../emergency-guide/chunks.ts";

/**
 * O Guia de ortopedia em trechos para a pergunta à IA: três por tópico —
 * a avaliação (#0: o que perguntar, examinar, alarme, imagem), a urgência
 * (#1: o que o ortopedista de plantão faz hoje, imobilização, o que vai para
 * a cirurgia pela regulação) e a conduta com o retorno (#2: plano, receita,
 * seguimento, atestado) — e um por procedimento (#3, #4…: redução, tala,
 * gesso, bloqueio, punção, infiltração, passo a passo). O id leva o prefixo
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

function urgentText(t: OrthoTopic): string {
  const lines = [
    `Resumo: ${t.summary}`,
    "Na urgência (você é o ortopedista de plantão):",
    ...t.urgent.map((u) => `- ${u}`),
    ...(t.immobilize?.length ? ["Imobilização:", ...t.immobilize.map((i) => `- ${i}`)] : []),
    "Cirurgia e regulação (o que sai da sua mão):",
    ...t.refer.map((r) => `- ${r}`),
  ];
  return lines.join("\n");
}

function conductText(t: OrthoTopic): string {
  const lines = [
    `Resumo: ${t.summary}`,
    "Conduta:",
    ...t.plan.map((p) => `- ${p}`),
    ...(t.rx.length
      ? ["Receita (adulto sem comorbidade):", ...t.rx.map((r) => `• ${r.name} — ${r.posology}${r.note ? ` [cuidado: ${r.note}]` : ""}`)]
      : []),
    "No retorno (ambulatório):",
    ...t.clinic.map((c) => `- ${c}`),
    `Atestado: ${t.leave}`,
    `Retorno: ${t.followup}`,
    ...(t.pearls?.length ? ["Dicas:", ...t.pearls.map((p) => `- ${p}`)] : []),
    `Baseado em: ${t.sources.join("; ")}.`,
  ];
  return lines.join("\n");
}

function procedureText(t: OrthoTopic, p: NonNullable<OrthoTopic["procedures"]>[number]): string {
  return [
    `Resumo: ${t.summary}`,
    `Procedimento que você faz no serviço: ${p.name}`,
    `Quando: ${p.when}`,
    `Material: ${p.needs}`,
    "Passos:",
    ...p.steps.map((s, i) => `${i + 1}. ${s}`),
    `Depois: ${p.after}`,
  ].join("\n");
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
        { ...base, id: `orto-${t.slug}#1`, section: "Na urgência", text: urgentText(t) },
        { ...base, id: `orto-${t.slug}#2`, section: "Conduta e retorno", text: conductText(t) },
        ...(t.procedures ?? []).map((p, i) => ({ ...base, id: `orto-${t.slug}#${3 + i}`, section: `Procedimento: ${p.name}`, text: procedureText(t, p) })),
      ];
    })
  );
}
