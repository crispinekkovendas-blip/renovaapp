"use client";

import type { ReactNode } from "react";
import { PreviewViewer } from "./preview-viewer";
import type { PreviewPage, PreviewViewerProps } from "./preview-viewer";

/*
 * A prévia da folha ao lado das telas de montar, no computador. Abaixo do lg
 * a coluna some e a folha é uma tela própria do compositor ("Prévia da folha",
 * pelo mesmo visualizador de páginas, preview-viewer.tsx).
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
