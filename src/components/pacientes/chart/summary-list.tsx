import Link from "next/link";
import type { ReactNode } from "react";

/**
 * O Resumo da ficha como uma lista do iPhone: um cartão, linhas separadas por
 * fio, cada uma com ícone, rótulo pequeno, o fato em destaque e a seta.
 * Tocar leva à aba onde está o detalhe.
 */

export function SummaryList({ children }: { children: ReactNode }) {
  return <div className="card divide-y divide-pine-900/5 overflow-hidden">{children}</div>;
}

type SummaryIcon = "atendimento" | "consulta" | "documento";

const PATHS: Record<SummaryIcon, ReactNode> = {
  atendimento: <path d="M6 3v5a4 4 0 0 0 8 0V3M10 12v3a5 5 0 0 0 10 0v-2M20 11a2 2 0 1 0 0-.01" />,
  consulta: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  documento: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
};

export function SummaryRow({
  href,
  icon,
  label,
  value,
  muted,
}: {
  href: string;
  icon: SummaryIcon;
  label: string;
  value: string;
  /** Nada a mostrar ("Nenhuma marcada"): o fato sai em cinza. */
  muted?: boolean;
}) {
  return (
    <Link href={href} scroll={false} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-pine-50/60 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine-50 text-pine-600" aria-hidden>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          {PATHS[icon]}
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold text-pine-900/55">{label}</span>
        <span className={`block truncate text-[14px] font-bold ${muted ? "text-pine-900/45" : "text-pine-950"}`}>{value}</span>
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="h-4 w-4 shrink-0 text-pine-900/30"
      >
        <path d="m9 6 6 6-6 6" />
      </svg>
    </Link>
  );
}
