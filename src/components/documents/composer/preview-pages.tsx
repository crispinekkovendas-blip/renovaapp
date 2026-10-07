import type { ComponentType } from "react";
import type { PrescriptionDocument, PrescriptionItem } from "@/lib/prescription";
import type { DocumentPreviewProps, SheetCanvas } from "../document-preview";
import type { PreviewPage } from "./preview-viewer";

/**
 * As páginas da prévia, como saem na impressora. No receituário, um papel
 * por tipo de receita e uma página por via — o Controle Especial conta duas,
 * com o selo de cada via como no PDF.
 */

/** Os mesmos selos de `pdf/document-pdf.ts`. */
export const VIA_LABELS = ["1ª via — Farmácia (retenção)", "2ª via — Paciente"];

type SheetProps = Omit<DocumentPreviewProps, "title" | "body" | "medications" | "viaLabel" | "canvas">;

export function prescriptionPages(
  docs: readonly PrescriptionDocument[],
  sheet: SheetProps,
  Sheet: ComponentType<DocumentPreviewProps>,
  /**
   * A folha como parte da montagem (página grande): `indexesFor` diz a posição
   * de cada medicamento do papel na lista do editor.
   */
  canvas?: { indexesFor(doc: PrescriptionDocument): number[] } & Omit<SheetCanvas, "indexes">
): PreviewPage[] {
  if (docs.length === 0) {
    return [
      {
        key: "receituario-vazio",
        label: "Receituário",
        pdfIndex: 0,
        node: <Sheet {...sheet} title="Receituário" body="Os medicamentos aparecem aqui, já separados no papel certo. Busque à esquerda e clique — ou arraste o medicamento para esta folha." />,
      },
    ];
  }
  return docs.flatMap((doc, pdfIndex) =>
    Array.from({ length: doc.vias }, (_, via): PreviewPage => {
      const viaLabel = doc.vias > 1 ? (VIA_LABELS[via] ?? `${via + 1}ª via`) : null;
      const indexes = canvas?.indexesFor(doc);
      return {
        key: `${doc.kind}-${via}`,
        label: viaLabel ? `${doc.label} · ${viaLabel}` : doc.label,
        pdfIndex,
        node: (
          <Sheet {...sheet} title={doc.label} body={doc.body} medications={doc.items} viaLabel={viaLabel} />
        ),
        itemIndexes: indexes,
        canvasNode:
          canvas && indexes ? (
            <Sheet
              {...sheet}
              title={doc.label}
              body={doc.body}
              medications={doc.items}
              viaLabel={viaLabel}
              canvas={{
                indexes,
                highlight: canvas.highlight,
                onSelect: canvas.onSelect,
                onMove: canvas.onMove,
                onRemove: canvas.onRemove,
              }}
            />
          ) : undefined,
      };
    })
  );
}

/** Tarja preta não sai em papel nenhum daqui: aviso acima da página. */
export function BlockedNotice({ blocked }: { blocked: readonly PrescriptionItem[] }) {
  if (blocked.length === 0) return null;
  return (
    <p className="rounded-xl bg-stone-800 px-3.5 py-2.5 text-[12px] leading-snug font-semibold text-white">
      {blocked.map((item) => item.name).join(", ")} não {blocked.length === 1 ? "sai" : "saem"} aqui: tarja preta exige
      Notificação de Receita, o talão numerado da vigilância sanitária.
    </p>
  );
}
