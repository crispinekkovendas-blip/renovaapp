import { searchKey } from "./normalize.ts";
import { receiptKindFor, type ReceiptKind } from "./medications.ts";
import { itemComplete, type PrescriptionItem } from "./prescription.ts";

/**
 * As telas do Receituário (/receituario): histórico, renovações e mais
 * receitados. Tudo puro — a consulta ao banco fica em receituario-db.ts, e a
 * receita em si continua sendo montada no compositor (/pacientes/[id]/emitir).
 */

/** O resumo de uma receita emitida, para uma linha de lista. */
export interface RxSummary {
  names: string[];
  /** O papel mais restrito da receita (controle especial pesa mais que simples). */
  receipt: ReceiptKind;
  continuous: boolean;
}

const RECEIPT_WEIGHT: Record<ReceiptKind, number> = { simples: 0, controle_especial: 1, notificacao: 2 };

export function rxSummary(items: readonly PrescriptionItem[]): RxSummary {
  const usable = items.filter(itemComplete);
  let receipt: ReceiptKind = "simples";
  for (const item of usable) {
    const kind = receiptKindFor(item.tarja);
    if (RECEIPT_WEIGHT[kind] > RECEIPT_WEIGHT[receipt]) receipt = kind;
  }
  return { names: usable.map((item) => item.name.trim()), receipt, continuous: usable.some((item) => item.continuous) };
}

/** A receita tem um medicamento cujo nome contém o termo (sem acento, sem caixa)? */
export function hasMedication(items: readonly PrescriptionItem[], query: string): boolean {
  const key = searchKey(query);
  if (!key) return true;
  return items.some((item) => searchKey(item.name).includes(key));
}

/* ---------- Renovações de uso contínuo ---------- */

/**
 * Por quanto tempo a última receita costuma servir. Controle especial vale 30
 * dias da emissão (Portaria SVS/MS 344/98). Para a receita simples de uso
 * contínuo não há prazo nacional único — 180 dias é a praxe das farmácias, e
 * a tela mostra isso como sugestão, nunca como regra.
 */
export const RENEWAL_DAYS: Record<"simples" | "controle_especial", number> = { simples: 180, controle_especial: 30 };

/** Com quantos dias de antecedência a renovação passa a aparecer como "vence em breve". */
export const RENEWAL_WARNING_DAYS: Record<"simples" | "controle_especial", number> = { simples: 30, controle_especial: 7 };

export interface IssuedRx {
  docId: number;
  patientId: number;
  patientName: string;
  /** YYYY-MM-DD */
  issuedAt: string;
  items: PrescriptionItem[];
}

export type RenewalStatus = "vencida" | "em_breve" | "em_dia";

export interface Renewal {
  patientId: number;
  patientName: string;
  /** A receita mais recente com algum desses medicamentos — a que o "Renovar" reaproveita. */
  docId: number;
  issuedAt: string;
  /** YYYY-MM-DD: quando a receita deixa de servir. */
  dueAt: string;
  daysLeft: number;
  status: RenewalStatus;
  receipt: "simples" | "controle_especial";
  medications: string[];
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = Date.UTC(Number(fromISO.slice(0, 4)), Number(fromISO.slice(5, 7)) - 1, Number(fromISO.slice(8, 10)));
  const to = Date.UTC(Number(toISO.slice(0, 4)), Number(toISO.slice(5, 7)) - 1, Number(toISO.slice(8, 10)));
  return Math.round((to - from) / 86_400_000);
}

function addDays(iso: string, days: number): string {
  const d = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)) + days));
  return d.toISOString().slice(0, 10);
}

/**
 * Quem toma remédio de uso contínuo e quando a receita acaba. `rxs` vem da
 * mais nova para a mais antiga; de cada medicamento contínuo vale só a
 * aparição mais recente (uma receita antiga já renovada não conta). O
 * resultado agrupa por receita e por papel — uma linha para o simples, outra
 * para o controle especial —, a mais urgente primeiro.
 */
export function continuousRenewals(rxs: readonly IssuedRx[], today: string): Renewal[] {
  const seen = new Set<string>();
  const groups = new Map<string, Renewal>();
  for (const rx of rxs) {
    for (const item of rx.items) {
      if (!item.continuous || !itemComplete(item)) continue;
      const kind = receiptKindFor(item.tarja);
      // Tarja preta não sai neste sistema (Notificação de Receita): não há o que renovar aqui.
      if (kind === "notificacao") continue;
      const medKey = `${rx.patientId}|${searchKey(item.name)}`;
      if (seen.has(medKey)) continue;
      seen.add(medKey);
      // Por receita e papel: um remédio antigo vencido não se esconde atrás de um renovado ontem.
      const groupKey = `${rx.docId}|${kind}`;
      const group = groups.get(groupKey);
      if (group) {
        if (!group.medications.includes(item.name.trim())) group.medications.push(item.name.trim());
        continue;
      }
      const dueAt = addDays(rx.issuedAt.slice(0, 10), RENEWAL_DAYS[kind]);
      const daysLeft = daysBetween(today, dueAt);
      groups.set(groupKey, {
        patientId: rx.patientId,
        patientName: rx.patientName,
        docId: rx.docId,
        issuedAt: rx.issuedAt.slice(0, 10),
        dueAt,
        daysLeft,
        status: daysLeft < 0 ? "vencida" : daysLeft <= RENEWAL_WARNING_DAYS[kind] ? "em_breve" : "em_dia",
        receipt: kind,
        medications: [item.name.trim()],
      });
    }
  }
  return [...groups.values()].sort((a, b) => a.daysLeft - b.daysLeft || a.patientName.localeCompare(b.patientName));
}

/* ---------- Mais receitados ---------- */

export interface MedicationStat {
  name: string;
  /** Quantas receitas trouxeram o medicamento. */
  count: number;
  /** Para quantos pacientes diferentes. */
  patients: number;
  lastIssuedAt: string;
  receipt: ReceiptKind;
  continuous: boolean;
  /** As posologias usadas, a mais frequente primeiro. */
  posologies: { text: string; count: number }[];
}

/** O que o médico mais receita, por medicamento, com as posologias que costuma usar. `rxs`: a mais nova primeiro. */
export function medicationStats(rxs: readonly IssuedRx[], limit = 60): MedicationStat[] {
  const stats = new Map<string, MedicationStat & { patientSet: Set<number>; posMap: Map<string, { text: string; count: number }> }>();
  for (const rx of rxs) {
    const inThisRx = new Set<string>();
    for (const item of rx.items) {
      if (!itemComplete(item)) continue;
      const key = searchKey(item.name);
      if (inThisRx.has(key)) continue;
      inThisRx.add(key);
      let stat = stats.get(key);
      if (!stat) {
        stat = {
          name: item.name.trim(),
          count: 0,
          patients: 0,
          lastIssuedAt: rx.issuedAt.slice(0, 10),
          receipt: receiptKindFor(item.tarja),
          continuous: false,
          posologies: [],
          patientSet: new Set(),
          posMap: new Map(),
        };
        stats.set(key, stat);
      }
      stat.count += 1;
      stat.patientSet.add(rx.patientId);
      stat.continuous ||= item.continuous;
      const posKey = searchKey(item.posology);
      const pos = stat.posMap.get(posKey);
      if (pos) pos.count += 1;
      else stat.posMap.set(posKey, { text: item.posology.trim(), count: 1 });
    }
  }
  return [...stats.values()]
    .sort((a, b) => b.count - a.count || b.lastIssuedAt.localeCompare(a.lastIssuedAt))
    .slice(0, limit)
    .map(({ patientSet, posMap, ...stat }) => ({
      ...stat,
      patients: patientSet.size,
      posologies: [...posMap.values()].sort((a, b) => b.count - a.count).slice(0, 4),
    }));
}
