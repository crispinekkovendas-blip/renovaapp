import Link from "next/link";
import type { ReactNode } from "react";

/** Card de benefício, como os da home da Mevo: ícone no alto, título em negrito, texto com destaques. */
export function FeatureCard({
  icon,
  title,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-5 ${className}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pine-50 text-pine-700">{icon}</span>
      <p className="mt-4 text-[15px] font-extrabold text-pine-950">{title}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-pine-900/70">{children}</p>
    </div>
  );
}

/** Atalho quadrado, como os da home do app da Mevo (Meus pacientes, Histórico, Meus dados…). */
export function Tile({ href, icon, title, hint }: { href: string; icon: ReactNode; title: string; hint: string }) {
  return (
    <Link href={href} className="card flex min-w-0 flex-col gap-3 p-4 transition-colors hover:border-pine-300 active:bg-pine-50/60">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach-100 text-pine-950">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-extrabold text-pine-950">{title}</span>
        <span className="block text-xs text-pine-900/60">{hint}</span>
      </span>
    </Link>
  );
}

/** Linha "rótulo … número" do bloco "Em números". */
export function StatRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <span className="text-pine-900/65">{label}</span>
      <span className="font-extrabold tabular-nums text-pine-950">{children}</span>
    </div>
  );
}
