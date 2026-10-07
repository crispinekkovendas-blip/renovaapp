/**
 * Especialidades da Memed agrupadas para o <select> do cadastro de prescritor.
 * São ~109: agrupadas por "grupo" (como a própria Memed as organiza) dá para
 * achar; numa lista corrida, não. Os grupos vêm sujos — "Clínica geral",
 * "Clinica Geral" e "Clínica Médica" convivem, e algumas especialidades vêm
 * com o texto literal "Null" —, então a chave ignora caixa e acento, e fica o
 * rótulo mais bem escrito (o acentuado).
 */

export interface MemedSpecialty {
  id: string;
  nome: string;
  grupo: string;
}

export interface SpecialtyGroup<T extends MemedSpecialty = MemedSpecialty> {
  label: string;
  items: T[];
}

export const OTHER_GROUP = "Outras";

const stripAccents = (label: string) => label.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Chave de agrupamento: sem caixa e sem acento. */
export function groupKey(label: string): string {
  return stripAccents(label).toLowerCase();
}

/**
 * Quantos acentos o rótulo tem — entre "Clinica Geral" e "Clínica geral", fica o segundo.
 * Compara com o NFD, não com o texto cru: "í" pré-composto tem 1 caractere e o
 * "i" sem acento também, então a conta direta sempre dava zero.
 */
export function accentCount(label: string): number {
  const decomposed = label.normalize("NFD");
  return decomposed.length - decomposed.replace(/\p{Diacritic}/gu, "").length;
}

/** Grupos em ordem alfabética (pt-BR), com "Outras" por último. */
export function groupSpecialties<T extends MemedSpecialty>(specialties: readonly T[]): SpecialtyGroup<T>[] {
  const groups = new Map<string, SpecialtyGroup<T>>();
  for (const specialty of specialties) {
    const raw = specialty.grupo.trim();
    const label = !raw || raw.toLowerCase() === "null" ? OTHER_GROUP : raw;
    const key = groupKey(label);
    const group = groups.get(key) ?? { label, items: [] };
    if (accentCount(label) > accentCount(group.label)) group.label = label;
    group.items.push(specialty);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) =>
    a.label === OTHER_GROUP ? 1 : b.label === OTHER_GROUP ? -1 : a.label.localeCompare(b.label, "pt-BR")
  );
}
