import { searchKey } from "./normalize.ts";
import { DOSES } from "./rx-library/doses.ts";
import { RX_PROTOCOLS } from "./rx-library/protocols.ts";
import { RX_PROTOCOL_GROUPS } from "./rx-library/types.ts";
import type { DoseEntry, DoseOption, RxProtocol, RxProtocolGroup } from "./rx-library/types.ts";
import type { PrescriptionItem } from "./prescription.ts";

/**
 * Posologia a um clique: as sugestões da bula por apresentação, as receitas
 * prontas por condição e o que o próprio médico já receitou.
 *
 * O casamento com o catálogo é por **substância + concentração**, que é como a
 * busca do receituário colapsa as 25 mil linhas da CMED. A CMED escreve a mesma
 * concentração de muitos jeitos ("1 G", "1000 MG", "(50 + 12,5) MG",
 * "50 MG + 12,5 MG"), então as duas pontas passam por `concKey`.
 */

export { DOSES, RX_PROTOCOLS, RX_PROTOCOL_GROUPS };
export type { DoseEntry, DoseOption, RxProtocol, RxProtocolGroup };

/** Por unidade de medida por (mL, g, dose…), com a quantidade quando há: "5 ML". */
const PER = /\/\s*(\d+(?:\.\d+)?)?\s*(ml|g|dose|gota|jato|l)\b/g;

/**
 * "(50 + 12,5) MG" e "50 MG + 12,5 MG" → "12.5+50mg"; "1 G" → "1000mg";
 * "1.200.000 UI" → "1200000ui"; "500 MG / ML" → "500mg/ml".
 *
 * Os números saem ordenados: a CMED não mantém a ordem dos componentes entre
 * laboratórios, e o que distingue a apresentação é o conjunto.
 */
export function concKey(raw: string | null | undefined): string {
  if (!raw) return "";
  let s = raw
    .toLowerCase()
    .replace(/µg/g, "mcg")
    // Ponto de milhar ("1.200.000") some; vírgula decimal vira ponto.
    .replace(/(\d)\.(?=\d{3}(?!\d))/g, "$1")
    .replace(/,/g, ".");

  let per = "";
  s = s.replace(PER, (_, amount: string | undefined, unit: string) => {
    per = `/${amount ? Number(amount) : ""}${unit}`;
    return " ";
  });

  // "(50 + 12,5) MG": a unidade pode vir depois do parêntese. "U" é UI escrito curto.
  const rawUnit = /\d\s*\)?\s*(mcg|mg|ui|u|g|%)(?![a-z])/.exec(s)?.[1] ?? "";
  const unit = rawUnit === "u" ? "ui" : rawUnit;
  let numbers = (s.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
  let finalUnit = unit;
  if (unit === "g" && !per) {
    numbers = numbers.map((n) => Math.round(n * 1000 * 1000) / 1000);
    finalUnit = "mg";
  }
  return `${numbers.sort((a, b) => a - b).join("+")}${finalUnit}${per}`;
}

/** Os componentes de "DIPIRONA MONOIDRATADA;BUTILBROMETO DE ESCOPOLAMINA", já em chave de busca. */
function components(substance: string): string[] {
  return substance
    .split(/[;+]/)
    .map((part) => ` ${searchKey(part)} `)
    .filter((part) => part.trim() !== "");
}

/**
 * Cada palavra da entrada tem de estar num componente diferente, e o número de
 * componentes tem de bater: "amoxicilina" não casa com a associação com
 * clavulanato, e "prednisona" não casa com "prednisolona" (palavra inteira).
 */
function substanceMatches(entry: DoseEntry, substance: string): boolean {
  const parts = components(substance);
  if (parts.length !== entry.substance.length) return false;
  const free = [...parts];
  for (const word of entry.substance) {
    const i = free.findIndex((part) => part.includes(` ${word} `));
    if (i < 0) return false;
    free.splice(i, 1);
  }
  return true;
}

/** "por 14 dias" → 14; "por 8 semanas" → 56. Sem duração, null. */
function durationDays(posology: string): number | null {
  const m = /por (\d+) (dias|semanas|meses)/.exec(posology);
  if (!m) return null;
  return Number(m[1]) * (m[2] === "semanas" ? 7 : m[2] === "meses" ? 30 : 1);
}

/**
 * A primeira posologia é a padrão (é a que entra ao adicionar) e fica na
 * frente; as outras seguem em ordem de duração — 5, 7, 10, 14 dias — com as
 * sem duração (se dor, uso contínuo) no fim, na ordem da biblioteca.
 */
export function orderedOptions(options: readonly DoseOption[]): DoseOption[] {
  const [first, ...rest] = options;
  if (!first) return [];
  const sorted = rest
    .map((option, i) => ({ option, i, days: durationDays(option.posology) }))
    .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity) || a.i - b.i)
    .map(({ option }) => option);
  return [first, ...sorted];
}

function concKeys(entry: DoseEntry): string[] {
  return (typeof entry.conc === "string" ? [entry.conc] : entry.conc).map(concKey);
}

export function doseEntryFor(
  substance: string | null | undefined,
  concentration: string | null | undefined
): DoseEntry | null {
  if (!substance) return null;
  const key = concKey(concentration);
  if (!key) return null;
  return DOSES.find((entry) => concKeys(entry).includes(key) && substanceMatches(entry, substance)) ?? null;
}

/**
 * Sugestões para um item já na receita. O item guarda o rótulo
 * ("AMOXICILINA TRI-HIDRATADA 500 MG") e a concentração à parte; tirando a
 * concentração do fim do rótulo sobra a substância.
 */
export function suggestionsForItem(item: Pick<PrescriptionItem, "name" | "concentration">): readonly DoseOption[] {
  const byName = DOSES.find((entry) => entry.name === item.name);
  if (byName) return orderedOptions(byName.options);
  if (!item.concentration) return [];
  const name = item.name.trim();
  const substance = name.toUpperCase().endsWith(item.concentration.toUpperCase())
    ? name.slice(0, name.length - item.concentration.length)
    : name;
  return orderedOptions(doseEntryFor(substance, item.concentration)?.options ?? []);
}

/**
 * O que um clique numa sugestão muda no item. A quantidade só muda se estava
 * em branco ou se era a da sugestão anterior (`previous`): trocar "7 dias" por
 * "10 dias" leva junto 21 → 30 cápsulas, mas o que o médico digitou fica.
 */
export function applyDose(item: PrescriptionItem, option: DoseOption, previous?: DoseOption | null): PrescriptionItem {
  const quantity = item.quantity.trim();
  const keepQuantity = quantity !== "" && quantity !== previous?.quantity;
  return {
    ...item,
    posology: option.posology,
    quantity: keepQuantity ? item.quantity : option.quantity,
    route: option.route,
    continuous: option.continuous ?? false,
  };
}

/** Uma apresentação da biblioteca como item de receita, com a opção escolhida. */
export function itemFromDose(entry: DoseEntry, optionIndex = 0): PrescriptionItem {
  const option = entry.options[optionIndex] ?? entry.options[0];
  return {
    name: entry.name,
    concentration: null,
    tarja: entry.tarja,
    quantity: option.quantity,
    posology: option.posology,
    route: option.route,
    continuous: option.continuous ?? false,
  };
}

const DOSE_BY_NAME = new Map(DOSES.map((entry) => [entry.name, entry]));

/** Os itens de uma receita pronta, prontos para entrar no editor. */
export function protocolItems(protocol: RxProtocol): PrescriptionItem[] {
  return protocol.items.flatMap(({ dose, option }) => {
    const entry = DOSE_BY_NAME.get(dose);
    return entry ? [itemFromDose(entry, option ?? 0)] : [];
  });
}

/** Busca por nome da condição ou CID, sem acento. Vazio devolve tudo. */
export function searchProtocols(query: string): RxProtocol[] {
  const key = searchKey(query);
  if (!key) return [...RX_PROTOCOLS];
  const code = query.trim().toUpperCase().replace(/\s+/g, "");
  return RX_PROTOCOLS.filter(
    (protocol) =>
      searchKey(`${protocol.name} ${protocol.group}`).includes(key) ||
      protocol.cid.replace(".", "").startsWith(code.replace(".", ""))
  );
}

/* ---------- O que o próprio médico já receitou ---------- */

export interface FrequentItem {
  item: PrescriptionItem;
  count: number;
}

/**
 * As combinações medicamento + posologia que mais se repetem nas receitas já
 * emitidas, a mais recente de cada uma representando o grupo. `lists` vem da
 * mais nova para a mais antiga.
 */
export function frequentItems(lists: readonly PrescriptionItem[][], limit = 12): FrequentItem[] {
  const groups = new Map<string, FrequentItem & { order: number }>();
  let order = 0;
  for (const list of lists) {
    for (const item of list) {
      if (!item.name.trim() || !item.posology.trim()) continue;
      const key = `${searchKey(item.name)}|${searchKey(item.posology)}`;
      const group = groups.get(key);
      if (group) group.count += 1;
      else groups.set(key, { item, count: 1, order: order++ });
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, limit)
    .map(({ item, count }) => ({ item, count }));
}

/** Como este médico já receitou este mesmo medicamento (outras posologias). */
export function previousFor(frequent: readonly FrequentItem[], name: string): FrequentItem[] {
  const key = searchKey(name);
  return frequent.filter((f) => searchKey(f.item.name) === key);
}
