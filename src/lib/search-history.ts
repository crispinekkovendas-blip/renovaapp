import { searchKey } from "./normalize.ts";

/**
 * O que o médico já buscou e o que acabou abrindo, guardado no próprio
 * navegador. Serve para duas coisas:
 *
 * - "Buscas recentes" quando o campo está vazio;
 * - aprender o caminho: se ele digitou "choq", depois "choque sept" e abriu
 *   Sepse, as três buscas passam a pôr Sepse no alto — inclusive quando ele
 *   voltar a digitar só "cho".
 *
 * É por aparelho e some se o navegador limpar os dados; nada disso vai para o
 * servidor.
 */

export interface SearchMemory {
  recent: string[];
  /** busca normalizada → { id do resultado aberto → vezes } */
  picks: Record<string, Record<string, number>>;
}

const MAX_RECENT = 8;
const MAX_KEYS = 300;

export function emptyMemory(): SearchMemory {
  return { recent: [], picks: {} };
}

/**
 * A memória guardada de `scope`. Se ainda não há nenhuma, herda a de
 * `inherit` (a busca única do Guia clínico herda a das três abas antigas),
 * com o prefixo de cada uma nos ids.
 */
export function loadMemory(scope: string, inherit: readonly { scope: string; prefix: string }[] = []): SearchMemory {
  try {
    const raw = localStorage.getItem(`renova.busca.${scope}`);
    if (!raw && inherit.length > 0) {
      return mergeMemories(inherit.map((i) => ({ prefix: i.prefix, memory: loadMemory(i.scope) })));
    }
    if (!raw) return emptyMemory();
    const data = JSON.parse(raw) as Partial<SearchMemory>;
    return {
      recent: Array.isArray(data.recent) ? data.recent.filter((q) => typeof q === "string").slice(0, MAX_RECENT) : [],
      picks: data.picks && typeof data.picks === "object" ? data.picks : {},
    };
  } catch {
    return emptyMemory();
  }
}

/**
 * Várias memórias numa só: os ids ganham o prefixo de onde vieram e as
 * buscas recentes se intercalam (a mais nova de cada uma primeiro), sem
 * repetir.
 */
export function mergeMemories(parts: readonly { prefix: string; memory: SearchMemory }[]): SearchMemory {
  const picks: Record<string, Record<string, number>> = {};
  for (const { prefix, memory } of parts) {
    for (const [q, ids] of Object.entries(memory.picks)) {
      for (const [id, n] of Object.entries(ids)) picks[q] = { ...(picks[q] ?? {}), [`${prefix}${id}`]: n };
    }
  }
  const recent: string[] = [];
  const longest = Math.max(0, ...parts.map((p) => p.memory.recent.length));
  for (let i = 0; i < longest; i++) {
    for (const { memory } of parts) {
      const q = memory.recent[i];
      if (q && recent.length < MAX_RECENT && !recent.some((r) => searchKey(r) === searchKey(q))) recent.push(q);
    }
  }
  return { recent, picks };
}

export function saveMemory(scope: string, memory: SearchMemory): void {
  try {
    localStorage.setItem(`renova.busca.${scope}`, JSON.stringify(memory));
  } catch {
    // Navegador sem armazenamento (aba anônima, bloqueio): a busca funciona igual, só não lembra.
  }
}

/**
 * Registra que, depois destas buscas (a última e as tentativas anteriores da
 * mesma procura), o médico abriu `id`.
 */
export function rememberPick(memory: SearchMemory, queries: readonly string[], id: string): SearchMemory {
  const picks = { ...memory.picks };
  for (const q of new Set(queries.map((x) => searchKey(x)).filter((x) => x.length >= 2))) {
    picks[q] = { ...(picks[q] ?? {}), [id]: ((picks[q] ?? {})[id] ?? 0) + 1 };
  }
  const keys = Object.keys(picks);
  if (keys.length > MAX_KEYS) for (const k of keys.slice(0, keys.length - MAX_KEYS)) delete picks[k];

  const last = queries[queries.length - 1]?.trim();
  const recent = last
    ? [last, ...memory.recent.filter((q) => searchKey(q) !== searchKey(last))].slice(0, MAX_RECENT)
    : memory.recent;
  return { recent, picks };
}

/**
 * Quanto somar à nota de `id` para esta busca: vale o que foi aberto depois
 * da mesma busca e das buscas que começam com o que está digitado.
 */
export function memoryBoost(memory: SearchMemory, query: string, id: string): number {
  const q = searchKey(query);
  if (q.length < 2) return 0;
  let count = 0;
  for (const [key, ids] of Object.entries(memory.picks)) {
    if (!ids[id]) continue;
    if (key === q) count += ids[id] * 2;
    else if (key.startsWith(q) || (q.length >= 4 && q.startsWith(key))) count += ids[id];
  }
  return count > 0 ? 3 * Math.log2(1 + count) : 0;
}
