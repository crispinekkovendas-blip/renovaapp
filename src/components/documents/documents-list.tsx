import { Fragment } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type { PrescriptionRow } from "@/lib/prescriptions-db";
import { prescriptionDate, isSigned } from "@/lib/prescriptions-db";
import type { DocumentListRow } from "@/lib/documents-db";
import { DOCUMENT_KIND_LABEL, documentWhatsAppMessage } from "@/lib/documents";
import type { DocumentKind } from "@/lib/documents";
import { duplicateDocumentAction } from "@/lib/actions-documents";
import { canActOnDocument, canIssueDocuments } from "@/lib/document-permissions";
import type { IssuerSession } from "@/lib/document-permissions";
import { groupByYear } from "@/lib/composer-rail";
import { fmtDate, moneyBR, waLink } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import { ReopenPrescriptionButton } from "@/components/memed/prescribe-button";

/**
 * Seção "Documentos" do prontuário: tudo o que o paciente recebeu, numa lista
 * só — documentos da clínica, receitas digitais da Memed e recibos de
 * pagamentos recebidos — do mais recente ao mais antigo, cada um com Abrir,
 * Reenviar (WhatsApp com o link do portal) e, nos documentos, Renovar (abre
 * o compositor com uma cópia de hoje) e Duplicar (cópia imediata). Os botões
 * de "novo" levam ao compositor "Emitir documentos" com o tipo já escolhido.
 */

export interface ReceiptRow {
  id: number;
  description: string;
  amount_cents: number;
  paid_at: string | null;
  due_date: string;
}

// Ações da linha (Abrir, Reenviar…): no celular viram alvos de 44px de altura
// com área de toque lateral; do sm para cima voltam a ser links de texto.
const ROW_ACTION =
  "inline-flex min-h-11 items-center rounded-lg px-2 font-bold text-pine-700 hover:underline active:bg-pine-50 sm:min-h-0 sm:px-0";

const FILTER_PILL =
  "inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-bold transition-colors pointer-coarse:py-2";
const FILTER_ON = "border-pine-950 bg-pine-950 text-white";
const FILTER_OFF = "border-[#e2dcec] bg-white text-pine-900/70 hover:border-pine-400";

const KIND_CHIP: Record<DocumentKind, string> = {
  atestado: "bg-pine-100 text-pine-800",
  encaminhamento: "bg-sky-100 text-sky-800",
  laudo: "bg-clay-100 text-clay-800",
  orientacoes: "bg-peach-100 text-pine-900",
  receituario: "bg-emerald-100 text-emerald-800",
};

/** Ordem da lista, pela URL (`?ordem=`). */
export const DOCUMENT_ORDERS = [
  { id: "recentes", label: "Mais recentes" },
  { id: "antigos", label: "Mais antigos" },
  { id: "tipo", label: "Por tipo" },
] as const;
type DocumentOrder = (typeof DOCUMENT_ORDERS)[number]["id"];

interface Row {
  key: string;
  /** Para o filtro por tipo: o tipo do documento, "receita" (Memed) ou "recibo". */
  group: string;
  date: string;
  chip: string;
  chipClass: string;
  title: string;
  meta: string;
  open: ReactNode;
  resend: string | null;
  duplicateId?: number;
  renewHref?: string;
  /** Situação do documento no portal: "No portal", "Fora do portal" ou "Revogado". */
  status?: { label: string; className: string };
}

function documentStatus(doc: Pick<DocumentListRow, "revoked_at" | "shared_with_patient">): Row["status"] {
  if (doc.revoked_at) return { label: "Revogado", className: "bg-rose-100 text-rose-700" };
  if (Number(doc.shared_with_patient) === 1) return { label: "No portal", className: "bg-emerald-100 text-emerald-800" };
  return { label: "Fora do portal", className: "bg-stone-200 text-stone-600" };
}

export function DocumentsSection({
  patientId,
  patientName,
  patientPhone,
  clinicName,
  portalUrl,
  latestEncounterId,
  ready,
  documents,
  prescriptions,
  receipts,
  headerExtra,
  viewer,
  order: orderParam,
  filter,
  hrefFor,
}: {
  patientId: number;
  patientName: string;
  patientPhone: string | null;
  clinicName: string;
  portalUrl: string;
  latestEncounterId: number | null;
  /** Migração 2026-09-09 já rodou? Sem ela, só receitas e recibos aparecem. */
  ready: boolean;
  documents: DocumentListRow[];
  prescriptions: PrescriptionRow[];
  receipts: ReceiptRow[];
  /** Algo à direita do título (o "Sincronizar" da Memed, por exemplo). */
  headerExtra?: ReactNode;
  /** Quem está vendo: Renovar e Duplicar só aparecem para quem pode emitir. */
  viewer: IssuerSession;
  /** `?ordem=` e `?tipo=` da URL; sem eles, tudo do mais recente ao mais antigo. */
  order?: string;
  filter?: string;
  /** O link que troca ordem e filtro (a ficha mantém a aba). Sem ele, a lista não mostra os controles. */
  hrefFor?: (order: string, filter: string | null) => string;
}) {
  const order: DocumentOrder = DOCUMENT_ORDERS.some((o) => o.id === orderParam) ? (orderParam as DocumentOrder) : "recentes";
  const canIssue = canIssueDocuments(viewer);
  const firstName = patientName.split(/\s+/)[0] ?? patientName;
  const encounterQuery = latestEncounterId ? `&encounter=${latestEncounterId}` : "";

  const rows: Row[] = [
    ...documents.map<Row>((doc) => ({
      key: `doc-${doc.id}`,
      group: doc.kind,
      date: doc.issued_at,
      chip: DOCUMENT_KIND_LABEL[doc.kind],
      chipClass: KIND_CHIP[doc.kind],
      title: doc.title,
      meta: `${fmtDate(doc.issued_at)} · ${doc.professional_name} · ${doc.code}`,
      status: documentStatus(doc),
      open: (
        <Link href={`/pacientes/${patientId}/documentos/${doc.id}`} className={ROW_ACTION}>
          Abrir
        </Link>
      ),
      resend: doc.revoked_at
        ? null
        : waLink(
            patientPhone,
            documentWhatsAppMessage({ firstName, clinicName, title: doc.title, portalUrl, code: doc.code })
          ),
      duplicateId: canActOnDocument(viewer, doc.professional_id) ? doc.id : undefined,
      renewHref: canIssue ? `/pacientes/${patientId}/emitir?from=${doc.id}${encounterQuery}` : undefined,
    })),
    ...prescriptions.map<Row>((rx) => ({
      key: `rx-${rx.id}`,
      group: "receita",
      date: prescriptionDate(rx),
      chip: "Receita digital",
      chipClass: "bg-emerald-100 text-emerald-800",
      title: "Receita digital (Memed)",
      // "Assinada" só quando a Memed confirma; o código de acesso ao lado é o
      // que a recepção lê para o paciente quando a farmácia pede.
      meta: [
        fmtDate(prescriptionDate(rx)),
        isSigned(rx) ? "assinada digitalmente" : null,
        rx.access_code ? `código ${rx.access_code}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      open: (
        <ReopenPrescriptionButton
          patientId={patientId}
          encounterId={rx.encounter_id ?? latestEncounterId}
          prescriptionId={rx.memed_prescription_id}
          className={ROW_ACTION}
        />
      ),
      resend: waLink(
        patientPhone,
        `Olá ${firstName}! Aqui é da ${clinicName}. Sua receita digital está no seu portal: ${portalUrl}`
      ),
    })),
    ...receipts.map<Row>((payment) => ({
      key: `rec-${payment.id}`,
      group: "recibo",
      date: (payment.paid_at ?? payment.due_date).slice(0, 10),
      chip: "Recibo",
      chipClass: "bg-stone-200 text-stone-600",
      title: `Recibo nº ${payment.id} — ${moneyBR(payment.amount_cents)}`,
      meta: `${fmtDate((payment.paid_at ?? payment.due_date).slice(0, 10))} · ${payment.description}`,
      open: (
        <Link href={`/financeiro/recibo/${payment.id}`} target="_blank" className={ROW_ACTION}>
          Abrir
        </Link>
      ),
      resend: waLink(
        patientPhone,
        `Olá ${firstName}! Aqui é da ${clinicName}. Seu recibo nº ${payment.id} está no seu portal: ${portalUrl}`
      ),
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  // Filtro por tipo: só os tipos que existem na lista, com a contagem de cada um.
  const kinds = [...new Map(rows.map((row) => [row.group, row.chip])).entries()];
  const activeFilter = filter && kinds.some(([group]) => group === filter) ? filter : null;
  const filtered = activeFilter ? rows.filter((row) => row.group === activeFilter) : rows;
  const visible =
    order === "antigos"
      ? [...filtered].reverse()
      : order === "tipo"
        ? [...filtered].sort((a, b) => a.chip.localeCompare(b.chip, "pt-BR") || (a.date < b.date ? 1 : -1))
        : filtered;

  // Separadores: por tipo na ordem "Por tipo"; senão, "2025" quando a lista atravessa
  // mais de um ano (como o Histórico da Mevo) — com tudo no mesmo ano, nada muda.
  const groups =
    order === "tipo"
      ? [...new Map(visible.map((row) => [row.chip, visible.filter((r) => r.chip === row.chip)])).entries()].map(
          ([label, items]) => ({ year: label, items })
        )
      : groupByYear(visible, (row) => row.date);
  const showYears = groups.length > 1;

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <SectionTitle>Documentos</SectionTitle>
        <span className="flex items-center gap-3">
          {rows.length > 0 ? <span className="text-xs font-bold text-pine-900/45">{rows.length}</span> : null}
          {headerExtra}
        </span>
      </div>

      {!ready ? (
        <p className="mb-3 rounded-xl bg-clay-50 px-4 py-2 text-xs text-clay-900">
          Atestados, encaminhamentos e laudos digitais ficam disponíveis depois da migração 2026-09-09.
        </p>
      ) : null}

      {hrefFor && rows.length > 1 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Filtrar por tipo" className="scroll-x -mx-1 flex gap-1.5 px-1">
            <Link
              href={hrefFor(order, null)}
              scroll={false}
              aria-current={!activeFilter ? "true" : undefined}
              className={`${FILTER_PILL} ${!activeFilter ? FILTER_ON : FILTER_OFF}`}
            >
              Todos <span className="opacity-60">{rows.length}</span>
            </Link>
            {kinds.map(([group, label]) => (
              <Link
                key={group}
                href={hrefFor(order, group)}
                scroll={false}
                aria-current={activeFilter === group ? "true" : undefined}
                className={`${FILTER_PILL} ${activeFilter === group ? FILTER_ON : FILTER_OFF}`}
              >
                {label} <span className="opacity-60">{rows.filter((row) => row.group === group).length}</span>
              </Link>
            ))}
          </nav>
          <nav aria-label="Ordenar" className="flex rounded-full bg-pine-100/60 p-0.5">
            {DOCUMENT_ORDERS.map((o) => (
              <Link
                key={o.id}
                href={hrefFor(o.id, activeFilter)}
                scroll={false}
                aria-current={order === o.id ? "true" : undefined}
                className={`rounded-full px-3 py-1 text-[12px] font-bold transition-colors pointer-coarse:py-2 ${
                  order === o.id ? "bg-white text-pine-950 shadow-sm" : "text-pine-900/60 hover:text-pine-950"
                }`}
              >
                {o.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="card px-4 py-4 text-sm sm:px-5 text-pine-900/55">
          Nenhum documento ainda. Tudo o que você emitir aqui fica na ficha e, se quiser, no portal do paciente.
        </p>
      ) : (
        <div className="card divide-y divide-pine-900/5">
          {groups.map((group) => (
            <Fragment key={group.year}>
              {showYears ? (
                <div className="bg-pine-50/60 px-4 py-1.5 sm:px-5 text-[11px] font-bold text-pine-900/45">
                  {group.year}
                </div>
              ) : null}
              {group.items.map((row: Row) => (
                <div key={row.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 sm:gap-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-pine-950">
                      <span className={`chip ${row.chipClass}`}>{row.chip}</span>
                      <span className="min-w-0 max-w-full truncate">{row.title}</span>
                      {row.status ? (
                        <span className={`chip px-2 py-0.5 text-[10px] ${row.status.className}`}>{row.status.label}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 break-words text-xs text-pine-900/55">{row.meta}</p>
                  </div>
                  {/* No celular as ações ocupam a linha de baixo, encostadas à esquerda
                      (o -mx-2 compensa o respiro lateral dos alvos de toque). */}
                  <div className="-mx-2 flex w-full flex-wrap items-center gap-x-1 text-sm sm:mx-0 sm:w-auto sm:gap-3 sm:text-xs">
                    {row.open}
                    {row.resend ? (
                      <a
                        href={row.resend}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={ROW_ACTION}
                      >
                        Reenviar
                      </a>
                    ) : null}
                    {row.renewHref ? (
                      <Link href={row.renewHref} className={ROW_ACTION}>
                        Renovar
                      </Link>
                    ) : null}
                    {row.duplicateId ? (
                      <form action={duplicateDocumentAction}>
                        <input type="hidden" name="id" value={row.duplicateId} />
                        <button type="submit" className={ROW_ACTION}>
                          Duplicar
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
