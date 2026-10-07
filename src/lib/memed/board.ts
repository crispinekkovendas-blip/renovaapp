/** Conselhos aceitos pela Memed no campo board_code. */
export const BOARD_CODES = [
  "CRM", "CRO", "COREN", "CRMV", "CRF", "CRN", "CREFITO", "CRP", "CRFA", "CREF",
] as const;

// Duas ordens aparecem no campo livre: UF antes do número ("CRM-SP 123456") e
// UF depois ("CRM 123456-SP", que é o formato dos profissionais já cadastrados).
const STATE_FIRST = /^([A-Za-z]{3,7})\s*[-/]?\s*([A-Za-z]{2})\s+(\d+)$/;
const STATE_LAST = /^([A-Za-z]{3,7})\s+(\d+)\s*[-/]\s*([A-Za-z]{2})$/;

/**
 * Extrai conselho, número e UF do campo `professionals.council`, que é texto
 * livre. Serve só para pré-preencher os campos novos — o admin confirma.
 * Retorna null quando não dá para ter certeza, porque um palpite errado aqui
 * vira registro errado numa receita assinada.
 */
export function parseCouncil(council: string): { code: string; number: string; state: string } | null {
  const text = council.trim();
  const first = text.match(STATE_FIRST);
  const last = first ? null : text.match(STATE_LAST);
  if (!first && !last) return null;

  const code = (first ?? last!)[1].toUpperCase();
  if (!BOARD_CODES.includes(code as (typeof BOARD_CODES)[number])) return null;

  return first
    ? { code, number: first[3], state: first[2].toUpperCase() }
    : { code, number: last![2], state: last![3].toUpperCase() };
}
