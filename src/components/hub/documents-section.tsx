import Link from "next/link";
import type { PortalDocument, PortalReceipt } from "@/lib/hub";
import { DOCUMENT_KIND_LABEL } from "@/lib/documents";
import type { DocumentKind } from "@/lib/documents";
import { fmtDate, moneyBR } from "@/lib/format";

/**
 * Seção "Documentos" do portal: atestados, encaminhamentos, laudos e
 * orientações liberados para o paciente, mais os recibos dos pagamentos
 * recebidos — do mais recente ao mais antigo, cada um com "Abrir". Server
 * Component sem busca de dados; a página passa as listas já filtradas.
 */

const KIND_CHIP: Record<DocumentKind, string> = {
  atestado: "bg-pine-100 text-pine-800",
  encaminhamento: "bg-sky-100 text-sky-800",
  laudo: "bg-clay-100 text-clay-800",
  orientacoes: "bg-peach-100 text-pine-900",
  receituario: "bg-emerald-100 text-emerald-800",
};

interface Row {
  key: string;
  date: string;
  chip: string;
  chipClass: string;
  title: string;
  meta: string;
  href: string;
  /** Só documentos têm PDF; recibo tem a própria folha. */
  pdfHref?: string;
}

export function HubDocuments({
  token,
  documents,
  receipts,
}: {
  token: string;
  documents: PortalDocument[];
  receipts: PortalReceipt[];
}) {
  const base = `/p/${token}`;
  const rows: Row[] = [
    ...documents.map((doc) => ({
      key: `doc-${doc.id}`,
      date: doc.issued_at,
      chip: DOCUMENT_KIND_LABEL[doc.kind] ?? doc.kind,
      chipClass: KIND_CHIP[doc.kind] ?? "bg-pine-100 text-pine-800",
      title: doc.title,
      meta: `${fmtDate(doc.issued_at)} · ${doc.professional_name}`,
      href: `${base}/documentos/${doc.id}`,
      pdfHref: `${base}/documentos/${doc.id}/pdf`,
    })),
    ...receipts.map((receipt) => {
      const date = (receipt.paid_at ?? receipt.due_date).slice(0, 10);
      return {
        key: `rec-${receipt.id}`,
        date,
        chip: "Recibo",
        chipClass: "bg-emerald-100 text-emerald-800",
        title: `Recibo de ${fmtDate(date)} — ${moneyBR(receipt.amount_cents)}`,
        meta: receipt.description,
        href: `${base}/recibos/${receipt.id}`,
      };
    }),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return (
    <section className="section-pastel mt-8 rounded-2xl p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold tracking-tight text-pine-950">Documentos</h2>
        {rows.length > 0 ? (
          <span className="text-xs font-bold uppercase tracking-wider text-pine-900/45">{rows.length}</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-pine-900/60">
        Atestados, encaminhamentos, laudos, orientações e recibos que a clínica emitiu para você. Abra, mostre ou
        imprima quando precisar.
      </p>

      {rows.length === 0 ? (
        <p className="card mt-4 px-5 py-4 text-sm text-pine-900/55">Nenhum documento ainda.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.key} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <span className={`chip ${row.chipClass}`}>{row.chip}</span>
                <p className="mt-1.5 break-words text-sm font-bold text-pine-950">{row.title}</p>
                <p className="truncate text-xs text-pine-900/55">{row.meta}</p>
              </div>
              {/* No celular os botões descem para uma linha própria, em largura cheia. */}
              <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                <Link href={row.href} className="btn btn-primary flex-1 sm:flex-none">
                  Abrir
                </Link>
                {row.pdfHref ? (
                  <a href={row.pdfHref} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-w-16">
                    PDF
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
