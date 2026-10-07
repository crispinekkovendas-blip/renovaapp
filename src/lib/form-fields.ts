/**
 * Leitura dos campos que as Server Actions recebem. Mora fora dos arquivos
 * "use server" porque eles só podem exportar funções assíncronas — e porque
 * assim a regra de cada campo é uma só e fica testada (form-fields.test.mjs).
 */

/** O campo como texto aparado; ausente vira "". */
export function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Como `str`, mas vazio vira null — é o que vai para as colunas opcionais. */
export function optional(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value === "" ? null : value;
}

/** "Uma por linha": aparado, sem linhas vazias; null quando não sobra nada. */
export function lines(formData: FormData, key: string): string | null {
  const text = str(formData, key)
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
  return text || null;
}

/**
 * `back`: só um caminho do próprio app ("/pacientes/1/emitir?…"). Qualquer
 * outra coisa ("https://…", "//outro.site") cai no fallback — senão o
 * redirect depois da ação viraria um redirecionamento aberto.
 */
export function safeBack(formData: FormData, fallback: string): string {
  return safePath(str(formData, "back"), fallback);
}

/** A regra de `safeBack` para um texto qualquer. */
export function safePath(value: string, fallback: string): string {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : fallback;
}

/** Acrescenta `key=value` à URL, com "?" ou "&" conforme ela já tenha query. */
export function withQuery(url: string, key: string, value: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${key}=${value}`;
}

/** YYYY-MM-DD — o formato de toda data gravada no banco. */
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
