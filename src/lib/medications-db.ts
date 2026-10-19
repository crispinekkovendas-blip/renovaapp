import { sql } from "@/lib/db";
import { collapseMedicationRows, searchKey, type MedicationHit, type MedicationRow } from "./medications";

/**
 * Busca no catálogo (migração 2026-09-17-receituario + `import-medications`).
 *
 * Tudo aqui é tolerante: sem a migração ou sem a importação, a busca devolve
 * [] e o compositor cai no campo de texto livre — receitar nunca pode depender
 * do catálogo estar carregado.
 */

export type { MedicationHit };

/**
 * O mesmo genérico aparece dezenas de vezes na CMED, um por laboratório. Para
 * prescrever, o que distingue é **substância + concentração + forma**
 * (dipirona 500 mg/mL em gotas não é a injetável), então é por aí que os
 * resultados são colapsados (`collapseMedicationRows`); a marca vai junto só
 * como referência.
 *
 * A forma sai do texto da apresentação, por isso o agrupamento é feito aqui e
 * não no SQL: o banco traz as linhas já na ordem de relevância e de
 * "comercializada primeiro", e a primeira de cada grupo o representa.
 */
export async function searchMedications(query: string, limit = 20): Promise<MedicationHit[]> {
  const key = searchKey(query);
  // Menos de três letras casaria com meio catálogo e não ajuda ninguém.
  if (key.length < 3) return [];
  const prefix = `${key}%`;
  const anywhere = `% ${key}%`;

  try {
    // Relevância primeiro: quem digita "dipirona" recebe a substância pura
    // antes de "CAFEÍNA ANIDRA;DIPIRONA...", que só ganharia por ordem alfabética.
    const rows = await sql<MedicationRow>`
      SELECT substance, concentration,
             -- Mesma regra de effectiveTarja(): tarja preta vale para a
             -- substância inteira (a Portaria 344/98 lista o princípio
             -- ativo, e há linhas de clonazepam sem tarja na CMED); as
             -- demais valem por apresentação, senão a dipirona injetável
             -- faria o comprimido exigir Controle Especial.
             CASE
               WHEN BOOL_OR(tarja = 'preta') OVER (PARTITION BY substance) THEN 'preta'
               ELSE CASE MAX(CASE tarja
                               WHEN 'vermelha_retida' THEN 3
                               WHEN 'vermelha' THEN 2
                               WHEN 'livre' THEN 1
                               ELSE 0 END) OVER (PARTITION BY substance, concentration)
                      WHEN 3 THEN 'vermelha_retida'
                      WHEN 2 THEN 'vermelha'
                      WHEN 1 THEN 'livre'
                      ELSE 'desconhecida' END
             END AS tarja,
             NULLIF(product, '') AS product, presentation, therapeutic_class,
             marketed,
             CASE
               WHEN substance_search LIKE ${prefix} THEN 0
               WHEN product_search LIKE ${prefix} THEN 1
               ELSE 2
             END AS rank
      FROM medications
      WHERE substance_search LIKE ${prefix}
         OR product_search LIKE ${prefix}
         OR substance_search LIKE ${anywhere}
      ORDER BY rank, marketed DESC, substance, concentration, product
      LIMIT 2000`;
    return collapseMedicationRows(rows, limit);
  } catch {
    // Sem tabela (migração pendente): o compositor segue em texto livre.
    return [];
  }
}

/** Quantos itens o catálogo tem — usado para avisar que falta importar. */
export async function medicationsCount(): Promise<number> {
  try {
    const [row] = await sql<{ n: number }>`SELECT COUNT(*)::int AS n FROM medications`;
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
