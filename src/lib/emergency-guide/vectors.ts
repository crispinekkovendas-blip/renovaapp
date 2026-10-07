import { EMBED_DIM, GEMINI_EMBED_MODEL, embedInput, embedTexts } from "../gemini.ts";
import type { GuideChunk } from "./chunks.ts";
import { heardFor, termsFor } from "../clinical-terms.ts";
import stored from "./vectors.json" with { type: "json" };

/**
 * Os trechos do guia como vetores (embeddings do Gemini), para achar pelo
 * sentido e não só pela palavra: "não para de convulsionar" acha o estado
 * de mal epiléptico.
 *
 * Os vetores são gerados uma vez (scripts/emergency-guide/embed.mjs) e ficam
 * no repositório em int8 (1 byte por dimensão). Trecho novo ou alterado —
 * o hash do texto não bate — é calculado na hora e fica em memória.
 */

export interface VectorFile {
  model: string;
  dim: number;
  items: { id: string; hash: string; v: string }[];
}

/** FNV-1a de 32 bits: basta para saber se o texto do trecho mudou. */
export function textHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * O que vira vetor: o trecho com o título e, para a pergunta vaga achar o
 * tópico, os outros nomes da condição no título e os sintomas no fim do texto
 * (clinical-terms.ts). Isso fica só no vetor — a IA lê o trecho puro.
 */
export function chunkEmbedText(c: GuideChunk): string {
  const { names, symptoms } = termsFor(c.topic);
  const heard = heardFor(c.topic);
  const title = `${c.topic}${names.length ? ` (${names.join(", ")})` : ""}${c.section ? ` › ${c.section}` : ""} (${c.chapter})`;
  // A queixa como o paciente conta (vocabulário ampliado), com teto para não afogar o texto do trecho.
  const tail = [
    symptoms.length ? `Sintomas e queixas: ${symptoms.join("; ")}` : "",
    heard.length ? `Como o paciente conta: ${heard.slice(0, 60).join("; ")}` : "",
  ].filter(Boolean);
  return embedInput(tail.length ? [c.text, ...tail].join(NL) : c.text, "doc", title);
}

const NL = String.fromCharCode(10);

/**
 * Cada vetor usa a faixa inteira do int8 (escala pelo maior valor dele); a
 * escala some ao voltar, porque o vetor é normalizado de novo.
 */
export function quantize(v: readonly number[]): string {
  const bytes = new Int8Array(v.length);
  const max = v.reduce((m, x) => Math.max(m, Math.abs(x)), 0) || 1;
  for (let i = 0; i < v.length; i++) bytes[i] = Math.round((v[i] / max) * 127);
  return Buffer.from(bytes.buffer).toString("base64");
}

export function dequantize(b64: string): Float32Array {
  const bytes = new Int8Array(Buffer.from(b64, "base64"));
  const out = new Float32Array(bytes.length);
  let norm = 0;
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] / 127;
    norm += out[i] * out[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

export function dot(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

const file = stored as VectorFile;
const memory = new Map<string, Float32Array>();

/** Os vetores de todos os trechos; calcula na hora os que faltam ou mudaram. */
export async function chunkVectors(chunks: readonly GuideChunk[]): Promise<Map<string, Float32Array>> {
  const usable = file.model === GEMINI_EMBED_MODEL && file.dim === EMBED_DIM;
  const byId = new Map(usable ? file.items.map((it) => [it.id, it]) : []);
  const out = new Map<string, Float32Array>();
  const missing: GuideChunk[] = [];
  for (const c of chunks) {
    const hash = textHash(chunkEmbedText(c));
    const cached = memory.get(`${c.id}:${hash}`);
    const saved = byId.get(c.id);
    if (cached) out.set(c.id, cached);
    else if (saved && saved.hash === hash) out.set(c.id, dequantize(saved.v));
    else missing.push(c);
  }
  if (missing.length) {
    const vectors = await embedTexts(missing.map(chunkEmbedText));
    missing.forEach((c, i) => {
      const v = Float32Array.from(vectors[i]);
      memory.set(`${c.id}:${textHash(chunkEmbedText(c))}`, v);
      out.set(c.id, v);
    });
  }
  return out;
}

/** Os trechos mais parecidos com a pergunta, pelo sentido. */
export async function semanticRank(
  query: string,
  chunks: readonly GuideChunk[],
  limit = 20
): Promise<{ id: string; score: number }[]> {
  const [vectors, [q]] = await Promise.all([chunkVectors(chunks), embedTexts([embedInput(query, "query")])]);
  return [...vectors.entries()]
    .map(([id, v]) => ({ id, score: dot(q, v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Junta duas listas ordenadas (palavra e sentido) pela posição de cada item
 * em cada uma — Reciprocal Rank Fusion: quem aparece bem nas duas sobe.
 */
export function fuseRanks(lists: readonly (readonly string[])[], weights: readonly number[] = [], k = 60): string[] {
  const score = new Map<string, number>();
  lists.forEach((list, l) => {
    const w = weights[l] ?? 1;
    list.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + w / (k + i + 1)));
  });
  return [...score.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}
