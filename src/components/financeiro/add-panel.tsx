import type { ReactNode } from "react";
import { IconPlus } from "@/components/icons";

/**
 * "+ Novo …" recolhido num <details>: o formulário de criação só aparece
 * quando pedido, sem JS. O formulário (children) desenha a própria borda.
 */
export function AddPanel({
  label,
  className = "mt-4",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details className={`card overflow-hidden ${className}`}>
      <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 py-3.5 text-sm font-bold text-pine-700 transition-colors hover:bg-pine-50 sm:px-5">
        <IconPlus className="h-4 w-4" />
        {label}
      </summary>
      {children}
    </details>
  );
}
