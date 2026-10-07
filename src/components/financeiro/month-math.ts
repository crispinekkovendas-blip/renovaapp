/**
 * Contas puras do financeiro e dos relatórios: navegação por mês, totais do
 * mês e taxas. Sem banco e sem React — testáveis com `node --test`.
 */

const MONTH_RE = /^\d{4}-\d{2}$/;

/** `?mes=AAAA-MM` válido, ou o mês de referência (normalmente o atual). */
export function monthFromParam(param: string | null | undefined, fallback: string): string {
  return param && MONTH_RE.test(param) ? param : fallback;
}

/** Mês vizinho. Dia 15 ao meio-dia: nenhum fuso ou mês curto pula dois meses. */
export function shiftMonth(isoMonth: string, delta: number): string {
  const d = new Date(`${isoMonth}-15T12:00:00`);
  d.setMonth(d.getMonth() + delta);
  return d.toLocaleDateString("en-CA").slice(0, 7);
}

interface MonthPayment {
  status: "pendente" | "pago";
  paid_at: string | null;
  amount_cents: number;
}

/**
 * Recebido = pago dentro do mês (o lançamento pode vencer em outro mês);
 * pendente = tudo o que está em aberto entre os lançamentos listados.
 */
export function summarizeMonth(payments: readonly MonthPayment[], month: string): { received: number; pending: number } {
  let received = 0;
  let pending = 0;
  for (const p of payments) {
    if (p.status === "pago" && (p.paid_at ?? "").slice(0, 7) === month) received += p.amount_cents;
    else if (p.status === "pendente") pending += p.amount_cents;
  }
  return { received, pending };
}

/** Agrupa mantendo a ordem de chegada das linhas (a do ORDER BY). */
export function groupBy<T, K>(rows: readonly T[], key: (row: T) => K): Map<K, T[]> {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = groups.get(k);
    if (list) list.push(row);
    else groups.set(k, [row]);
  }
  return groups;
}

export function sumBy<T>(rows: readonly T[], value: (row: T) => number): number {
  return rows.reduce((sum, row) => sum + value(row), 0);
}

/** Porcentagem inteira; 0 quando não há base. */
export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Indicadores do mês nos relatórios: taxa de falta e ticket médio. */
export function monthIndicators({ concluidas, faltas, receita }: { concluidas: number; faltas: number; receita: number }) {
  const noShowBase = concluidas + faltas;
  return {
    noShowBase,
    noShowRate: percent(faltas, noShowBase),
    ticket: concluidas > 0 ? Math.round(receita / concluidas) : 0,
  };
}

/** Largura da barra em %: proporcional, com um mínimo visível para valor > 0. */
export function barWidth(value: number, max: number): number {
  return max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;
}

/** "1 atendimento", "3 atendimentos". */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
