import { DRIVE_PATTERNS, DRIVE_SOURCES, PRESCRIPTION_DRIVE } from "./data.ts";
import type { DriveEntry, DriveSection, DriveStatus } from "./types.ts";
import { conciseDiff, headlineLine } from "../revision-diff.ts";
import type { ConciseLine } from "../revision-diff.ts";
import type { RevisionHistory, RevisionSlide } from "../revision-slides.ts";
import { termsFor } from "../clinical-terms.ts";
import ORIGINAL_CARDS from "./originals.json" with { type: "json" };
import ORIGINALS_MAP from "./originals-map.json" with { type: "json" };

export type { DriveBlock, DriveEntry, DriveSection, DriveStatus } from "./types.ts";
export { DRIVE_PATTERNS, DRIVE_SOURCES, PRESCRIPTION_DRIVE };

/**
 * Drive de prescrições revisado: as condições do Drive de Prescrições
 * reescritas uma a uma pelas diretrizes atuais. O texto é da revisão Renova;
 * os cards originais do e-book (originals.json, extraídos por
 * scripts/prescription-drive/extract_originals.py) abrem o carrossel do
 * histórico de cada entrada, reproduzidos com autorização da autora. A fonte
 * do texto revisado é scripts/prescription-drive/drive-revisado.md.
 */
export const DRIVE_CREDIT = {
  basedOn: "Drive de Prescrições (Dra. Camilla Rocha)",
  original: "Drive de Prescrições · Dra. Camilla Rocha",
  reviewedAt: "1º de outubro de 2026",
} as const;

export interface DriveOriginalCard {
  title: string;
  /** Página no e-book. */
  page: number;
  lines: string[];
}

const CARDS = new Map((ORIGINAL_CARDS as DriveOriginalCard[]).map((c) => [c.title, c]));

/** Os cards do Drive original (e-book) que deram origem a uma entrada. */
export function driveOriginals(slug: string): DriveOriginalCard[] {
  return ((ORIGINALS_MAP as Record<string, string[]>)[slug] ?? []).flatMap((title) => CARDS.get(title) ?? []);
}

export const DRIVE_STATUS: Readonly<Record<DriveStatus, { label: string; icon: string; hint: string }>> = {
  mantido: { label: "Mantido", icon: "✅", hint: "só a forma mudou" },
  ajustado: { label: "Ajustado", icon: "✏️", hint: "dose, duração ou apresentação" },
  refeito: { label: "Refeito", icon: "⛔", hint: "a conduta do Drive estava errada ou desatualizada" },
};

/** O que a tela de busca recebe de cada entrada: enxuto, sem os blocos inteiros. */
export interface DriveDoc {
  slug: string;
  title: string;
  cid: string | null;
  status: DriveStatus;
  section: string;
  changed: string | null;
  /** Medicamentos das receitas, para buscar e mostrar. */
  drugs: string[];
  /** O texto da entrada em linhas curtas, para buscar e mostrar o trecho que casou. */
  lines: string[];
  /** Revisões que mudaram a entrada depois de ela entrar no app. */
  revs: number[];
  /** Outros nomes da condição (sinônimo, nome popular, sigla) — clinical-terms.ts. */
  names: string[];
  /** Sintomas e queixas, para a busca vaga. */
  symptoms: string[];
}

export interface DriveLocation {
  section: DriveSection;
  entry: DriveEntry;
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

const FLAT = PRESCRIPTION_DRIVE.flatMap((section) => section.entries.map((entry) => ({ section, entry })));

export interface RxLine {
  /** Cabeçalho acima do item ("USO ORAL", "SÍFILIS TARDIA…"), só no primeiro item abaixo dele. */
  heading: string | null;
  /** O número do item na receita (alternativas "— ou —" repetem o número). */
  n: number | null;
  name: string;
  quantity: string | null;
  /** Linhas da posologia; "— ou —" separa alternativas. */
  posology: string[];
}

/**
 * Uma receita do .md em itens. O formato é o de receituário:
 *
 *     USO ORAL
 *     1. Amoxicilina 500 mg ........ 30 cápsulas
 *        Tomar 1 cápsula de 8/8 h por 10 dias.
 *
 * Linha numerada sem recuo é item; linha com recuo é posologia do item;
 * o resto é cabeçalho.
 */
export function rxLines(rx: string): RxLine[] {
  const out: RxLine[] = [];
  let heading: string | null = null;
  for (const raw of rx.split("\n")) {
    if (!raw.trim()) continue;
    const item = /^(\d+)\.\s+(.+)$/.exec(raw);
    if (item) {
      const [name, quantity] = item[2].split(/\s\.{2,}\s*/);
      out.push({ heading, n: Number(item[1]), name: name.trim(), quantity: quantity?.trim() || null, posology: [] });
      heading = null;
    } else if (/^\s/.test(raw) && out.length) {
      out[out.length - 1].posology.push(raw.trim());
    } else {
      heading = heading ? `${heading} · ${raw.trim()}` : raw.trim();
    }
  }
  // Cabeçalho sem item embaixo (raro): vira um item só de texto.
  if (heading) out.push({ heading, n: null, name: "", quantity: null, posology: [] });
  return out;
}

/** "sai a dipirona…" → "Sai a dipirona…" (o .md escreve depois de "O que mudou:"). */
export function capitalize(s: string): string {
  return s.replace(/^(\*\*)?(\p{Ll})/u, (_, b = "", c: string) => `${b}${c.toUpperCase()}`);
}

function plain(s: string): string {
  return s.replace(/\*\*/g, "").replace(/\*/g, "");
}

export function driveDocs(): DriveDoc[] {
  return FLAT.map(({ section, entry }) => {
    const rx = entry.blocks.filter((b) => b.k === "rx").flatMap((b) => ("t" in b ? rxLines(b.t) : []));
    const lines = entry.blocks
      .flatMap((b) => (b.k === "rx" ? b.t.split("\n") : "t" in b ? [b.t] : "items" in b ? b.items : b.rows.map((r) => r.join(" · "))))
      .map((l) => plain(l).replace(/\s\.{2,}\s*/g, " · ").trim())
      .filter((l) => l.length > 3);
    return {
      slug: entry.slug,
      title: entry.title,
      cid: entry.cid,
      status: entry.status,
      section: section.title,
      changed: entry.changed ? capitalize(plain(entry.changed)) : null,
      drugs: [...new Set(rx.map((r) => r.name).filter(Boolean))],
      lines: entry.replaces ? [plain(entry.replaces), ...lines] : lines,
      revs: [...new Set(entry.revisions.map((r) => r.rev))],
      ...termsFor(entry.title),
    };
  });
}

/**
 * Quebra o "antes"/"agora" de uma revisão em linhas no ";" — menos o ";" entre
 * parênteses, como em "(máx. 20 mg se < 2 anos; 30 mg se 2–5 anos)".
 */
export function revisionLines(s: string | null): string[] | null {
  if (!s) return null;
  const lines: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth = Math.max(0, depth - 1);
    if (ch === ";" && depth === 0) {
      lines.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  lines.push(cur.trim());
  return lines.filter(Boolean);
}

/**
 * O histórico de uma entrada para a tela: a 2ª revisão (quando o Drive entrou
 * no app, comparado ao original) e as mudanças seguintes, com antes e depois.
 */
export function driveChanges(
  entry: DriveEntry
): { rev: number; text: string; before: string[] | null; after: string[] | null; concise: ConciseLine[] }[] {
  return [
    ...entry.revisions.map((r) => ({
      rev: r.rev,
      text: capitalize(r.text),
      before: revisionLines(r.before),
      after: revisionLines(r.after),
      concise: revisionConcise(r),
    })),
    ...(entry.changed
      ? [
          {
            rev: 2,
            text: `Entrou no app, reescrita em relação ao Drive original: ${capitalize(plain(entry.changed))}`,
            before: null,
            after: null,
            concise: [headlineLine(capitalize(plain(entry.changed)), `${DRIVE_STATUS[entry.status].label} ao entrar no app`)],
          },
        ]
      : []),
  ];
}

/** Só o que mudou numa revisão do Drive: o trecho trocado entre o "Antes" e o "Agora". */
function revisionConcise(r: { text: string; before: string | null; after: string | null }): ConciseLine[] {
  const parts = r.before && r.after ? conciseDiff(r.before, r.after) : [];
  return parts.length ? [{ parts }] : [headlineLine(capitalize(r.text))];
}

/**
 * O histórico de uma entrada para o carrossel embaixo dela: os cards do Drive
 * original (e-book) e cada mudança desde então, da mais antiga para a mais
 * nova — a 2ª revisão, quando o Drive entrou no app reescrito, e as seguintes.
 */
export function driveHistory(entry: DriveEntry): RevisionHistory {
  const originals: RevisionSlide[] = driveOriginals(entry.slug).map((card) => ({
    kind: "original",
    source: `${DRIVE_CREDIT.original} · p. ${card.page}`,
    title: card.title,
    lines: card.lines,
  }));
  const changes: RevisionSlide[] = driveChanges(entry)
    .sort((a, b) => a.rev - b.rev)
    .map((c) => ({ kind: "change", rev: c.rev, concise: c.concise, why: c.text, tone: "fix" }));
  return { slides: [...originals, ...changes], alert: null };
}

const markKey = (text: string) =>
  text
    .replace(/\*+/g, "")
    .replace(/…$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

/**
 * O que levar marca-texto numa entrada: os trechos que entraram depois de o
 * Drive chegar ao app (3ª revisão em diante), como chaves normalizadas. Uma
 * linha da entrada é marcada se contém o começo de algum deles.
 */
export function driveMarks(entry: DriveEntry): string[] {
  return entry.revisions
    .filter((r) => r.rev > 2)
    .flatMap((r) => revisionConcise(r).flatMap((line) => line.parts.filter((p) => p.k === "ins").map((p) => markKey(p.t).slice(0, 28))))
    .filter((k) => k.length >= 4);
}

/** Se a linha (texto da entrada) contém algum trecho marcado. */
export function isMarked(text: string, marks: readonly string[]): boolean {
  if (marks.length === 0) return false;
  const key = markKey(text);
  return marks.some((m) => key.includes(m));
}

/** Todas as mudanças do Drive feitas depois que ele entrou no app, para o histórico de revisões. */
export function driveRevisionLog() {
  return FLAT.flatMap(({ section, entry }) =>
    entry.revisions.map((r) => ({
      ...r,
      text: capitalize(r.text),
      slug: entry.slug,
      title: entry.title,
      section: section.title,
      concise: revisionConcise(r),
    }))
  );
}

export function findDriveEntry(slug: string): DriveLocation | null {
  const i = FLAT.findIndex((e) => e.entry.slug === slug);
  if (i < 0) return null;
  const ref = (e: (typeof FLAT)[number] | undefined) => (e ? { slug: e.entry.slug, title: e.entry.title } : null);
  return { ...FLAT[i], prev: ref(FLAT[i - 1]), next: ref(FLAT[i + 1]) };
}

export function driveSlugs(): string[] {
  return FLAT.map((e) => e.entry.slug);
}

export function driveStats() {
  const count = (s: DriveStatus) => FLAT.filter((e) => e.entry.status === s).length;
  return {
    sections: PRESCRIPTION_DRIVE.length,
    entries: FLAT.length,
    mantido: count("mantido"),
    ajustado: count("ajustado"),
    refeito: count("refeito"),
  };
}
