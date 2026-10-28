"use client";

import { useSyncExternalStore } from "react";

/**
 * A área em que "Guia clínico" abre para este médico: o Plantão (receitas
 * prontas, emergência e Drive) ou a Ortopedia. Fica neste navegador
 * (localStorage), como o tema — o clínico que assumiu a ortopedia abre o
 * guia já nela; os outros, no Plantão.
 */
export type HomeArea = "plantao" | "ortopedia";

const KEY = "renova:guia-area";
const listeners = new Set<() => void>();

function read(): HomeArea {
  try {
    return window.localStorage.getItem(KEY) === "ortopedia" ? "ortopedia" : "plantao";
  } catch {
    return "plantao";
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function setHomeArea(area: HomeArea): void {
  try {
    window.localStorage.setItem(KEY, area);
  } catch {
    // Sem armazenamento (modo privado): vale só até fechar a página.
  }
  for (const l of listeners) l();
}

/** No servidor e na primeira pintura é sempre o Plantão; o navegador corrige logo depois. */
export function useHomeArea(): HomeArea {
  return useSyncExternalStore(subscribe, read, () => "plantao");
}

export function guideHomeHref(area: HomeArea): string {
  return area === "ortopedia" ? "/guia/ortopedia" : "/guia";
}

const AREAS: readonly { key: HomeArea; label: string }[] = [
  { key: "plantao", label: "Plantão" },
  { key: "ortopedia", label: "Ortopedia" },
];

/** "Guia clínico abre em: Plantão | Ortopedia", no alto das duas áreas. */
export function HomeAreaPicker() {
  const area = useHomeArea();
  return (
    <div role="radiogroup" aria-label="Em que área o Guia clínico abre" className="flex items-center gap-1 text-[11.5px] font-semibold text-pine-900/55">
      <span className="mr-1">Guia clínico abre em</span>
      {AREAS.map((a) => {
        const on = a.key === area;
        return (
          <button
            key={a.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setHomeArea(a.key)}
            className={`rounded-full px-2.5 py-1 font-bold transition-colors pointer-coarse:min-h-9 ${
              on ? "bg-pine-950 text-white" : "bg-white text-pine-900/70 ring-1 ring-pine-900/12 hover:ring-pine-400"
            }`}
          >
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
