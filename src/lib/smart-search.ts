import { searchKey } from "./normalize.ts";
import { SYNONYM_TABLE } from "./search-synonyms.ts";

/**
 * Busca do Guia clínico: tolera erro de digitação, completa a palavra que o
 * médico ainda está digitando, entende sinônimo e abreviação ("IAM",
 * "pressão alta", "nora") e aprende com o que ele mesmo costuma abrir.
 *
 * Tudo roda no navegador sobre um índice pequeno (algumas centenas de
 * documentos), então cada tecla responde na hora.
 *
 * Como uma palavra da busca casa com uma palavra do índice, do melhor para o
 * pior: igual → soa igual ("anafilacia" ~ "anafilaxia") → começa com (a
 * palavra ainda sendo digitada) → uma ou duas letras trocadas, faltando ou
 * sobrando (Damerau-Levenshtein). Todas as palavras da busca precisam casar;
 * se nada casa assim, entram os que casam com a maior parte.
 */

export interface SearchField {
  text: string;
  /** Título 10, medicamentos 5, subtítulos e grupo 3, corpo 1. */
  weight: number;
}

export interface SearchDoc {
  id: string;
  fields: readonly SearchField[];
}

interface Posting {
  doc: number;
  w: number;
}

export interface SearchIndex {
  ids: string[];
  /** Palavras do índice em ordem alfabética (para completar por prefixo). */
  vocab: string[];
  post: Map<string, Posting[]>;
  /** Chave sonora → palavras ("anafilasia" → ["anafilaxia"]). */
  sound: Map<string, string[]>;
  /** Radical → palavras ("dilu" → ["diluir", "diluido"]). */
  stems: Map<string, string[]>;
  /** Peso de cada palavra para sugerir: quanto aparece e onde. */
  pop: Map<string, number>;
}

const STOP = new Set(
  "de da do das dos e em a o as os um uma uns umas para por com sem se ou no na nos nas ao aos que caso via ate apos cada mg ml mcg ui kg dia dias hora horas qual quais como quando quanto quantos quantas onde fazer faz devo tratar tratamento conduta manejo paciente pacientes".split(
    " "
  )
);

/** Palavras de pergunta nunca são começo de termo médico, nem digitando. */
const STOP_TYPED = new Set(["qual", "quais", "como", "quando", "quanto", "onde"]);

export function tokens(text: string): string[] {
  return searchKey(text)
    .split(" ")
    .filter((t) => (t.length > 1 || /\d/.test(t)) && !STOP.has(t));
}

/** Os sinônimos normalizados pela mesma regra da busca ("dor de cabeça" → "dor cabeca"). */
const SYNONYMS = new Map<string, string[][]>(
  Object.entries(SYNONYM_TABLE).map(([key, values]) => [tokens(key).join(" "), values.map((v) => tokens(v))])
);

function expandSynonyms(phrase: string): string[][] {
  return SYNONYMS.get(phrase) ?? [];
}

/**
 * Chave sonora do português: junta grafias que o ouvido confunde, para
 * "dypirona", "anafilacia", "hipocalemya", "clonasepam" acharem a palavra
 * certa mesmo com mais de uma letra trocada.
 */
export function soundKey(word: string): string {
  let s = word;
  s = s.replace(/ph/g, "f").replace(/th/g, "t").replace(/sh|ch/g, "x").replace(/lh/g, "li").replace(/nh/g, "ni");
  s = s.replace(/qu(?=[ei])/g, "k").replace(/gu(?=[ei])/g, "g").replace(/c(?=[ei])/g, "s").replace(/g(?=[ei])/g, "j");
  s = s.replace(/sc(?=[ei])/g, "s").replace(/xc(?=[ei])/g, "s").replace(/ç/g, "s");
  s = s.replace(/[kq]/g, "c").replace(/y/g, "i").replace(/w/g, "v").replace(/z/g, "s").replace(/x/g, "s");
  s = s.replace(/^h/, "").replace(/([aeiou])h/g, "$1");
  s = s.replace(/(.)\1+/g, "$1");
  return s;
}

const SUFFIXES = [
  "amentos", "imentos", "amento", "imento", "acoes", "icoes", "coes", "acao", "icao", "cao", "idos", "idas", "ados", "adas",
  "ivos", "ivas", "ido", "ida", "ado", "ada", "ivo", "iva", "oes", "ao", "ir", "ar", "er", "os", "as", "es", "o", "a", "e", "s",
];

/**
 * Radical simples do português, para a mesma família de palavras se achar:
 * "diluir", "diluído" e "diluição" → "dilu"; "hipertensão" e "hipertensiva"
 * → "hipertens". Nunca deixa menos de 4 letras.
 */
export function stem(word: string): string {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) return word.slice(0, -suffix.length);
  }
  return word;
}

/** Distância Damerau-Levenshtein, desistindo cedo quando passa de `max`. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = b.length;
  let prev2 = new Array<number>(n + 1).fill(0);
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Array<number>(n + 1);
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[n];
}

export function buildIndex(docs: readonly SearchDoc[]): SearchIndex {
  const post = new Map<string, Posting[]>();
  const pop = new Map<string, number>();
  docs.forEach((doc, d) => {
    const weights = new Map<string, number>();
    for (const field of doc.fields) {
      for (const t of tokens(field.text)) {
        // O campo mais forte manda; repetir a palavra no corpo soma pouco.
        const was = weights.get(t) ?? 0;
        weights.set(t, Math.max(was, field.weight) + (was > 0 ? 0.1 : 0));
      }
    }
    for (const [t, w] of weights) {
      const list = post.get(t) ?? [];
      list.push({ doc: d, w: Math.min(w, 12) });
      post.set(t, list);
      pop.set(t, (pop.get(t) ?? 0) + (w >= 5 ? 4 : 1));
    }
  });
  const vocab = [...post.keys()].sort();
  const sound = new Map<string, string[]>();
  for (const t of vocab) {
    const k = soundKey(t);
    const list = sound.get(k) ?? [];
    list.push(t);
    sound.set(k, list);
  }
  const stems = new Map<string, string[]>();
  for (const t of vocab) {
    if (t.length < 5 || /\d/.test(t)) continue;
    const k = stem(t);
    const list = stems.get(k) ?? [];
    list.push(t);
    stems.set(k, list);
  }
  return { ids: docs.map((d) => d.id), vocab, post, sound, stems, pop };
}

/** Primeiro índice de `vocab` que começa com `prefix` (busca binária). */
function lowerBound(vocab: readonly string[], prefix: string): number {
  let lo = 0;
  let hi = vocab.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (vocab[mid] < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** Palavras do índice que casam com uma palavra da busca, com a qualidade de 0 a 1. */
export function matchTerm(index: SearchIndex, q: string, typing: boolean): Map<string, number> {
  const out = new Map<string, number>();
  const put = (t: string, quality: number) => {
    if ((out.get(t) ?? 0) < quality) out.set(t, quality);
  };
  if (index.post.has(q)) put(q, 1);
  for (const t of index.sound.get(soundKey(q)) ?? []) put(t, 0.92);
  // Mesma família só com um começo comum de 5 letras: "diluição" ~ "diluir", mas "tratamento" não ~ "trato".
  if (q.length >= 5) for (const t of index.stems.get(stem(q)) ?? []) if (t.slice(0, 5) === q.slice(0, 5)) put(t, 0.8);

  // Começa com: a palavra que ainda está sendo digitada, ou abreviada de propósito ("ped", "intox", "conv").
  if ((typing && q.length >= 2) || q.length >= 3) {
    const quality = typing ? 0.86 : 0.72;
    for (let i = lowerBound(index.vocab, q); i < index.vocab.length && index.vocab[i].startsWith(q); i++) {
      put(index.vocab[i], quality);
    }
  }

  if (q.length >= 4) {
    const max = q.length >= 7 ? 2 : 1;
    const qs = soundKey(q);
    for (const t of index.vocab) {
      if (Math.abs(t.length - q.length) <= max) {
        const d = Math.min(editDistance(q, t, max), editDistance(qs, soundKey(t), max));
        if (d <= max) put(t, d === 1 ? 0.7 : 0.5);
      }
      // Ainda digitando e já errou: "anafilac" → "anafilaxia".
      if (typing && t.length > q.length && editDistance(q, t.slice(0, q.length), 1) <= 1) put(t, 0.55);
    }
  }
  return out;
}

/** Um pedaço da busca e o que pode valer por ele (a própria palavra ou os sinônimos). */
interface QueryGroup {
  label: string;
  alternatives: { words: string[]; factor: number }[];
}

export function parseQuery(query: string): QueryGroup[] {
  const words = tokens(query);
  // A palavra em digitação entra mesmo sendo curta ou "vazia": "se" pode virar "sepse".
  const raw = searchKey(query).split(" ");
  const typed = raw[raw.length - 1] ?? "";
  if (!/\s$/.test(query) && typed.length >= 2 && !STOP_TYPED.has(typed) && words[words.length - 1] !== typed) words.push(typed);
  const groups: QueryGroup[] = [];
  let i = 0;
  while (i < words.length) {
    // O sinônimo mais longo que começa aqui ("dor de cabeca" antes de "dor").
    let taken = 1;
    let expansions: string[][] = [];
    for (let len = Math.min(3, words.length - i); len >= 1; len--) {
      const found = expandSynonyms(words.slice(i, i + len).join(" "));
      if (found.length) {
        taken = len;
        expansions = found;
        break;
      }
    }
    const own = words.slice(i, i + taken);
    groups.push({
      label: own.join(" "),
      alternatives: [{ words: own, factor: 1 }, ...expansions.map((w) => ({ words: w, factor: 0.9 }))],
    });
    i += taken;
  }
  return groups;
}

export interface SearchHit {
  id: string;
  score: number;
  /** Todas as partes da busca casaram (e não só a maioria). */
  complete: boolean;
  /** Palavras do índice que casaram, para destacar no texto. */
  terms: string[];
}

export interface SearchResult {
  hits: SearchHit[];
  /** Quando nada casa: a busca corrigida para oferecer "Você quis dizer". */
  suggestion: string | null;
}

export function search(
  index: SearchIndex,
  query: string,
  options: {
    boost?: (id: string) => number;
    limit?: number;
    /**
     * "all" (padrão, a caixa de busca): todas as partes, ou todas menos uma.
     * "any" (para a IA): pergunta longa em texto livre — vale quem cobre mais
     * da pergunta, mesmo sem casar com "paciente" ou "alteração".
     */
    match?: "all" | "any";
  } = {}
): SearchResult {
  const groups = parseQuery(query);
  if (groups.length === 0) return { hits: [], suggestion: null };
  const typingLast = !/\s$/.test(query);
  const n = index.ids.length;
  const idf = (t: string) => Math.log(1 + n / (index.post.get(t)?.length ?? n));

  const perDoc = new Map<number, { total: number; groups: number; terms: Set<string> }>();
  groups.forEach((group, gi) => {
    const best = new Map<number, { score: number; terms: string[] }>();
    const lastGroup = gi === groups.length - 1;
    for (const alt of group.alternatives) {
      // Cada palavra da alternativa precisa casar no mesmo documento.
      let acc: Map<number, { score: number; terms: string[] }> | null = null;
      alt.words.forEach((word, wi) => {
        const typing = typingLast && lastGroup && alt.factor === 1 && wi === alt.words.length - 1;
        const docScores = new Map<number, { score: number; terms: string[] }>();
        for (const [term, quality] of matchTerm(index, word, typing)) {
          const s0 = quality * idf(term);
          for (const p of index.post.get(term) ?? []) {
            const s = s0 * p.w;
            const cur = docScores.get(p.doc);
            if (!cur || cur.score < s) docScores.set(p.doc, { score: s, terms: [term] });
          }
        }
        if (acc === null) acc = docScores;
        else {
          const next = new Map<number, { score: number; terms: string[] }>();
          for (const [d, v] of acc) {
            const other = docScores.get(d);
            if (other) next.set(d, { score: v.score + other.score, terms: [...v.terms, ...other.terms] });
          }
          acc = next;
        }
      });
      for (const [d, v] of acc ?? new Map()) {
        const s = v.score * alt.factor;
        const cur = best.get(d);
        if (!cur || cur.score < s) best.set(d, { score: s, terms: v.terms });
      }
    }
    for (const [d, v] of best) {
      const cur = perDoc.get(d) ?? { total: 0, groups: 0, terms: new Set<string>() };
      cur.total += v.score;
      cur.groups += 1;
      v.terms.forEach((t) => cur.terms.add(t));
      perDoc.set(d, cur);
    }
  });

  const need = groups.length;
  // Quem casa com todas as partes vale inteiro; quem deixa uma de fora entra
  // com desconto (um título certeiro ainda ganha de uma menção solta no corpo).
  const any = options.match === "any";
  const minGroups = any ? Math.max(1, Math.ceil(need * 0.3)) : need - (need > 1 ? 1 : 0);
  const hits: SearchHit[] = [...perDoc.entries()]
    .filter(([, v]) => v.groups >= minGroups)
    .map(([d, v]) => ({
      id: index.ids[d],
      score:
        v.total * (any ? (v.groups / need) ** 1.5 : v.groups === need ? 1 : 0.55) + (options.boost?.(index.ids[d]) ?? 0),
      complete: v.groups === need,
      terms: [...v.terms],
    }))
    .sort((a, b) => b.score - a.score);

  return {
    hits: hits.slice(0, options.limit ?? 60),
    suggestion: hits.length === 0 ? correct(index, query) : null,
  };
}

/** Cada palavra trocada pela mais provável do índice ("sepce choqe" → "sepse choque"). */
export function correct(index: SearchIndex, query: string): string | null {
  const words = tokens(query);
  let changed = false;
  const fixed = words.map((w) => {
    if (index.post.has(w)) return w;
    let best: string | null = null;
    let bestScore = 0;
    for (const [t, quality] of matchTerm(index, w, false)) {
      const s = quality * Math.log(2 + (index.pop.get(t) ?? 0));
      if (s > bestScore) {
        best = t;
        bestScore = s;
      }
    }
    if (best && best !== w) changed = true;
    return best ?? w;
  });
  return changed ? fixed.join(" ") : null;
}

/**
 * Como a palavra em digitação deve terminar: a mais provável que começa com
 * ela (a que mais aparece em títulos e medicamentos). Serve para o texto
 * fantasma que o Tab aceita.
 */
export function completeWord(index: SearchIndex, query: string): string | null {
  // Depois de espaço ou pontuação ("criança?") não há palavra sendo digitada.
  if (/[^\p{L}\p{N}]$/u.test(query)) return null;
  const typed = searchKey(query).split(" ").pop() ?? "";
  if (typed.length < 2) return null;
  let best: string | null = null;
  let bestPop = -1;
  for (let i = lowerBound(index.vocab, typed); i < index.vocab.length && index.vocab[i].startsWith(typed); i++) {
    const t = index.vocab[i];
    // Palavra de título pesa mais; palavra curta demais ("ser") não é o que se procura.
    const p = (index.pop.get(t) ?? 0) * (t.length >= 4 ? 1 : 0.1);
    if (t.length > typed.length && p > bestPop) {
      best = t;
      bestPop = p;
    }
  }
  return best;
}

/**
 * Divide um texto em pedaços para destacar as palavras que casaram. A
 * comparação é sem acento, mas o texto volta como estava.
 */
export function highlight(text: string, terms: readonly string[]): { text: string; hit: boolean }[] {
  if (terms.length === 0) return [{ text, hit: false }];
  const parts: { text: string; hit: boolean }[] = [];
  const re = /[\p{L}\p{N}]+/gu;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const key = searchKey(m[0]);
    const hit = key.length > 1 && terms.some((t) => key === t || (t.length >= 3 && key.startsWith(t)));
    if (!hit) continue;
    if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false });
    parts.push({ text: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false });
  return parts;
}

/** A primeira linha que tem uma das palavras que casaram — o trecho mostrado no resultado. */
export function bestLine(lines: readonly string[], terms: readonly string[]): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const line of lines) {
    const keys = new Set(tokens(line));
    let count = 0;
    for (const t of terms) if (keys.has(t)) count++;
    if (count > bestCount) {
      best = line;
      bestCount = count;
      if (count === terms.length) break;
    }
  }
  return best;
}
