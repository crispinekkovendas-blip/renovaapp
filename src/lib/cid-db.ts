import { sql } from "@/lib/db";
import { searchKey } from "./normalize";
import type { CidCode } from "./cid";

/**
 * Busca no catálogo CID-10 (migração 2026-09-17-cid10 + `import-cid`).
 *
 * Tolerante de propósito: sem a migração ou sem a importação devolve [] e o
 * campo de CID continua sendo texto livre, como sempre foi. Emitir um
 * atestado não pode depender de o catálogo estar carregado.
 */

interface Row {
  code: string;
  description: string;
  chapter: string | null;
  sex_restriction: string | null;
  is_category: number;
}

function toCid(row: Row): CidCode {
  return {
    code: row.code,
    description: row.description,
    chapter: row.chapter,
    sexRestriction: row.sex_restriction === "M" || row.sex_restriction === "F" ? row.sex_restriction : null,
    isCategory: row.is_category === 1,
  };
}

/**
 * Procura por código ou por descrição.
 *
 * Duas letras já bastam quando é código ("i1" → I10), então o mínimo é menor
 * que o do catálogo de medicamentos. A subcategoria vem antes da categoria
 * porque é a mais específica — e um atestado com CID de 4 caracteres diz mais
 * do que um de 3.
 */
export async function searchCid(query: string, limit = 20): Promise<CidCode[]> {
  const key = searchKey(query);
  if (key.length < 2) return [];

  try {
    const rows = await sql<Row>`
      SELECT code, description, chapter, sex_restriction, is_category
      FROM cid_codes
      WHERE search LIKE ${`${key}%`} OR search LIKE ${`% ${key}%`}
      ORDER BY
        -- Quem começa com o termo vem antes de quem só o contém.
        CASE WHEN search LIKE ${`${key}%`} THEN 0 ELSE 1 END,
        is_category,
        code
      LIMIT ${limit}`;
    return rows.map(toCid);
  } catch {
    return [];
  }
}

/** Um código específico, para mostrar a descrição do que já está no documento. */
export async function getCid(code: string): Promise<CidCode | null> {
  try {
    const [row] = await sql<Row>`
      SELECT code, description, chapter, sex_restriction, is_category
      FROM cid_codes WHERE code = ${code.trim().toUpperCase()}`;
    return row ? toCid(row) : null;
  } catch {
    return null;
  }
}

export async function cidCount(): Promise<number> {
  try {
    const [row] = await sql<{ n: number }>`SELECT COUNT(*)::int AS n FROM cid_codes`;
    return row?.n ?? 0;
  } catch {
    return 0;
  }
}
