"use client";

import type { ReactNode } from "react";
import { MOBILE_VIEWS } from "@/lib/composer-editor";
import type { MobileView } from "@/lib/composer-editor";
import { PreviewViewer } from "./preview-viewer";
import type { PreviewPage, PreviewViewerProps } from "./preview-viewer";

/*
 * A prévia da folha nos dois tamanhos, as duas pelo mesmo visualizador de
 * páginas (preview-viewer.tsx). Abaixo do lg a coluna some e a prévia vira a
 * aba "Prévia".
 */

interface PreviewProps {
  pages: readonly PreviewPage[];
  notice?: ReactNode;
  pdfBusy: boolean;
  onOpenPdf(pdfIndex: number): void;
  goTo?: PreviewViewerProps["goTo"];
  drop?: PreviewViewerProps["drop"];
}

/** A coluna da prévia no desktop, ao lado do editor. */
export function DesktopPreview({ onHide, ...viewer }: PreviewProps & { onHide(): void }) {
  return (
    <aside className="hidden lg:block lg:col-start-2 lg:row-start-1 lg:row-span-3 lg:sticky lg:top-4">
      <PreviewViewer {...viewer} onHide={onHide} fill />
    </aside>
  );
}

/** "Mostrar prévia": o que sobra da coluna da prévia quando ela está oculta (só desktop). */
export function ShowPreviewButton({ onShow }: { onShow(): void }) {
  return (
    <div className="hidden justify-end lg:flex">
      <button type="button" onClick={onShow} className="rounded-lg px-2 py-1 text-[11px] font-bold text-pine-600 hover:bg-pine-50">
        Mostrar prévia
      </button>
    </div>
  );
}

/** Abaixo do lg: "Editar | Prévia". Escondido no desktop, não ocupa célula da grade. */
export function MobileViewSwitch({ view, onChange }: { view: MobileView; onChange(view: MobileView): void }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-pine-100/60 p-1 lg:hidden" role="group" aria-label="Editor ou prévia">
      {MOBILE_VIEWS.map((option) => (
        <button
          key={option.view}
          type="button"
          onClick={() => onChange(option.view)}
          aria-pressed={view === option.view}
          className={`min-h-11 rounded-xl text-sm font-bold transition-colors ${
            view === option.view ? "bg-white text-pine-950 shadow-sm" : "text-pine-900/60"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A aba "Prévia" do celular: o mesmo visualizador, na largura da tela. */
export function MobilePreview(viewer: PreviewProps) {
  return (
    <section className="lg:hidden" aria-label="Prévia da folha">
      <PreviewViewer {...viewer} />
    </section>
  );
}
