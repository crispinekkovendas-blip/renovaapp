import { STAGE_LABELS } from "@/lib/whatsapp/flow";
import type { Stage } from "@/lib/whatsapp/flow";

const STAGE_STYLE: Record<Stage, string> = {
  consentimento: "bg-pine-100 text-pine-800",
  triagem: "bg-pine-100 text-pine-800",
  revisao: "bg-clay-100 text-clay-800",
  pagamento: "bg-clay-100 text-clay-800",
  pago: "bg-emerald-100 text-emerald-800",
  consulta: "bg-sky-100 text-sky-800",
  encerrado: "bg-slate-100 text-slate-600",
  recusado: "bg-slate-100 text-slate-600",
  urgente: "bg-rose-100 text-rose-700",
};

export function StageChip({ stage }: { stage: Stage }) {
  return <span className={`chip ${STAGE_STYLE[stage] ?? "bg-slate-100 text-slate-600"}`}>{STAGE_LABELS[stage] ?? stage}</span>;
}

/** "29/10 14:05" no fuso da clínica. */
export function fmtWhen(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
