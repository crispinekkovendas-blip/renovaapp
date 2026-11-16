import Link from "next/link";
import { finishVisitAction } from "@/lib/actions-visit";
import { fmtDate, moneyBR } from "@/lib/format";
import { emitVisitHref, returnHref, visitHref, visitSteps } from "@/lib/visit";
import type { VisitStepState } from "@/lib/visit";

/** A consulta de hoje que está "em atendimento" para este paciente. */
export interface OpenVisit {
  id: number;
  start_time: string;
  procedure: string;
  price_cents: number;
  professional_id: number;
  professional_name: string;
}

const BADGE: Record<VisitStepState, string> = {
  feito: "bg-pine-600 text-white",
  agora: "bg-pine-950 text-white",
  opcional: "bg-pine-100 text-pine-800",
  depois: "bg-pine-900/10 text-pine-900/50",
};

/**
 * O atendimento guiado, no alto da ficha enquanto a consulta de hoje está em
 * atendimento: os três passos e o que fazer agora. Antes de registrar, leva ao
 * formulário; depois, oferece a receita, o retorno e o "Concluir" — que fecha
 * a consulta, lança a cobrança e volta ao Início. As regras estão em lib/visit.ts.
 */
export function VisitPanel({
  patientId,
  visit,
  encounter,
  documentsToday,
  canIssue,
  today,
}: {
  patientId: number;
  visit: OpenVisit;
  /** O atendimento registrado hoje, se já há. */
  encounter: { id: number; return_due?: string | null } | null;
  documentsToday: number;
  canIssue: boolean;
  today: string;
}) {
  const steps = visitSteps({ recorded: encounter !== null, documents: documentsToday });

  return (
    <section
      id="atendimento"
      aria-label="Atendimento em andamento"
      className="card mb-5 scroll-mt-20 border-l-4 border-l-pine-600 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs font-bold tracking-wide text-pine-600 uppercase">Atendimento em andamento</p>
        <p className="text-xs text-pine-900/60">
          <span className="tabular-nums">{visit.start_time.slice(0, 5)}</span> · {visit.procedure} · {visit.professional_name}
        </p>
      </div>

      <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {steps.map((step, index) => (
          <li
            key={step.id}
            aria-current={step.state === "agora" ? "step" : undefined}
            className="flex items-center gap-2 text-sm"
          >
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${BADGE[step.state]}`}
            >
              {step.state === "feito" ? "✓" : index + 1}
            </span>
            <span className={step.state === "depois" ? "text-pine-900/45" : "font-bold text-pine-950"}>{step.label}</span>
            {step.state === "feito" ? <span className="sr-only">(feito)</span> : null}
            {step.state === "opcional" ? <span className="text-xs text-pine-900/50">opcional</span> : null}
          </li>
        ))}
      </ol>

      {encounter === null ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-pine-900/70">
            Registre a consulta — queixa, exame, diagnóstico e conduta. Depois a receita e o “Concluir” ficam aqui.
          </p>
          <Link href={visitHref(patientId, { form: true })} className="btn btn-primary shrink-0 justify-center">
            Registrar atendimento
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-pine-900/70">
            Atendimento de hoje registrado.
            {documentsToday > 0
              ? ` ${documentsToday === 1 ? "1 documento emitido" : `${documentsToday} documentos emitidos`} hoje.`
              : ""}
            {encounter.return_due ? ` Retorno previsto para ${fmtDate(encounter.return_due)}.` : ""}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {canIssue ? (
              <Link href={emitVisitHref(patientId, encounter.id)} className="btn btn-outline justify-center">
                Emitir receita ou documento
              </Link>
            ) : null}
            <Link
              href={returnHref({
                patientId,
                professionalId: visit.professional_id,
                returnDue: encounter.return_due,
                today,
              })}
              className="btn btn-outline justify-center"
            >
              Agendar retorno
            </Link>
            <form action={finishVisitAction} className="sm:ml-auto">
              <input type="hidden" name="id" value={visit.id} />
              <button type="submit" className="btn btn-primary w-full justify-center">
                Concluir atendimento
              </button>
            </form>
          </div>
          {visit.price_cents > 0 ? (
            <p className="mt-2 text-xs text-pine-900/55 sm:text-right">
              Ao concluir, a cobrança de {moneyBR(visit.price_cents)} entra no Financeiro.
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
