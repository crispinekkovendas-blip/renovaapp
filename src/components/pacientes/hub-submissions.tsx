import { adoptPreConsultAction } from "@/lib/actions";
import { handleHubSubmissionAction } from "@/lib/actions-hub";
import type { HubSubmission } from "@/lib/hub";
import {
  HUB_KIND_LABEL,
  PRE_CONSULT_FIELDS,
  parsePreConsultAnswers,
  parseRenewalAnswers,
  starsText,
} from "@/lib/hub-forms";
import { fmtDate } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import { ReopenPrescriptionButton } from "@/components/memed/prescribe-button";

function when(createdAt: string): string {
  return `${fmtDate(createdAt.slice(0, 10))} ${createdAt.slice(11, 16)}`.trim();
}

/**
 * Seção "Portal do paciente" do prontuário: o que este paciente mandou pelo
 * portal — pré-consulta (com "Usar no cadastro" para alergias e medicamentos),
 * avaliações, pedidos de remarcação e de renovação de receita. Some quando
 * não há nada (inclusive quando a tabela ainda não existe).
 */
export function HubSubmissions({
  patientId,
  submissions,
  latestEncounterId = null,
}: {
  patientId: number;
  submissions: HubSubmission[];
  /** Para reabrir a receita na Memed a partir de um pedido de renovação. */
  latestEncounterId?: number | null;
}) {
  if (submissions.length === 0) return null;
  const back = `/pacientes/${patientId}`;

  return (
    <section>
      <SectionTitle>Portal do paciente</SectionTitle>
      <div className="card divide-y divide-pine-900/5">
        {submissions.map((s) => {
          const answers = s.kind === "pre_consulta" ? parsePreConsultAnswers(s.answers) : null;
          const renewal = s.kind === "renovacao" ? parseRenewalAnswers(s.answers) : null;
          const adoptable = Boolean(answers && (answers.alergias || answers.medicamentos));
          return (
            <article key={s.id} className="min-w-0 break-words px-4 py-3">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-bold text-pine-950">{HUB_KIND_LABEL[s.kind] ?? s.kind}</p>
                <p className="text-xs text-pine-900/50">{when(s.created_at)}</p>
              </header>
              {s.appointment_date ? (
                <p className="text-xs text-pine-900/55">
                  Consulta de {fmtDate(s.appointment_date)}
                  {s.appointment_time ? ` às ${s.appointment_time}` : ""}
                  {s.professional_name ? ` · ${s.professional_name}` : ""}
                </p>
              ) : null}

              {s.kind === "pre_consulta" ? (
                answers ? (
                  <>
                    <dl className="mt-2 space-y-1.5 text-sm">
                      {PRE_CONSULT_FIELDS.map((field) => (
                        <div key={field.key}>
                          <dt className="label mb-0">{field.label}</dt>
                          <dd className="whitespace-pre-line">
                            {answers[field.key] || <span className="text-pine-900/40">—</span>}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    {adoptable ? (
                      <form action={adoptPreConsultAction} className="mt-2 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="patient_id" value={patientId} />
                        <button type="submit" className="btn btn-outline px-3 py-1 text-xs">
                          Usar no cadastro
                        </button>
                        <span className="text-xs text-pine-900/50">
                          copia alergias e medicamentos para a ficha, sem apagar o que já está lá
                        </span>
                      </form>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-xs text-pine-900/40">Sem respostas legíveis.</p>
                )
              ) : null}

              {s.kind === "avaliacao" ? (
                <div className="mt-2">
                  <p className="text-lg leading-none tracking-wider text-sun-500" aria-label={`${s.rating ?? 0} de 5`}>
                    {starsText(s.rating)}
                  </p>
                  {s.message ? <p className="mt-1.5 text-sm text-pine-900/80">“{s.message}”</p> : null}
                  <p className="mt-1 text-xs text-pine-900/50">
                    {s.message
                      ? s.publish
                        ? "Comentário liberado para a página da clínica (só o primeiro nome)"
                        : "Comentário só para a clínica"
                      : "Sem comentário"}
                  </p>
                </div>
              ) : null}

              {s.kind === "remarcacao" || s.kind === "renovacao" ? (
                <div className="mt-2">
                  {renewal ? (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-pine-900/55">
                      <span>
                        Receita
                        {renewal.prescription_created_at
                          ? ` de ${fmtDate(renewal.prescription_created_at.slice(0, 10))}`
                          : ""}
                      </span>
                      <ReopenPrescriptionButton
                        patientId={patientId}
                        encounterId={latestEncounterId}
                        prescriptionId={renewal.memed_prescription_id}
                        className="inline-flex min-h-11 items-center font-bold text-pine-700 hover:underline sm:min-h-0"
                      />
                    </p>
                  ) : null}
                  {s.message ? <p className="mt-1 text-sm text-pine-900/80">“{s.message}”</p> : null}
                  {s.handled_at ? (
                    <p className="mt-1 text-xs text-pine-900/50">Resolvido em {when(s.handled_at)}</p>
                  ) : (
                    <form action={handleHubSubmissionAction} className="mt-2 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="redirect_to" value={back} />
                      <span className="chip bg-peach-100 text-pine-900">Pendente</span>
                      <button type="submit" className="btn btn-outline px-3 py-1 text-xs">
                        Marcar como resolvido
                      </button>
                    </form>
                  )}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
