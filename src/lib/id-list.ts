/**
 * `?ids=12,15,7` → [12, 15, 7]: só inteiros positivos, sem repetição, na
 * ordem em que vieram, no máximo `max`. Lixo é ignorado em vez de derrubar a
 * página — quem monta a URL é o próprio app, mas ela pode ser editada à mão.
 */
export function parseIdList(raw: string | null | undefined, max = 10): number[] {
  if (!raw) return [];
  const out: number[] = [];
  const seen = new Set<number>();
  for (const part of raw.split(",")) {
    if (out.length >= max) break;
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) continue;
    const id = Number(trimmed);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
