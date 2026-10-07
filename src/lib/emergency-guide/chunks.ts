import { buildIndex, search } from "../smart-search.ts";
import type { SearchIndex } from "../smart-search.ts";
import { EMERGENCY_GUIDE } from "./data.ts";
import type { GuideBlock } from "./types.ts";
import { fuseRanks, semanticRank } from "./vectors.ts";
import { geminiEnabled } from "../gemini.ts";
import { termsFor } from "../clinical-terms.ts";
import { searchKey } from "../normalize.ts";
import { guideEntries } from "../clinical-guide.ts";
import { PRESCRIPTION_DRIVE } from "../prescription-drive/index.ts";
import type { DriveEntry } from "../prescription-drive/index.ts";

/**
 * O Guia clínico em trechos para a pergunta à IA, das três abas:
 *
 * - Plantão: cada tópico do guia de emergência é cortado nos subtítulos
 *   ("Estável hemodinamicamente:", "Grave"); o texto marca o que a revisão
 *   corrigiu e o que pede conferência, para a resposta repetir o aviso.
 * - Receitas prontas: um trecho por receita (remédios, posologia e a
 *   orientação ao paciente).
 * - Drive: um trecho por condição (receita, criança, cuidados, fonte).
 *
 * Cada trecho leva a fonte, o título e o caminho para o médico abrir o
 * original. O id dos trechos de receitas e do Drive leva o prefixo
 * "receita-" ou "drive-": o mesmo assunto pode existir em duas abas.
 */

export type ChunkSource = "plantao" | "receitas" | "drive";

export interface GuideChunk {
  /** "sepse-e-choque-septico#2", "receita-cistite-itu-baixa-nao-complicada#0", "drive-enxaqueca#0" */
  id: string;
  slug: string;
  topic: string;
  chapter: string;
  /** Subtítulo da seção, quando há. */
  section: string | null;
  source: ChunkSource;
  /** Onde o médico abre o original. */
  href: string;
  text: string;
}

/** Como a fonte aparece para a IA e na lista de fontes da resposta. */
export const SOURCE_LABEL: Readonly<Record<ChunkSource, string>> = {
  plantao: "Guia de Prescrições da Emergência (plantão)",
  receitas: "Receitas prontas da clínica",
  drive: "Drive de prescrições revisado",
};

/** Trecho grande demais vira dois: a IA lê melhor e a busca acerta mais. */
const MAX_BLOCKS = 18;

function blockLine(b: GuideBlock): string {
  const prefix: Partial<Record<GuideBlock["k"], string>> = {
    drug: "• ",
    ped: "(pediatria) ",
    tip: "(dica) ",
    route: "",
    plus: "",
  };
  if (b.k === "plus") return "+ (associar)";
  if (b.k === "grid") return `${b.t}:\n` + (b.rows ?? []).map((r) => r.join(" | ")).join("\n");
  let line = (prefix[b.k] ?? "") + b.t;
  if (b.fix) line += ` [corrigido pela revisão; o guia original dizia: "${b.fix.orig}" — motivo: ${b.fix.why}]`;
  if (b.note) line += ` [conferir: ${b.note}]`;
  return line;
}

/** Todos os trechos do Guia clínico: plantão, receitas prontas e Drive. */
export function guideChunks(): GuideChunk[] {
  return [...plantaoChunks(), ...receitaChunks(), ...driveChunks()];
}

function plantaoChunks(): GuideChunk[] {
  const out: GuideChunk[] = [];
  for (const chapter of EMERGENCY_GUIDE) {
    for (const topic of chapter.topics) {
      let n = 0;
      let section: string | null = null;
      let lines: string[] = [];
      let count = 0;
      const flush = () => {
        if (lines.length === 0) return;
        out.push({
          id: `${topic.slug}#${n++}`,
          slug: topic.slug,
          topic: topic.title,
          chapter: chapter.title,
          section,
          source: "plantao",
          href: `/guia/plantao/${topic.slug}`,
          text: lines.join("\n"),
        });
        lines = [];
        count = 0;
      };
      for (const b of topic.blocks) {
        if (b.k === "sub" || count >= MAX_BLOCKS) {
          flush();
          if (b.k === "sub") section = b.t.replace(/:$/, "");
          if (b.k === "sub") continue;
        }
        lines.push(blockLine(b));
        count++;
      }
      flush();
    }
  }
  return out;
}

/** "Cistite (ITU baixa não complicada)" → "cistite-itu-baixa-nao-complicada". */
function slugOf(text: string): string {
  return searchKey(text).replace(/ /g, "-");
}

/** Uma receita pronta por trecho: os remédios como saem no papel e a orientação ao paciente. */
function receitaChunks(): GuideChunk[] {
  return guideEntries().map((e) => {
    const slug = slugOf(e.name);
    const lines = [
      `Receita pronta da clínica — ponto de partida para adulto sem comorbidade. CID ${e.cid}.`,
      ...e.items.map((item, i) => `${i + 1}. ${item.name} · ${item.quantity} — ${item.posology} (${item.route})`),
      ...(e.orientation ? [`Orientação ao paciente (${e.orientation.name}): ${e.orientation.text.replace(/\s+/g, " ")}`] : []),
    ];
    return {
      id: `receita-${slug}#0`,
      slug,
      topic: e.name,
      chapter: `Receitas prontas · ${e.group}`,
      section: null,
      source: "receitas" as const,
      href: `/guia?q=${encodeURIComponent(e.name)}`,
      text: lines.join("\n"),
    };
  });
}

const plainMd = (text: string) => text.replace(/\*\*/g, "").replace(/\*/g, "");

/** O texto de uma entrada do Drive: receita, criança, cuidados e fonte (sem o "o que mudou" do original). */
function driveText(entry: DriveEntry): string {
  const lines: string[] = [];
  for (const block of entry.blocks) {
    if ("items" in block) lines.push(...block.items.map((item) => `- ${plainMd(item)}`));
    else if ("rows" in block) lines.push(...block.rows.map((row) => row.map(plainMd).join(" | ")));
    else if (block.k === "rx") {
      for (const line of block.t.split("\n")) {
        const clean = line.trim().replace(/\s\.{2,}\s*/g, " · ");
        if (clean) lines.push(clean);
      }
    } else lines.push(block.k === "warn" ? `Atenção: ${plainMd(block.t)}` : plainMd(block.t));
  }
  if (entry.source) lines.push(`Fonte: ${plainMd(entry.source)}`);
  return lines.join("\n");
}

/** Uma condição do Drive revisado por trecho. */
function driveChunks(): GuideChunk[] {
  return PRESCRIPTION_DRIVE.flatMap((section) =>
    section.entries.map((entry) => ({
      id: `drive-${entry.slug}#0`,
      slug: entry.slug,
      topic: entry.title,
      chapter: `Drive de prescrições · ${section.title}`,
      section: null,
      source: "drive" as const,
      href: `/guia/drive/${entry.slug}`,
      text: driveText(entry),
    }))
  );
}

let cache: { chunks: GuideChunk[]; byId: Map<string, GuideChunk>; index: SearchIndex } | null = null;

function corpus() {
  if (!cache) {
    const chunks = guideChunks();
    cache = {
      chunks,
      byId: new Map(chunks.map((c) => [c.id, c])),
      index: buildIndex(
        chunks.map((c) => {
          // Nome popular e sintoma acham o tópico; ficam só no índice, não no texto que a IA lê.
          const { names, symptoms } = termsFor(c.topic);
          return {
            id: c.id,
            fields: [
              { text: c.topic, weight: 10 },
              // Mesmo peso das abas: o nome exato ("migranha") vence o parecido no título ("migrans").
              { text: names.join(" "), weight: 8 },
              { text: c.section ?? "", weight: 4 },
              { text: symptoms.join(" "), weight: 4 },
              { text: c.chapter, weight: 2 },
              { text: c.text, weight: 1 },
            ],
          };
        })
      ),
    };
  }
  return cache;
}

export function chunkById(id: string): GuideChunk | undefined {
  return corpus().byId.get(id);
}

/** Os trechos mais relevantes para uma consulta (a busca do guia, sobre trechos). */
export function retrieveChunks(query: string, limit = 6): GuideChunk[] {
  const { index, byId } = corpus();
  return search(index, query, { limit, match: "any" })
    .hits.map((h) => byId.get(h.id))
    .filter((c): c is GuideChunk => Boolean(c));
}

/**
 * Recuperação híbrida: a busca por palavra (tolera erro, sinônimo) e a por
 * sentido (embeddings do Gemini), juntas por posição. Sem Gemini, ou se ele
 * falhar, fica só a por palavra — a pergunta nunca fica sem trechos.
 */
export async function retrieveHybrid(query: string, limit = 6): Promise<GuideChunk[]> {
  const { chunks, byId } = corpus();
  const lexical = retrieveChunks(query, 20).map((c) => c.id);
  if (!geminiEnabled()) return lexical.slice(0, limit).map((id) => byId.get(id)!);
  try {
    const semantic = (await semanticRank(query, chunks, 20)).map((r) => r.id);
    // O sentido pesa mais: em pergunta narrativa ("não para de convulsionar") a busca por
    // palavra casa com palavras soltas; ela ainda acha nomes e siglas que o sentido perde.
    return fuseRanks([lexical, semantic], [0.5, 1])
      .slice(0, limit)
      .map((id) => byId.get(id))
      .filter((c): c is GuideChunk => Boolean(c));
  } catch (error) {
    console.error("guia: busca por sentido falhou, seguindo só por palavra", error);
    return lexical.slice(0, limit).map((id) => byId.get(id)!);
  }
}

/** Como o trecho chega à IA: identificador, fonte, de onde é, e o texto. */
export function formatChunk(c: GuideChunk): string {
  return `<trecho id="${c.id}" fonte="${SOURCE_LABEL[c.source]}">\nTópico: ${c.topic} (${c.chapter})${c.section ? ` › ${c.section}` : ""}\n${c.text}\n</trecho>`;
}
