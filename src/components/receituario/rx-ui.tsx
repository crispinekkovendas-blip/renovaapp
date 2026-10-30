import Link from "next/link";
import type { ReactNode } from "react";
import type { ReceiptKind } from "@/lib/medications";
import type { RenewalStatus } from "@/lib/receituario";

/** Peças comuns das telas do Receituário. */

const RECEIPT_SHORT: Record<ReceiptKind, string> = {
  simples: "Simples",
  controle_especial: "Controle especial",
  notificacao: "Notificação",
};

const RECEIPT_STYLE: Record<ReceiptKind, string> = {
  simples: "bg-pine-100 text-pine-800",
  controle_especial: "bg-clay-100 text-clay-800",
  notificacao: "bg-slate-800 text-white",
};

export function ReceiptChip({ kind }: { kind: ReceiptKind }) {
  return <span className={`chip ${RECEIPT_STYLE[kind]}`}>{RECEIPT_SHORT[kind]}</span>;
}

const RENEWAL_LABEL: Record<RenewalStatus, string> = { vencida: "Vencida", em_breve: "Vence em breve", em_dia: "Em dia" };
const RENEWAL_STYLE: Record<RenewalStatus, string> = {
  vencida: "bg-rose-100 text-rose-700",
  em_breve: "bg-clay-100 text-clay-800",
  em_dia: "bg-emerald-100 text-emerald-800",
};

export function RenewalChip({ status }: { status: RenewalStatus }) {
  return <span className={`chip ${RENEWAL_STYLE[status]}`}>{RENEWAL_LABEL[status]}</span>;
}

/** "vence em 6 dias", "venceu há 22 dias", "vence hoje". */
export function daysLeftLabel(days: number): string {
  if (days === 0) return "vence hoje";
  if (days > 0) return `vence em ${days} dia${days === 1 ? "" : "s"}`;
  return `venceu há ${-days} dia${days === -1 ? "" : "s"}`;
}

/** Os caminhos do compositor que as telas usam (ele abre por cima, como pop-up, na navegação normal). */
export const rxLinks = {
  nova: (patientId: number) => `/pacientes/${patientId}/emitir?kind=receituario`,
  renovar: (patientId: number, docId: number) => `/pacientes/${patientId}/emitir?kind=receituario&from=${docId}`,
  rascunho: (patientId: number, draftId: number) => `/pacientes/${patientId}/emitir?rascunho=${draftId}`,
  ver: (patientId: number, docId: number) => `/pacientes/${patientId}/documentos/${docId}`,
  pdf: (patientId: number, docId: number) => `/pacientes/${patientId}/documentos/${docId}/pdf`,
  ficha: (patientId: number) => `/pacientes/${patientId}`,
};

/** Lista de nomes de remédio que cabe numa linha: "Dipirona, Losartana +2". */
export function MedNames({ names, max = 3 }: { names: string[]; max?: number }) {
  if (names.length === 0) return <span className="text-pine-900/45">—</span>;
  const shown = names.slice(0, max);
  return (
    <span title={names.join(" · ")}>
      {shown.join(" · ")}
      {names.length > max ? <span className="text-pine-900/50"> +{names.length - max}</span> : null}
    </span>
  );
}

export function SmallLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="btn btn-ghost px-2.5 py-1 text-xs">
      {children}
    </Link>
  );
}
