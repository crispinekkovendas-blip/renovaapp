"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeAreaPicker } from "./home-area";

/** As três seções do Plantão; o caminho da Emergência continua /guia/plantao. */
const SECTIONS: readonly { href: string; label: string }[] = [
  { href: "/guia", label: "Receitas prontas" },
  { href: "/guia/plantao", label: "Emergência" },
  { href: "/guia/drive", label: "Drive de prescrições" },
];

/** As páginas de índice do Plantão (as de tópico e de entrada têm o caminho no alto e não precisam da fila). */
const PLANTAO_INDEX = new Set(["/guia", "/guia/plantao", "/guia/drive", "/guia/revisoes"]);

/**
 * O alto das duas áreas do Guia clínico: no Plantão, a fila das três seções
 * (Receitas prontas, Emergência, Drive); na Ortopedia, nada — ela tem o
 * índice dela. Nas duas raízes, "Guia clínico abre em: Plantão | Ortopedia".
 */
export function GuideChrome() {
  const pathname = usePathname();
  const inPlantao = PLANTAO_INDEX.has(pathname);
  const isRoot = pathname === "/guia" || pathname === "/guia/ortopedia";
  if (!inPlantao && !isRoot) return null;
  const current = pathname === "/guia/revisoes" ? null : pathname;

  return (
    <div className="mx-auto mb-4 flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2">
      {inPlantao ? (
        <nav aria-label="Seções do Plantão" className="scroll-x -mx-1 flex gap-1.5 px-1">
          {SECTIONS.map((s) => {
            const on = s.href === current;
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={on ? "page" : undefined}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors ${
                  on ? "border-pine-950 bg-pine-950 text-white" : "border-pine-900/12 bg-white text-pine-900/70 hover:border-pine-400"
                }`}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>
      ) : (
        <span />
      )}
      {isRoot ? <HomeAreaPicker /> : null}
    </div>
  );
}
