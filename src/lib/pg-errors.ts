/**
 * Códigos de erro do Postgres que as ações tratam em vez de devolver 500.
 * Quase sempre é migração que ainda não rodou em produção quando o código
 * subiu: a ação tenta do jeito novo e, sem a coluna ou a tabela, faz do
 * jeito antigo ou volta com `?erro=migracao`.
 */

export function pgCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
}

/** 42703: coluna ausente. */
export function isMissingColumn(error: unknown): boolean {
  return pgCode(error) === "42703";
}

/** 23505: violação de UNIQUE. */
export function isUniqueViolation(error: unknown): boolean {
  return pgCode(error) === "23505";
}

/** 42P01 tabela ausente, 42703 coluna ausente, 23514 CHECK antigo: a migração ainda não rodou. */
const MIGRATION_CODES: ReadonlySet<string> = new Set(["42P01", "42703", "23514"]);

export function isMigrationPending(error: unknown): boolean {
  return MIGRATION_CODES.has(pgCode(error));
}

/**
 * Tenta cada statement em ordem, da versão com mais colunas novas para a
 * mais antiga; um 42703 passa para a próxima. Qualquer outro erro — ou o
 * 42703 da última tentativa — sobe como veio.
 */
export async function firstWithColumns<T>(attempts: ReadonlyArray<() => Promise<T>>): Promise<T> {
  for (let i = 0; i < attempts.length; i += 1) {
    try {
      return await attempts[i]();
    } catch (error) {
      if (!isMissingColumn(error) || i === attempts.length - 1) throw error;
    }
  }
  throw new Error("firstWithColumns: nenhuma tentativa");
}
