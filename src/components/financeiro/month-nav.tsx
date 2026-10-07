import Link from "next/link";
import type { ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { shiftMonth } from "./month-math";

/**
 * Navegação de mês (anterior · Mês atual · próximo) do financeiro, do
 * faturamento de convênios e dos relatórios. No celular as setas ficam nas
 * pontas (alvo de 44px) e "Mês atual" ocupa o meio. `before` entra antes das
 * setas (ex.: o "← Financeiro" dos convênios).
 */
export function MonthNav({ basePath, month, before }: { basePath: string; month: string; before?: ReactNode }) {
  return (
    <div className={`flex items-center gap-2 ${before ? "flex-wrap" : ""}`}>
      {before}
      <Link
        href={`${basePath}?mes=${shiftMonth(month, -1)}`}
        className="btn btn-outline min-w-11 justify-center px-2.5"
        aria-label="Mês anterior"
      >
        <IconChevronLeft className="h-4 w-4" />
      </Link>
      <Link href={basePath} className="btn btn-outline flex-1 justify-center sm:flex-none">
        Mês atual
      </Link>
      <Link
        href={`${basePath}?mes=${shiftMonth(month, 1)}`}
        className="btn btn-outline min-w-11 justify-center px-2.5"
        aria-label="Próximo mês"
      >
        <IconChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
