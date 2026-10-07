import { createHash } from "node:crypto";
import type { SearchDoc } from "./smart-search.ts";
import type { ConciseLine } from "./revision-diff.ts";
import type { RevisionHistory } from "./revision-slides.ts";
import { GUIDE_GROUPS, guideEntries } from "./clinical-guide.ts";
import { EMERGENCY_GUIDE, GUIDE_CREDIT, blockHistory, plantaoDocs, titleHistory, topicRevised } from "./emergency-guide/index.ts";
import type { GuideBlockKind } from "./emergency-guide/index.ts";
import {
  DRIVE_CREDIT,
  DRIVE_STATUS,
  PRESCRIPTION_DRIVE,
  driveDocs,
  driveHistory,
  driveMarks,
  isMarked,
  rxLines,
} from "./prescription-drive/index.ts";
import type { DriveBlock } from "./prescription-drive/index.ts";
import { guideItems, guideSearchDocs, itemLines } from "./guide-search.ts";
import type { GuideSource } from "./guide-search.ts";
import { SYNONYM_TABLE } from "./search-synonyms.ts";
import { CONDITION_TERMS, allTermsOf, conditionsFor, guidanceOf } from "./clinical-terms.ts";
import { CURRENT_REVISION, GUIDE_REVISIONS } from "./guide-revisions.ts";
import { TARJA_LABEL } from "./medications.ts";
import { searchKey } from "./normalize.ts";
import { driveTabRevisions, plantaoTabRevisions, receitasTabRevisions } from "./guide-tab-revisions.ts";
import type { TabRevision } from "./guide-tab-revisions.ts";

/**
 * O Guia clínico inteiro para o app Android, num arquivo só: as três abas já
 * prontas para desenhar (o marca-texto e o histórico de cada trecho
 * calculados aqui, iguais aos do site), o índice da busca e o que cada
 * revisão mudou. O app guarda o arquivo e funciona sem internet; a versão
 * (hash do conteúdo) diz se precisa baixar de novo.
 */

export interface AppRecipe {
  /** Id da busca: "receitas:Crise de enxaqueca". */
  id: string;
  /** Para as citações da Super Inteligência ("receita-<slug>#0"). */
  slug: string;
  name: string;
  cid: string;
  group: string;
  items: { name: string; quantity: string; posology: string; route: string; tarja: string | null; marked: boolean }[];
  orientation: { name: string; text: string } | null;
  history: RevisionHistory | null;
}

export interface AppTopic {
  id: string;
  slug: string;
  title: string;
  page: number;
  titleHistory: RevisionHistory | null;
  /** Mudanças na revisão atual. */
  revised: number;
  blocks: { k: GuideBlockKind; t: string; rows?: string[][]; history?: RevisionHistory }[];
}

interface Marked {
  t: string;
  marked: boolean;
}

/** Um trecho do Drive, já com o marca-texto do que mudou. `rx` é a receita item por item. */
export interface AppDriveBlock {
  k: DriveBlock["k"];
  t?: string;
  marked?: boolean;
  items?: Marked[];
  rows?: Marked[][];
  rx?: {
    heading: string | null;
    n: number | null;
    name: string;
    quantity: string | null;
    marked: boolean;
    /** Linhas de uso; `or` é o separador "— ou —" entre duas opções. */
    posology: (Marked & { or: boolean })[];
  }[];
}

export interface AppDriveEntry {
  id: string;
  slug: string;
  title: string;
  cid: string | null;
  cidMarked: boolean;
  statusLabel: string;
  blocks: AppDriveBlock[];
  source: Marked | null;
  history: RevisionHistory;
}

/** O que a lista de resultados mostra de cada item (título, onde fica, trecho). */
export interface AppSearchItem {
  id: string;
  source: GuideSource;
  title: string;
  where: string;
  cid: string | null;
  lines: string[];
}

export interface AppChangeGroup {
  title: string;
  /** Id do item no app ("plantao:sepse-e-choque-septico"), quando dá para abrir. */
  target: string | null;
  lines: readonly ConciseLine[];
}

/**
 * Uma condição para o "Escutar o paciente": todos os nomes e queixas
 * (clinical-terms + o vocabulário ampliado) e os itens das três abas onde ela
 * aparece.
 */
export interface AppCondition {
  key: string;
  /** O título mais curto entre os itens ("Enxaqueca"). */
  label: string;
  names: string[];
  symptoms: string[];
  /** Ids dos itens (busca) — receitas, plantão e Drive. */
  items: string[];
  /** O que perguntar ou examinar para confirmar a hipótese. */
  confirm: string[];
  /** Sinais de alarme que mudam a conduta. */
  alarm: string[];
}

export interface AppBundle {
  /** Hash do conteúdo: muda quando qualquer coisa do guia muda. */
  version: string;
  revision: { current: number; list: { n: number; date: string; label: string }[] };
  receitas: { groups: string[]; items: AppRecipe[] };
  plantao: {
    credit: { title: string; edition: string; publisher: string; authors: string[]; reviewedAt: string };
    chapters: { title: string; topics: AppTopic[] }[];
  };
  drive: { credit: { basedOn: string; original: string; reviewedAt: string }; sections: { title: string; entries: AppDriveEntry[] }[] };
  search: { synonyms: Record<string, readonly string[]>; docs: SearchDoc[]; items: AppSearchItem[] };
  conditions: AppCondition[];
  /** O que cada revisão mudou, da mais nova para a mais antiga, por aba. */
  changes: { rev: number; tabs: { tab: GuideSource; count: string; groups: AppChangeGroup[] }[] }[];
}

/** "Cistite (ITU baixa não complicada)" → "cistite-itu-baixa-nao-complicada" (o mesmo de chunks.ts). */
function recipeSlug(name: string): string {
  return searchKey(name).replace(/ /g, "-");
}

function marked(t: string, marks: readonly string[]): Marked {
  return { t, marked: isMarked(t, marks) };
}

function driveBlocks(blocks: readonly DriveBlock[], marks: readonly string[]): AppDriveBlock[] {
  return blocks.map((block): AppDriveBlock => {
    if (block.k === "rx") {
      return {
        k: "rx",
        rx: rxLines(block.t).map((item) => ({
          heading: item.heading,
          n: item.n,
          name: item.name,
          quantity: item.quantity,
          marked: item.name ? isMarked(`${item.name} ${item.quantity ?? ""}`, marks) : false,
          posology: item.posology.map((line) => ({ ...marked(line, marks), or: /^—\s*ou\s*—$/.test(line) })),
        })),
      };
    }
    if ("items" in block) return { k: block.k, items: block.items.map((item) => marked(item, marks)) };
    if ("rows" in block) return { k: "table", rows: block.rows.map((row) => row.map((cell) => marked(cell, marks))) };
    return { k: block.k, ...marked(block.t, marks) };
  });
}

/** O link de um grupo de mudanças no site → o id do item no app (orientação compartilhada não é item). */
function changeTarget(href: string | undefined, title: string, tab: GuideSource, recipes: ReadonlySet<string>): string | null {
  if (tab === "receitas") return recipes.has(title) ? `receitas:${title}` : null;
  const slug = href?.split("/").pop();
  return slug ? `${tab}:${slug}` : null;
}

function buildBundle(): Omit<AppBundle, "version"> {
  const entries = guideEntries();
  const data = { receitas: entries, plantao: plantaoDocs(), drive: driveDocs() };
  const items = guideItems(data);

  const receitas: AppRecipe[] = entries.map((e) => ({
    id: `receitas:${e.name}`,
    slug: recipeSlug(e.name),
    name: e.name,
    cid: e.cid,
    group: e.group,
    items: e.items.map((item, i) => ({
      name: item.name,
      quantity: item.quantity,
      posology: item.posology,
      route: item.route,
      tarja: item.tarja !== "livre" ? TARJA_LABEL[item.tarja] : null,
      marked: e.marked[i] ?? false,
    })),
    orientation: e.orientation,
    history: e.history,
  }));

  const chapters = EMERGENCY_GUIDE.map((chapter) => ({
    title: chapter.title,
    topics: chapter.topics.map(
      (topic): AppTopic => ({
        id: `plantao:${topic.slug}`,
        slug: topic.slug,
        title: topic.title,
        page: topic.page,
        titleHistory: titleHistory(topic),
        revised: topicRevised(topic),
        blocks: topic.blocks.map((b) => {
          const history = blockHistory(b, topic.page);
          return { k: b.k, t: b.t, ...(b.rows ? { rows: b.rows } : {}), ...(history ? { history } : {}) };
        }),
      })
    ),
  }));

  const sections = PRESCRIPTION_DRIVE.map((section) => ({
    title: section.title,
    entries: section.entries.map((entry): AppDriveEntry => {
      const marks = driveMarks(entry);
      return {
        id: `drive:${entry.slug}`,
        slug: entry.slug,
        title: entry.title,
        cid: entry.cid,
        cidMarked: entry.cid ? isMarked(entry.cid, marks) : false,
        statusLabel: DRIVE_STATUS[entry.status].label,
        blocks: driveBlocks(entry.blocks, marks),
        source: entry.source ? marked(`Fonte: ${entry.source}`, marks) : null,
        history: driveHistory(entry),
      };
    }),
  }));

  const searchItems: AppSearchItem[] = [...items.values()].map((item) => ({
    id: item.id,
    source: item.source,
    title: item.source === "receitas" ? item.entry.name : item.doc.title,
    where: item.source === "receitas" ? item.entry.group : item.source === "plantao" ? item.doc.chapter : item.doc.section,
    cid: item.source === "plantao" ? null : item.source === "receitas" ? item.entry.cid : item.doc.cid,
    lines: itemLines(item),
  }));

  const tabs: [GuideSource, TabRevision[]][] = [
    ["receitas", receitasTabRevisions(entries)],
    ["plantao", plantaoTabRevisions()],
    ["drive", driveTabRevisions()],
  ];
  const conditions: AppCondition[] = CONDITION_TERMS.flatMap((c) => {
    const found = searchItems.filter((item) => conditionsFor(item.title).some((x) => x.match[0] === c.match[0]));
    if (found.length === 0) return [];
    const { names, symptoms } = allTermsOf(c);
    const label = [...found].sort((a, b) => a.title.length - b.title.length)[0].title;
    return [{ key: c.match[0], label, names, symptoms, items: found.map((i) => i.id), ...guidanceOf(c) }];
  });

  const recipeNames = new Set(entries.map((e) => e.name));
  const changes = [...GUIDE_REVISIONS]
    .reverse()
    .map((r) => ({
      rev: r.n,
      tabs: tabs.flatMap(([tab, revisions]) =>
        revisions
          .filter((t) => t.rev === r.n)
          .map((t) => ({
            tab,
            count: t.count,
            groups: t.groups.map((g) => ({ title: g.title, target: changeTarget(g.href, g.title, tab, recipeNames), lines: g.lines })),
          }))
      ),
    }))
    .filter((r) => r.tabs.length > 0);

  return {
    revision: { current: CURRENT_REVISION, list: GUIDE_REVISIONS.map((r) => ({ n: r.n, date: r.date, label: r.label })) },
    receitas: { groups: [...GUIDE_GROUPS], items: receitas },
    plantao: {
      credit: {
        title: GUIDE_CREDIT.title,
        edition: GUIDE_CREDIT.edition,
        publisher: GUIDE_CREDIT.publisher,
        authors: [...GUIDE_CREDIT.authors],
        reviewedAt: GUIDE_CREDIT.reviewedAt,
      },
      chapters,
    },
    drive: { credit: { ...DRIVE_CREDIT }, sections },
    search: { synonyms: SYNONYM_TABLE, docs: guideSearchDocs(data), items: searchItems },
    conditions,
    changes,
  };
}

let cached: { bundle: AppBundle; json: string } | null = null;

/** O pacote (montado uma vez por instância: o guia vem do código, só muda com um deploy). */
export function appBundle(): { bundle: AppBundle; json: string } {
  if (!cached) {
    const body = buildBundle();
    const version = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16);
    const bundle: AppBundle = { version, ...body };
    cached = { bundle, json: JSON.stringify(bundle) };
  }
  return cached;
}
