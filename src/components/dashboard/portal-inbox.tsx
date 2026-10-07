import Link from "next/link";
import { handleHubSubmissionAction } from "@/lib/actions-hub";
import type { InboxRow } from "@/lib/hub";
import { parseRenewalAnswers, renewalReplyMessage, rescheduleReplyMessage } from "@/lib/hub-forms";
import { fmtDate, waLink } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import { ReopenPrescriptionButton } from "@/components/memed/prescribe-button";

/**
 * "Pedidos do portal" no dashboard: pedidos de remarcação e de renovação de
 * receita que a recepção ainda não resolveu. Cada linha tem a resposta pronta
 * no WhatsApp e o botão "Resolvido" (marca `handled_at`); a renovação ainda
 * abre a receita original na Memed. Some quando não há nada pendente.
 */
export function PortalInbox({ rows, clinicName }: { rows: InboxRow[]; clinicName: string }) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <SectionTitle>Pedidos do portal</SectionTitle>
        <span className="text-xs font-bold text-pine-900/45">
          {rows.length} pendente{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="card divide-y divide-pine-900/5 border-peach-300/60">
        {rows.map((row) => {
          const renewal = row.kind === "renovacao" ? parseRenewalAnswers(row.answers) : null;
          const prescriptionDate = renewal?.prescription_created_at ? fmtDate(renewal.prescription_created_at.slice(0, 10)) : "";
          const date = row.appointment_date ? fmtDate(row.appointment_date) : "—";
          const time = row.appointment_time ?? "";
          const reply = waLink(
            row.patient_phone,
            row.kind === "renovacao"
              ? renewalReplyMessage({ patientName: row.patient_name, clinicName, prescriptionDate })
              : rescheduleReplyMessage({ patientName: row.patient_name, clinicName, date, time })
          );
          const when = `${fmtDate(row.created_at.slice(0, 10))} ${row.created_at.slice(11, 16)}`;
          return (
            <div key={row.id} className="flex flex-wrap items-start gap-3 px-4 py-4 sm:gap-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-pine-950">
                  <Link href={`/pacientes/${row.patient_id}`} className="min-w-0 break-words hover:text-pine-600">
                    {row.patient_name}
                  </Link>
                  {row.kind === "renovacao" ? (
                    <span className="chip bg-sky-100 text-sky-800">pede renovação de receita</span>
                  ) : (
                    <span className="chip bg-peach-100 text-pine-900">quer remarcar</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-pine-900/55">
                  {row.kind === "renovacao"
                    ? `Receita${prescriptionDate ? ` de ${prescriptionDate}` : ""} · pedido em ${when}`
                    : `Consulta de ${date}${time ? ` às ${time}` : ""}${
                        row.professional_name ? ` · ${row.professional_name}` : ""
                      } · pedido em ${when}`}
                </p>
                {row.message ? (
                  <p className="mt-2 rounded-xl bg-pine-50 px-3 py-2 text-sm break-words text-pine-900/80">“{row.message}”</p>
                ) : null}
                {renewal ? (
                  <p className="mt-2 text-xs">
                    <ReopenPrescriptionButton
                      patientId={row.patient_id}
                      encounterId={null}
                      prescriptionId={renewal.memed_prescription_id}
                    />
                  </p>
                ) : null}
              </div>
              {/* No celular os dois botões dividem a largura toda, embaixo do pedido. */}
              <div className="flex w-full flex-wrap items-center gap-2 *:flex-1 sm:w-auto sm:shrink-0 sm:*:flex-none">
                {reply ? (
                  <a href={reply} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                    Responder no WhatsApp
                  </a>
                ) : (
                  <span className="text-xs text-pine-900/45">sem telefone</span>
                )}
                <form action={handleHubSubmissionAction} className="flex">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="redirect_to" value="/dashboard" />
                  <button type="submit" className="btn btn-primary w-full">
                    Resolvido
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-pine-900/50">
        Remarcação: remarque pela agenda e depois marque como resolvido — o paciente vê o novo horário no portal.
        Renovação: quem prescreve reabre a receita, decide e emite a nova pelo prontuário; depois, resolvido.
      </p>
    </section>
  );
}
