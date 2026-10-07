import type { ReactNode } from "react";
import Link from "next/link";
import type { AppointmentStatus } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/format";

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  agendado: "bg-pine-100 text-pine-800",
  confirmado: "bg-sky-100 text-sky-800",
  em_atendimento: "bg-clay-100 text-clay-800",
  concluido: "bg-emerald-100 text-emerald-800",
  faltou: "bg-rose-100 text-rose-700",
  cancelado: "bg-stone-200 text-stone-500",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return <span className={`chip ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PaymentBadge({ status }: { status: "pendente" | "pago" }) {
  return (
    <span className={`chip ${status === "pago" ? "bg-emerald-100 text-emerald-800" : "bg-clay-100 text-clay-800"}`}>
      {status === "pago" ? "Pago" : "Pendente"}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    // No celular a ação desce para baixo do título e ocupa a largura toda.
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-pine-950 sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-pine-900/60">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap gap-2 *:flex-1 sm:*:flex-none">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = false,
  plus = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  /** Prefixa o valor com um "+" em sun (estilo Mevo: "+148 parceiros"). */
  plus?: boolean;
}) {
  // `.bignum` dá família, peso, cor e leading; o tamanho é reduzido para caber num card de 4 colunas.
  // Valores longos (moeda) descem mais um degrau para não estourar a largura.
  const size = value.length > 9 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl";
  return (
    <div className={`card p-4 sm:p-5 ${accent ? "border-peach-300/60 bg-gradient-to-br from-peach-50 to-white" : ""}`}>
      <p className="text-[11px] font-bold text-pine-900/50">{label}</p>
      <p className={`bignum mt-3 ${size}`}>
        {plus ? <span className="bignum-plus">+</span> : null}
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-pine-900/55">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl bg-peach-50 px-5 py-10 text-center sm:px-6 sm:py-12">
      <p className="font-display text-lg font-semibold text-pine-900">{title}</p>
      {hint ? <p className="mt-1 text-sm text-pine-900/70">{hint}</p> : null}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 font-display text-xl font-semibold tracking-tight text-pine-950">{children}</h2>
  );
}

/** Acordeão nativo (<details>), sem JS — funciona em Server Components. */
export function Accordion({
  title,
  children,
  open,
}: {
  title: string;
  children: ReactNode;
  /** Abre por padrão (útil para o primeiro item da lista). */
  open?: boolean;
}) {
  return (
    <details className="accordion" open={open}>
      <summary>{title}</summary>
      <div className="accordion-body">{children}</div>
    </details>
  );
}

/** Pílula-herói estilo Mevo: texto à esquerda, círculo com chevron à direita. */
export function HeroButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const base = variant === "secondary" ? "btn-hero-secondary" : "btn-hero";
  return (
    <Link href={href} className={className ? `${base} ${className}` : base}>
      <span>{children}</span>
      <span className="chev" aria-hidden />
    </Link>
  );
}
