import { ORTHO_GUIDE } from "./data.ts";
import { conciseDiff } from "../revision-diff.ts";
import type { ConciseLine } from "../revision-diff.ts";

/**
 * As revisões do Guia de ortopedia: cada mudança de conteúdo com o texto de
 * antes, o de agora e o motivo, para o médico conferir e marcar Concordo /
 * Discordo na página Revisões. O guia sempre mostra o texto mais novo; o
 * anterior só existe aqui.
 */

export interface OrthoRevision {
  n: number;
  date: string;
  label: string;
}

export const ORTHO_REVISIONS: readonly OrthoRevision[] = [
  { n: 1, date: "21/10/2026", label: "Publicação" },
  { n: 2, date: "27/10/2026", label: "2ª revisão" },
];

export const CURRENT_ORTHO_REVISION = ORTHO_REVISIONS[ORTHO_REVISIONS.length - 1].n;

export function orthoRevisionLabel(n: number): string {
  const r = ORTHO_REVISIONS.find((x) => x.n === n) ?? ORTHO_REVISIONS[0];
  return `${r.label} (${r.date.slice(0, 5)})`;
}

export interface OrthoChange {
  rev: number;
  slug: string;
  /** Seção do tópico onde o trecho está ("Receita", "Conduta", "CID"). */
  section: string;
  before: string;
  after: string;
  why: string;
  /** Quando o trecho é compartilhado por vários tópicos (as receitas de base). */
  alsoIn?: string[];
}

export const ORTHO_CHANGES: readonly OrthoChange[] = [
  {
    rev: 2,
    slug: "analgesia-em-escada",
    section: "Receita · Tramadol 50 mg",
    before: "Tarja preta — receita A. Náusea e tontura são comuns; cuidado em idoso, epilepsia e com antidepressivo (serotonina).",
    after:
      "Lista A2 da Portaria 344 (tarja preta): até 100 mg por unidade sai em receita de controle especial em duas vias, não na notificação A. Náusea e tontura são comuns; cuidado em idoso, epilepsia e com antidepressivo (serotonina).",
    why: "O tramadol está na lista A2 da Portaria 344/98, mas o adendo da lista dispensa a Notificação de Receita A para preparações de até 100 mg por unidade posológica: o comprimido de 50 mg sai na receita de controle especial (branca, duas vias). “Receita A” mandaria o médico buscar o talão amarelo, que ele não tem.",
    alsoIn: ["lombalgia-aguda", "lombociatalgia-hernia-de-disco", "fratura-vertebral-osteoporotica", "fratura-do-radio-distal", "fratura-de-clavicula"],
  },
  {
    rev: 2,
    slug: "analgesia-em-escada",
    section: "Receita · cuidado do anti-inflamatório",
    before:
      "AINE por até 5–7 dias, com alimento. Evitar ou reduzir em: > 65 anos, doença renal, úlcera ou sangramento digestivo, insuficiência cardíaca, anticoagulante, AAS, corticoide, gestação (3º trimestre: contraindicado). Se for usar nesses casos, associar omeprazol 20 mg/dia.",
    after:
      "AINE por até 5–7 dias, com alimento. Evitar ou reduzir em: > 65 anos, doença renal, úlcera ou sangramento digestivo, insuficiência cardíaca, anticoagulante, AAS, corticoide, gestação (evitar a partir de 20 semanas; contraindicado no 3º trimestre — oligoâmnio e fechamento do canal arterial). Se for usar nesses casos, associar omeprazol 20 mg/dia.",
    why: "A contraindicação no 3º trimestre está certa, mas é incompleta: desde 2020 a FDA recomenda evitar AINE a partir de 20 semanas, pelo risco de oligoâmnio por lesão renal fetal. A nota aparece em toda receita com naproxeno do guia.",
    alsoIn: [
      "lombalgia-aguda",
      "lombociatalgia-hernia-de-disco",
      "cervicalgia-e-cervicobraquialgia",
      "sindrome-do-impacto-e-manguito-rotador",
      "capsulite-adesiva",
      "luxacao-e-instabilidade-do-ombro",
      "fratura-de-clavicula",
      "epicondilite",
      "tenossinovite-de-de-quervain",
      "dedo-em-gatilho",
      "fratura-de-escafoide",
      "rizartrose",
      "osteoartrite-de-quadril",
      "sindrome-dolorosa-do-grande-trocanter",
      "osteoartrite-de-joelho",
      "entorse-de-joelho-ligamentos",
      "lesao-meniscal",
      "dor-patelofemoral",
      "cisto-de-baker-e-bursites-do-joelho",
      "entorse-de-tornozelo",
      "fascite-plantar",
      "tendao-de-aquiles",
      "fratura-de-metatarso",
      "halux-valgo-e-metatarsalgia",
      "crise-de-gota",
    ],
  },
  {
    rev: 2,
    slug: "lombociatalgia-hernia-de-disco",
    section: "Conduta",
    before: "Curso curto de corticoide (prednisona 20 mg/dia por 5 dias) pode reduzir a dor radicular intensa nas primeiras semanas — benefício modesto; não repetir.",
    after:
      "Curso curto de corticoide pode melhorar a função na dor radicular intensa nas primeiras semanas — benefício modesto e sem efeito claro na dor. O único ensaio bom (Goldberg, JAMA 2015) usou prednisona 60 mg por 5 dias, 40 mg por 5 e 20 mg por 5; não repetir.",
    why: "A dose de 20 mg por 5 dias não tem ensaio que a sustente. O ensaio citado como fonte usou 60 mg com redução em 15 dias e mostrou ganho de função, não de dor — o texto agora diz o esquema estudado e o tamanho real do benefício.",
  },
  {
    rev: 2,
    slug: "lombociatalgia-hernia-de-disco",
    section: "Receita · Prednisona 20 mg",
    before: "1 comprimido pela manhã, após o café, por 5 dias.",
    after: "3 comprimidos (60 mg) pela manhã, após o café, por 5 dias; depois 2 comprimidos (40 mg) por 5 dias e 1 comprimido (20 mg) por 5 dias, e parar.",
    why: "Mesmo motivo da conduta: o esquema passa a ser o do ensaio de Goldberg (JAMA 2015), que é o que a fonte sustenta.",
  },
  {
    rev: 2,
    slug: "capsulite-adesiva",
    section: "Conduta",
    before:
      "Fase dolorosa: infiltração intra-articular de corticoide (triancinolona 40 mg) tem o melhor efeito nas primeiras semanas; alternativa, prednisona 20 mg/dia por 2 semanas com redução gradual em mais 1 (cuidado em diabético).",
    after:
      "Fase dolorosa: infiltração intra-articular de corticoide (triancinolona 40 mg) tem o melhor efeito nas primeiras semanas; alternativa, prednisona 30 mg/dia por 3 semanas e parar (Buchbinder, 2004: menos dor e mais movimento às 3 semanas, sem diferença às 12; cuidado em diabético).",
    why: "O esquema de 20 mg por 2 semanas era uma aproximação. O ensaio controlado de Buchbinder (Ann Rheum Dis 2004) usou 30 mg por dia por 3 semanas — e mostrou que o ganho é só de curto prazo, o que o médico precisa saber antes de prescrever.",
  },
  {
    rev: 2,
    slug: "capsulite-adesiva",
    section: "Receita · Prednisona 20 mg",
    before: "1 comprimido pela manhã por 14 dias, depois 10 mg por 7 dias e parar.",
    after: "1 ½ comprimido (30 mg) pela manhã por 21 dias e parar.",
    why: "Mesmo motivo da conduta: o esquema passa a ser o do ensaio de Buchbinder (30 mg por 3 semanas).",
  },
  {
    rev: 2,
    slug: "dor-no-quadril-na-crianca",
    section: "Receita · Ibuprofeno",
    before: "Ibuprofeno suspensão 50 mg/mL — 10 mg/kg por dose (0,2 mL/kg), de 8/8 h, por 3 a 5 dias, com alimento.",
    after:
      "Ibuprofeno gotas 100 mg/mL — 10 mg/kg por dose = 2 gotas/kg (20 gotas por mL); na apresentação de 50 mg/mL, 4 gotas/kg. De 8/8 h, por 3 a 5 dias, com alimento; máximo 400 mg por dose.",
    why: "A apresentação de 50 mg/mL é em gotas, não suspensão, e o médico prescreve em gotas: 0,2 mL/kg vira 4 gotas/kg no frasco de 50 mg/mL e 2 gotas/kg no de 100 mg/mL, o mais comum. A receita agora diz as duas e o teto por dose.",
  },
  {
    rev: 2,
    slug: "fratura-vertebral-osteoporotica",
    section: "CID",
    before: "M80.0 / S32.0",
    after: "M80.0 / S22.0 / S32.0",
    why: "S32.0 é só a fratura de vértebra lombar; a fratura por fragilidade é mais frequente na transição toracolombar e na coluna torácica, que é S22.0.",
  },
];

/** FNV-1a de 32 bits: id curto e estável para a decisão do médico ficar presa à mudança. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(16).padStart(8, "0");
}

export interface OrthoRevisionItem {
  id: string;
  tab: string;
  kind: string;
  where: string;
  title: string;
  href: string;
  text: string;
  before: string[] | null;
  after: string[] | null;
  concise: ConciseLine[];
  afterLabel: string;
  rev: number;
  slug: string;
}

const TITLE = new Map(ORTHO_GUIDE.flatMap((c) => c.topics.map((t) => [t.slug, t.title] as const)));

/** As mudanças no formato da lista de Revisões (revision-list.tsx). */
export function orthoRevisionItems(rev: number = CURRENT_ORTHO_REVISION): OrthoRevisionItem[] {
  return ORTHO_CHANGES.filter((c) => c.rev === rev).map((c) => {
    const title = TITLE.get(c.slug) ?? c.slug;
    const also = c.alsoIn?.length ? ` Vale também em: ${c.alsoIn.map((s) => TITLE.get(s) ?? s).join(", ")}.` : "";
    return {
      id: `ortopedia-${c.rev}-${hash(`${c.slug}|${c.section}|${c.after}`)}`,
      tab: "ortopedia",
      kind: c.section.startsWith("Receita") ? "Receita mudou" : c.section === "CID" ? "CID mudou" : "Texto mudou",
      where: c.section,
      title,
      href: `/guia/ortopedia/${c.slug}`,
      text: c.why + also,
      before: [c.before],
      after: [c.after],
      concise: [{ parts: conciseDiff(c.before, c.after) }],
      afterLabel: "Agora",
      rev: c.rev,
      slug: c.slug,
    };
  });
}

/** Quantas mudanças da revisão atual tocam o tópico (diretas ou por trecho compartilhado). */
export function orthoTopicRevised(slug: string, rev: number = CURRENT_ORTHO_REVISION): number {
  return ORTHO_CHANGES.filter((c) => c.rev === rev && (c.slug === slug || c.alsoIn?.includes(slug))).length;
}

export function orthoRevisionStats(rev: number = CURRENT_ORTHO_REVISION): { changes: number; topics: number } {
  const inRev = ORTHO_CHANGES.filter((c) => c.rev === rev);
  const topics = new Set(inRev.flatMap((c) => [c.slug, ...(c.alsoIn ?? [])]));
  return { changes: inRev.length, topics: topics.size };
}
