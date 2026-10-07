import type { HubSubmission } from "@/lib/hub";
import { pendingRenewalFor } from "@/lib/hub-feedback";
import { isSigned, prescriptionDate, type PrescriptionRow } from "@/lib/prescriptions-db";
import { fmtDate } from "@/lib/format";
import { PrescriptionQr } from "./prescription-qr";
import { RenewalRequest } from "./renewal-form";

/**
 * "Receitas digitais" do portal: cada receita da Memed com o link, o PDF, o
 * código de acesso da farmácia, o QR e, quando dá, o pedido de renovação.
 */
export function PrescriptionsSection({
  token,
  prescriptions,
  submissions,
  canRenew,
}: {
  token: string;
  prescriptions: PrescriptionRow[];
  submissions: HubSubmission[];
  /** Envios do portal e o kind 'renovacao' disponíveis (migrações aplicadas). */
  canRenew: boolean;
}) {
  return (
    <section aria-labelledby="receitas-titulo" className="section-pastel mt-8 rounded-2xl p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="receitas-titulo" className="font-display text-xl font-semibold tracking-tight text-pine-950">
          Receitas digitais
        </h2>
        {prescriptions.length > 0 ? (
          <span className="text-xs font-bold uppercase tracking-wider text-pine-900/50">{prescriptions.length}</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-pine-900/60">
        Suas receitas ficam aqui, no celular, para abrir quando precisar — na farmácia ou em casa.
      </p>

      {prescriptions.length === 0 ? (
        <p className="card mt-4 px-5 py-4 text-sm text-pine-900/60">
          Nenhuma receita digital ainda. Quando o profissional emitir uma, ela aparece aqui.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {prescriptions.map((rx) => (
            <li key={rx.id} className="card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-pine-950">Emitida em {fmtDate(prescriptionDate(rx))}</p>
                {/* Só afirma a assinatura quando a Memed confirma (campo `signed`). */}
                {isSigned(rx) ? <span className="badge-signed">Assinada digitalmente</span> : null}
              </div>
              {rx.patient_link || rx.pdf_url ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {rx.patient_link ? (
                    <a href={rx.patient_link} target="_blank" rel="noopener noreferrer" className="btn btn-primary flex-1">
                      Abrir receita
                    </a>
                  ) : null}
                  {rx.pdf_url ? (
                    <a href={rx.pdf_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-w-16">
                      PDF
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-pine-900/50">
                  O link desta receita ainda está sendo preparado — tente de novo em instantes.
                </p>
              )}
              {/* Os 4 dígitos que a farmácia pede para abrir a receita. Sem eles o
                  link sozinho não serve — e antes de 2026-09-17 nunca eram guardados. */}
              {rx.access_code ? (
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-pine-50 px-3.5 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-pine-900/55">Código de acesso</span>
                  <span className="select-all font-mono text-lg font-bold tracking-[0.2em] text-pine-950">
                    {rx.access_code}
                  </span>
                </div>
              ) : null}
              {rx.patient_link ? <PrescriptionQr link={rx.patient_link} memedId={rx.memed_prescription_id} /> : null}
              {canRenew && rx.memed_prescription_id ? (
                <RenewalRequest
                  token={token}
                  rowId={rx.id}
                  prescriptionId={rx.memed_prescription_id}
                  pending={pendingRenewalFor(submissions, rx.memed_prescription_id)}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
