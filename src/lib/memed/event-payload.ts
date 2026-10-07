/**
 * `prescricaoImpressa` entrega um objeto com o id em `prescricao.id`;
 * `prescricaoExcluida` entrega o id cru, sem objeto. Aceitamos as duas formas,
 * e as variações conhecidas entre versões do módulo — errar aqui grava receita
 * fantasma ou perde a receita real, e o evento não tem segunda chance.
 */
export function extractPrescriptionId(payload: unknown): string | null {
  if (payload === null || payload === undefined) return null;
  if (typeof payload === "string" || typeof payload === "number") {
    const value = String(payload).trim();
    return value === "" ? null : value;
  }
  if (typeof payload !== "object") return null;

  const record = payload as Record<string, unknown>;
  const nested = (key: string) => (record[key] as Record<string, unknown> | undefined)?.id;
  const candidate = nested("prescricao") ?? record.id ?? nested("data");
  return candidate === undefined || candidate === null ? null : String(candidate);
}
