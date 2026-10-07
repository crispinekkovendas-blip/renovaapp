import type { ComposerTemplate } from "./composer.ts";

/**
 * O rail do compositor (Perfil, Histórico, Modelos) e a memória da pilha no
 * navegador. Só funções puras: as chaves de sessionStorage, o agrupamento
 * do histórico por ano, a data curta das linhas e o filtro dos modelos. O
 * estado em React fica em composer-rail.tsx / emit-composer.tsx.
 */

/* ---------- Gavetas ---------- */

export type RailDrawer = "perfil" | "historico" | "modelos";

export const RAIL_DRAWERS: ReadonlyArray<{ id: RailDrawer; label: string }> = [
  { id: "perfil", label: "Perfil" },
  { id: "historico", label: "Histórico" },
  { id: "modelos", label: "Modelos" },
];

export function isRailDrawer(value: unknown): value is RailDrawer {
  return value === "perfil" || value === "historico" || value === "modelos";
}

/* ---------- sessionStorage ---------- */

/** Qual gaveta estava aberta (uma chave só, para qualquer paciente). */
export const RAIL_STORAGE_KEY = "renova_emit_rail";

const STACK_STORAGE_PREFIX = "renova_emit_stack_";

/** Prefixo das pilhas guardadas de um paciente — a tela "pronto" apaga todas. */
export function stackStorageKeyPrefix(patientId: number): string {
  return `${STACK_STORAGE_PREFIX}${patientId}_`;
}

/** A pilha de um paciente num atendimento (0 = sem atendimento vinculado). */
export function stackStorageKey(patientId: number, encounterId: number | null | undefined): string {
  return `${stackStorageKeyPrefix(patientId)}${encounterId ?? 0}`;
}

/* ---------- Histórico ---------- */

export interface YearGroup<T> {
  year: string;
  items: T[];
}

/**
 * Agrupa por ano mantendo a ordem em que os itens vieram (a lista já chega
 * do mais recente ao mais antigo); os anos aparecem na ordem do primeiro
 * item de cada um. Data sem ano legível cai em "Sem data".
 */
export function groupByYear<T>(
  items: ReadonlyArray<T>,
  dateOf: (item: T) => string | null | undefined
): YearGroup<T>[] {
  const groups: YearGroup<T>[] = [];
  const byYear = new Map<string, YearGroup<T>>();
  for (const item of items) {
    const match = /^(\d{4})/.exec(dateOf(item) ?? "");
    const year = match ? match[1] : "Sem data";
    let group = byYear.get(year);
    if (!group) {
      group = { year, items: [] };
      byYear.set(year, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}

export const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"] as const;

/** "2026-09-16" → "16 set". Qualquer outra coisa vira "—". */
export function shortDayMonth(iso: string | null | undefined): string {
  const match = /^\d{4}-(\d{2})-(\d{2})/.exec(iso ?? "");
  if (!match) return "—";
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "—";
  return `${day} ${MONTHS_SHORT[month - 1]}`;
}

/* ---------- Modelos ---------- */

export type TemplateFilter = "todos" | "meus" | "clinica" | "protocolos";

export const TEMPLATE_FILTERS: ReadonlyArray<{ id: TemplateFilter; label: string }> = [
  { id: "todos", label: "Todos" },
  { id: "meus", label: "Meus" },
  { id: "clinica", label: "Da clínica" },
  { id: "protocolos", label: "Protocolos" },
];

export function isTemplateFilter(value: unknown): value is TemplateFilter {
  return value === "todos" || value === "meus" || value === "clinica" || value === "protocolos";
}

/** Minúsculas, sem acentos e sem espaços nas pontas — para buscar "atestao" e achar "Atestação". */
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * A lista da gaveta Modelos: o filtro escolhe o escopo (ou só protocolos) e
 * a busca casa com o nome, sem caixa nem acento. Ordem de entrada mantida.
 */
export function filterTemplates<T extends Pick<ComposerTemplate, "name" | "kind" | "scope">>(
  templates: ReadonlyArray<T>,
  query: string,
  filter: TemplateFilter
): T[] {
  const q = normalizeSearch(query);
  return templates.filter((t) => {
    if (filter === "meus" && t.scope !== "meu") return false;
    if (filter === "clinica" && t.scope !== "clinica") return false;
    if (filter === "protocolos" && t.kind !== "protocolo") return false;
    return q === "" || normalizeSearch(t.name).includes(q);
  });
}
