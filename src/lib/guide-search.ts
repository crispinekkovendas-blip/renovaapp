import { bestLine, tokens } from "./smart-search.ts";
import type { SearchDoc, SearchHit } from "./smart-search.ts";
import type { GuideEntry } from "./clinical-guide.ts";
import type { DriveDoc } from "./prescription-drive/index.ts";
import { plantaoSearchDoc } from "./emergency-guide/search.ts";
import type { PlantaoDoc } from "./emergency-guide/search.ts";

/**
 * A busca do Guia clínico, num lugar só: os campos de cada aba e a busca
 * única, que procura nas três ao mesmo tempo. A tela e os testes buscam do
 * mesmo jeito. Só tipos dos outros módulos — isto vai para o navegador e não
 * pode puxar os dados do guia junto.
 *
 * Pesos: título 10, outros nomes da condição 8, remédios 5, sintomas 4,
 * grupo ou seção 3, texto 1.
 */

export function receitaSearchDoc(e: GuideRecipe): SearchDoc {
  return {
    id: e.name,
    fields: [
      { text: `${e.name} ${e.cid}`, weight: 10 },
      { text: e.terms.names.join(" "), weight: 8 },
      { text: e.items.map((i) => i.name).join(" "), weight: 5 },
      { text: e.terms.symptoms.join(" "), weight: 4 },
      { text: e.group, weight: 3 },
      { text: [...e.items.map((i) => i.posology), e.orientation?.text ?? ""].join(" "), weight: 1 },
    ],
  };
}

export function driveSearchDoc(d: DriveDoc): SearchDoc {
  return {
    id: d.slug,
    fields: [
      { text: `${d.title} ${d.cid ?? ""}`, weight: 10 },
      { text: d.names.join(" "), weight: 8 },
      { text: d.drugs.join(" "), weight: 5 },
      { text: d.symptoms.join(" "), weight: 4 },
      { text: d.section, weight: 3 },
      { text: `${d.changed ?? ""} ${d.lines.join(" ")}`, weight: 1 },
    ],
  };
}

// ── A busca única ────────────────────────────────────────────────────────

export type GuideSource = "receitas" | "plantao" | "drive";

/** A receita pronta como vai ao navegador: sem a lista de mudanças, que só a página Revisões usa (no servidor). */
export type GuideRecipe = Omit<GuideEntry, "changes">;

/** O Guia clínico inteiro, montado no servidor uma vez para a seção toda. */
export interface GuideData {
  receitas: GuideRecipe[];
  plantao: PlantaoDoc[];
  drive: DriveDoc[];
}

/** Um resultado da busca única, com a aba de onde veio. */
export type GuideItem =
  | { id: string; source: "receitas"; entry: GuideRecipe }
  | { id: string; source: "plantao"; doc: PlantaoDoc }
  | { id: string; source: "drive"; doc: DriveDoc };

/** Como a fonte aparece em cada resultado. */
export const SOURCE_TAG: Readonly<Record<GuideSource, string>> = {
  receitas: "Receita pronta",
  plantao: "Plantão",
  drive: "Drive",
};

/** A aba de cada caminho; fora delas (tópico, entrada, Revisões) não há caixa de busca. */
export const TAB_SOURCE: Readonly<Record<string, GuideSource>> = {
  "/guia": "receitas",
  "/guia/plantao": "plantao",
  "/guia/drive": "drive",
};

/** "receitas:Crise de enxaqueca", "plantao:enxaqueca", "drive:enxaqueca": o mesmo assunto existe em mais de uma aba. */
export function guideId(source: GuideSource, key: string): string {
  return `${source}:${key}`;
}

export function guideItems(data: GuideData): Map<string, GuideItem> {
  const items: GuideItem[] = [
    ...data.receitas.map((entry) => ({ id: guideId("receitas", entry.name), source: "receitas" as const, entry })),
    ...data.plantao.map((doc) => ({ id: guideId("plantao", doc.slug), source: "plantao" as const, doc })),
    ...data.drive.map((doc) => ({ id: guideId("drive", doc.slug), source: "drive" as const, doc })),
  ];
  return new Map(items.map((item) => [item.id, item]));
}

/** Os documentos das três abas num índice só: com o mesmo peso por campo, a nota de uma aba vale a da outra. */
export function guideSearchDocs(data: GuideData): SearchDoc[] {
  const tagged = (source: GuideSource, doc: SearchDoc): SearchDoc => ({ ...doc, id: guideId(source, doc.id) });
  return [
    ...data.receitas.map((e) => tagged("receitas", receitaSearchDoc(e))),
    ...data.plantao.map((d) => tagged("plantao", plantaoSearchDoc(d))),
    ...data.drive.map((d) => tagged("drive", driveSearchDoc(d))),
  ];
}

/** CID digitado ("N30", "j03.9"): casa pelo começo do código. */
const CID = /^[a-z]\d{1,2}(\.?\d)?$/i;

/** Receitas e entradas do Drive cujo CID começa com o que foi digitado (o plantão não tem CID). */
export function cidMatches(data: GuideData, query: string): string[] {
  const q = query.trim();
  if (!CID.test(q)) return [];
  const code = q.toUpperCase().replace(/[\s.]/g, "");
  const has = (cid: string | null) => (cid ?? "").replace(/\./g, "").split(/\s*\/\s*/).some((c) => c.startsWith(code));
  return [
    ...data.receitas.filter((e) => has(e.cid)).map((e) => guideId("receitas", e.name)),
    ...data.drive.filter((d) => has(d.cid)).map((d) => guideId("drive", d.slug)),
  ];
}

/**
 * Os resultados da busca em ordem. Na mesma relevância, a aba aberta vem
 * antes: quem busca "enxaqueca" no Plantão vê primeiro o tópico do plantão;
 * nas Receitas, a receita pronta.
 */
export function orderHits(hits: readonly SearchHit[], tab: GuideSource | null): SearchHit[] {
  const weight = (h: SearchHit) => h.score * (tab && h.id.startsWith(`${tab}:`) ? 1.15 : 1);
  return [...hits].sort((a, b) => weight(b) - weight(a));
}

/** As linhas de onde sai o trecho mostrado no resultado — inclusive o nome popular ou o sintoma que casou. */
export function itemLines(item: GuideItem): string[] {
  const why = (names: readonly string[], symptoms: readonly string[]) => [
    ...names.map((n) => `Também chamado: ${n}`),
    ...symptoms.map((s) => `Sintoma: ${s}`),
  ];
  if (item.source === "receitas") {
    const e = item.entry;
    return [e.items.map((i) => i.name).join(" · "), ...e.items.map((i) => `${i.name}: ${i.posology}`), ...why(e.terms.names, e.terms.symptoms)];
  }
  if (item.source === "plantao") {
    const d = item.doc;
    return [...d.drugs, ...d.subs, ...d.lines, ...why(d.names, d.symptoms)];
  }
  const d = item.doc;
  return [...d.drugs, ...d.lines, ...why(d.names, d.symptoms)];
}

/**
 * O trecho que explica um resultado e as palavras a destacar: as que casaram
 * no índice e as que o médico digitou. Com as digitadas, "ardência para
 * urinar" mostra "Sintoma: ardência para urinar", e não só o nome parecido.
 */
export function resultSnippet(item: GuideItem, terms: readonly string[], query: string): { line: string | null; marks: string[] } {
  const marks = [...new Set([...terms, ...tokens(query)])];
  const title = item.source === "receitas" ? item.entry.name : item.doc.title;
  const line = marks.length ? bestLine(itemLines(item), marks) : null;
  return { line: line && line !== title ? line : null, marks };
}
