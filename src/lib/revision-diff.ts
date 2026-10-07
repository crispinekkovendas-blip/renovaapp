/**
 * O "o que mudou" enxuto das revisões do guia. Compara o texto de antes com o
 * de agora palavra a palavra e devolve só o trecho que mudou, com poucas
 * palavras de contexto — "máxima de ~~12 mg~~ → 0,3 mg/kg (sem ultrapassar…)".
 * Quando não há antes e depois (aviso, orientação), fica a primeira frase.
 * O motivo e o texto inteiro ficam no "Ver detalhes".
 */

export type DiffKind = "eq" | "del" | "ins" | "gap";

export interface DiffPart {
  k: DiffKind;
  t: string;
  /** Havia espaço antes deste pedaço no texto. */
  sp?: boolean;
}

/** Uma linha do resumo: um rótulo opcional ("Saiu", "Aviso", o remédio) e os pedaços. */
export interface ConciseLine {
  label?: string;
  parts: DiffPart[];
}

interface Tok {
  /** Espaço antes da palavra. */
  sp: boolean;
  w: string;
}

// Números com vírgula, ponto, barra ou dois-pontos ("0,05", "1.000", "8/8", "1:4") são uma palavra só;
// "mg/2" são três ("mg", "/", "2").
const TOKEN = /(\s*)(\p{N}+(?:[.,:/]\p{N}+)*%?|[\p{L}\p{N}]+|[^\s\p{L}\p{N}])/gu;
const MAX_TOKENS = 600;

function tokenize(text: string): Tok[] {
  return [...text.matchAll(TOKEN)].map((m) => ({ sp: m[1].length > 0, w: m[2] }));
}

const isWord = (t: Tok) => /[\p{L}\p{N}]/u.test(t.w);
const words = (toks: readonly Tok[]) => toks.filter(isWord).length;

// A palavra igual guarda as duas versões: o espaço em volta dela pode ser outro em cada texto.
type Op = { k: "eq"; a: Tok; b: Tok } | { k: "del" | "ins"; tok: Tok };

/** Maior subsequência comum, palavra a palavra. */
function lcs(a: readonly Tok[], b: readonly Tok[]): Op[] {
  const n = a.length;
  const m = b.length;
  const w = m + 1;
  const dp = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * w + j] = a[i].w === b[j].w ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
    }
  }
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i].w === b[j].w) {
      ops.push({ k: "eq", a: a[i], b: b[j] });
      i++;
      j++;
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) ops.push({ k: "del", tok: a[i++] });
    else ops.push({ k: "ins", tok: b[j++] });
  }
  while (i < n) ops.push({ k: "del", tok: a[i++] });
  while (j < m) ops.push({ k: "ins", tok: b[j++] });
  return ops;
}

type Run = { k: "eq"; a: Tok[]; toks: Tok[] } | { k: "chg"; del: Tok[]; ins: Tok[] };

function toRuns(ops: readonly Op[]): Run[] {
  const runs: Run[] = [];
  for (const op of ops) {
    const last = runs[runs.length - 1];
    if (op.k === "eq") {
      if (last?.k === "eq") {
        last.a.push(op.a);
        last.toks.push(op.b);
      } else runs.push({ k: "eq", a: [op.a], toks: [op.b] });
    } else {
      let chg = last?.k === "chg" ? last : null;
      if (!chg) {
        chg = { k: "chg", del: [], ins: [] };
        runs.push(chg);
      }
      (op.k === "del" ? chg.del : chg.ins).push(op.tok);
    }
  }
  return runs;
}

/**
 * Junta mudanças separadas por uma ou duas palavras iguais ("de", "a", "mL"):
 * "~~20-40 mL a cada 12 horas~~ → 25 mL a cada 1 a 2 horas" lê melhor que
 * cinco trocas picadas.
 */
function cleanup(runs: Run[]): Run[] {
  const out = [...runs];
  for (let i = 1; i < out.length - 1; i++) {
    const r = out[i];
    const prev = out[i - 1];
    const next = out[i + 1];
    if (r.k === "eq" && prev.k === "chg" && next.k === "chg" && words(r.toks) <= 2) {
      const merged: Run = { k: "chg", del: [...prev.del, ...r.a, ...next.del], ins: [...prev.ins, ...r.toks, ...next.ins] };
      out.splice(i - 1, 3, merged);
      i = Math.max(0, i - 2);
    }
  }
  return out;
}

function text(toks: readonly Tok[]): string {
  return toks.map((t, i) => (i > 0 && t.sp ? " " : "") + t.w).join("");
}

/** As primeiras `n` palavras (com a pontuação no meio); "…" se cortou — sem pontuação solta antes do "…". */
function head(toks: readonly Tok[], n: number): { toks: Tok[]; cut: boolean } {
  let count = 0;
  for (let i = 0; i < toks.length; i++) {
    if (isWord(toks[i]) && ++count > n) {
      let end = i;
      while (end > 0 && !isWord(toks[end - 1])) end--;
      return { toks: toks.slice(0, end), cut: true };
    }
  }
  return { toks: [...toks], cut: false };
}

/** As últimas `n` palavras; "…" se cortou — sem pontuação solta depois do "…". */
function tail(toks: readonly Tok[], n: number): { toks: Tok[]; cut: boolean } {
  let count = 0;
  for (let i = toks.length - 1; i >= 0; i--) {
    if (isWord(toks[i]) && ++count > n) {
      let start = i + 1;
      while (start < toks.length && !isWord(toks[start])) start++;
      return { toks: toks.slice(start), cut: true };
    }
  }
  return { toks: [...toks], cut: false };
}

const CONTEXT = 3;
const MAX_CHANGE = 14;
const MAX_HUNKS = 4;

function part(k: DiffKind, toks: readonly Tok[], cut = false): DiffPart {
  return { k, t: text(toks) + (cut ? "…" : ""), sp: toks[0]?.sp ?? false };
}

/**
 * O que mudou de `before` para `after`, enxuto: só os trechos trocados, com
 * até três palavras de contexto de cada lado e "…" no que ficou de fora.
 * Texto quase todo reescrito vira "começo do antigo → começo do novo".
 */
export function conciseDiff(before: string, after: string): DiffPart[] {
  const a = tokenize(before).slice(0, MAX_TOKENS);
  const b = tokenize(after).slice(0, MAX_TOKENS);
  const ops = lcs(a, b);
  const same = words(ops.flatMap((o) => (o.k === "eq" ? [o.b] : [])));
  const longest = Math.max(words(a), words(b));
  if (same === longest && words(a) === words(b)) return [];
  if (longest > 6 && same / longest < 0.34) {
    const old = head(a, 8);
    const now = head(b, 16);
    return [part("del", old.toks, old.cut), part("ins", now.toks, now.cut)];
  }

  const runs = cleanup(toRuns(ops));
  const parts: DiffPart[] = [];
  let hunks = 0;
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i];
    if (r.k === "eq") {
      const first = i === 0;
      const last = i === runs.length - 1;
      if (first) {
        const keep = tail(r.toks, CONTEXT);
        if (keep.cut) parts.push({ k: "gap", t: "…" });
        if (keep.toks.length) parts.push(part("eq", keep.toks));
      } else if (last) {
        const keep = head(r.toks, CONTEXT);
        if (keep.toks.length) parts.push(part("eq", keep.toks));
        if (keep.cut) parts.push({ k: "gap", t: "…", sp: true });
      } else if (words(r.toks) <= CONTEXT * 2 + 1) {
        parts.push(part("eq", r.toks));
      } else {
        parts.push(part("eq", head(r.toks, CONTEXT).toks));
        parts.push({ k: "gap", t: "…", sp: true });
        parts.push(part("eq", tail(r.toks, CONTEXT).toks));
      }
    } else {
      if (++hunks > MAX_HUNKS) {
        parts.push({ k: "gap", t: "…", sp: true });
        break;
      }
      if (r.del.length) {
        const d = head(r.del, MAX_CHANGE);
        parts.push(part("del", d.toks, d.cut));
      }
      if (r.ins.length) {
        const n = head(r.ins, MAX_CHANGE);
        parts.push(part("ins", n.toks, n.cut));
      }
    }
  }
  return parts;
}

const ABBREVIATION = /(?:^|[\s(])(?:máx|mín|ex|aprox|obs|p|pág|cap|vol|dr|dra|sr|sra|etc|vs|cf|n|nº)$/i;

/**
 * A primeira frase de um texto — até o primeiro ": " ou ". " fora de
 * parênteses e aspas —, cortada em `max` caracteres. É o resumo de avisos e
 * orientações, que não têm um "antes → agora".
 */
export function headline(full: string, max = 150): string {
  const s = full.trim();
  let depth = 0;
  let quoted = false;
  let cut = s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "“") depth++;
    else if (c === ")" || c === "”") depth = Math.max(0, depth - 1);
    else if (c === '"') quoted = !quoted;
    else if (depth === 0 && !quoted && (c === ":" || c === ".") && s[i + 1] === " " && i >= 12 && !ABBREVIATION.test(s.slice(0, i))) {
      // "Não suspender de rotina: …" — curto demais para dizer o quê; segue até o fim da frase.
      if (c === ":" && i < 40) continue;
      cut = c === "." ? i + 1 : i;
      break;
    }
  }
  const first = s.slice(0, cut).trim();
  if (first.length <= max) return first;
  const short = first.slice(0, max);
  return `${short.slice(0, short.lastIndexOf(" ") > max * 0.6 ? short.lastIndexOf(" ") : max).replace(/[\s,;:(—–-]+$/, "")}…`;
}

/** Uma linha só de texto (orientação), com rótulo opcional: a primeira frase. */
export function headlineLine(full: string, label?: string, k: "eq" | "del" = "eq"): ConciseLine {
  return { label, parts: [{ k, t: headline(full) }] };
}

/** Uma linha com o texto inteiro — os avisos do guia saem sempre completos, nunca cortados. */
export function fullLine(text: string, label?: string, k: "eq" | "del" = "eq"): ConciseLine {
  return { label, parts: [{ k, t: text.trim() }] };
}

/** "Amoxicilina 500 mg · 21 cápsulas — Tomar…" → "Amoxicilina 500 mg". */
function itemName(line: string): string {
  return line.split(" · ")[0];
}

function itemRest(line: string): string {
  return line.slice(itemName(line).length).replace(/^ · /, "");
}

/**
 * O que mudou numa receita (uma linha por remédio, no formato de
 * history.json): remédio que mudou — só o trecho trocado —, o que entrou e o
 * que saiu.
 */
export function conciseItems(before: readonly string[], after: readonly string[]): ConciseLine[] {
  const usedBefore = new Set<number>();
  const pairs: { b: string | null; a: string }[] = after.map((a) => {
    const i = before.findIndex((b, k) => !usedBefore.has(k) && itemName(b) === itemName(a));
    if (i < 0) return { b: null, a };
    usedBefore.add(i);
    return { b: before[i], a };
  });
  const removed = before.filter((_, k) => !usedBefore.has(k));
  const added = pairs.filter((p) => p.b === null);

  // Remédio que trocou de nome no mesmo lugar ("Monouril" → "Monuril"): compara a linha inteira.
  if (removed.length === 1 && added.length === 1) {
    const parts = conciseDiff(removed[0], added[0].a);
    const kinds = new Set(parts.map((p) => p.k));
    if (kinds.has("eq")) {
      added[0].b = removed[0];
      removed.length = 0;
    }
  }

  const lines: ConciseLine[] = [];
  for (const { b, a } of pairs) {
    if (b === a) continue;
    if (b === null) {
      const rest = itemRest(a).split(" — ")[1] ?? "";
      lines.push({ label: "Entrou", parts: [{ k: "ins", t: [itemName(a), headline(rest, 70)].filter(Boolean).join(" — ") }] });
    } else if (itemName(b) === itemName(a)) {
      const parts = conciseDiff(itemRest(b), itemRest(a));
      if (parts.length) lines.push({ label: itemName(a), parts });
    } else {
      const parts = conciseDiff(b, a);
      if (parts.length) lines.push({ parts });
    }
  }
  for (const b of removed) lines.push({ label: "Saiu", parts: [{ k: "del", t: itemName(b) }] });
  return lines;
}

/**
 * O resumo em texto puro, para copiar e colar no WhatsApp: o que saiu entre
 * ~til~ (riscado lá), o que entrou entre *asteriscos* (negrito) — "máxima de
 * ~12 mg~ → *0,3 mg/kg*".
 */
export function plainLine(line: ConciseLine): string {
  let out = "";
  line.parts.forEach((p, i) => {
    const prev = line.parts[i - 1];
    const sep = i === 0 ? "" : p.k === "ins" && prev?.k === "del" ? " → " : p.sp ? " " : "";
    const t = p.k === "del" ? `~${p.t}~` : p.k === "ins" ? `*${p.t}*` : p.t;
    out += sep + t;
  });
  return line.label ? `${line.label}: ${out}` : out;
}
