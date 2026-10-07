import { sql } from "@/lib/db";
import { searchKey, type Tarja } from "./medications";

/**
 * Busca no catálogo (migração 2026-09-17-receituario + `import-medications`).
 *
 * Tudo aqui é tolerante: sem a migração ou sem a importação, a busca devolve
 * [] e o compositor cai no campo de texto livre — receitar nunca pode depender
 * do catálogo estar carregado.
 */

export interface MedicationHit {
  substance: string;
  concentration: string | null;
  tarja: Tarja;
  /** Uma marca conhecida daquela substância, só para o médico reconhecer. */
  product: string | null;
  presentation: string | null;
  therapeutic_class: string | null;
  /** Quantas apresentações existem — sinal de que é comum, não um item raro. */
  brands: number;
}

/**
 * O mesmo genérico aparece dezenas de vezes na CMED, um por laboratório. Para
 * prescrever, o que distingue é **substância + concentração**, então é por aí
 * que os resultados são colapsados; a marca vai junto só como referência.
 *
 * `DISTINCT ON` precisa que o `ORDER BY` comece pelas mesmas colunas — o resto
 * da ordenação escolhe qual linha representa o grupo (comercializada primeiro).
 */
export async function searchMedications(query: string, limit = 20): Promise<MedicationHit[]> {
  const key = searchKey(query);
  // Menos de três letras casaria com meio catálogo e não ajuda ninguém.
  if (key.length < 3) return [];
  const prefix = `${key}%`;
  const anywhere = `% ${key}%`;

  try {
    // `DISTINCT ON` obriga o ORDER BY a começar pelas suas colunas, então a
    // ordenação por relevância só pode vir por fora. Sem isso, quem digita
    // "dipirona" recebe primeiro "CAFEÍNA ANIDRA;DIPIRONA..." — a associação
    // ganha da substância pura só por ordem alfabética.
    return await sql<MedicationHit>`
      SELECT substance, concentration, tarja, product, presentation, therapeutic_class, brands
      FROM (
        SELECT DISTINCT ON (substance, concentration)
               substance, concentration,
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
               COUNT(*) OVER (PARTITION BY substance, concentration)::int AS brands,
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
        ORDER BY substance, concentration, marketed DESC, product
      ) hits
      ORDER BY rank, marketed DESC, brands DESC, substance, concentration
      LIMIT ${limit}`;
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
