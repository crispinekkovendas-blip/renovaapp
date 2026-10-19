import { sql } from "./db";
import { parseTemplates } from "./sheet-style";
import type { SheetStyle, SheetTemplate } from "./sheet-style";

/**
 * Onde moram os modelos da folha: em `settings`, sem tabela nova.
 *   sheet_templates      → JSON com todos os modelos (da clínica e de cada profissional)
 *   sheet_logo:<hash>    → o logotipo (data URL), endereçado pelo conteúdo
 */

export const TEMPLATES_KEY = "sheet_templates";
export const logoKey = (hash: string) => `sheet_logo:${hash}`;

export async function loadSheetTemplates(): Promise<SheetTemplate[]> {
  try {
    const [row] = await sql<{ value: string }>`SELECT value FROM settings WHERE key = ${TEMPLATES_KEY}`;
    return parseTemplates(row?.value);
  } catch {
    return [];
  }
}

/** Os logotipos usados por estes estilos: hash → data URL. */
export async function loadLogos(styles: ReadonlyArray<SheetStyle | null | undefined>): Promise<Record<string, string>> {
  const hashes = [...new Set(styles.map((s) => s?.logo).filter((h): h is string => Boolean(h)))];
  if (!hashes.length) return {};
  try {
    const rows = await sql<{ key: string; value: string }>`
      SELECT key, value FROM settings WHERE key = ANY(${hashes.map(logoKey)})`;
    return Object.fromEntries(rows.map((r) => [r.key.slice("sheet_logo:".length), r.value]));
  } catch {
    return {};
  }
}

/** O logotipo de um estilo, para o PDF. */
export async function logoFor(style: SheetStyle | null | undefined): Promise<string | null> {
  if (!style?.logo) return null;
  return (await loadLogos([style]))[style.logo] ?? null;
}
