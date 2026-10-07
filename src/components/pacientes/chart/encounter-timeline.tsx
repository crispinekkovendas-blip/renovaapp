import Link from "next/link";
import type { Encounter } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { EmptyState } from "@/components/ui";
import { IconFileText } from "@/components/icons";
import { IconPrinter } from "./icon-printer";

type ClinicalField = "complaint" | "anamnesis" | "exam" | "diagnosis" | "plan" | "prescription";

/** Os campos clínicos do atendimento, na ordem da ficha; só os preenchidos aparecem. */
const FIELDS: readonly { key: ClinicalField; label: string; ddClass?: string }[] = [
  { key: "complaint", label: "Queixa" },
  { key: "anamnesis", label: "Anamnese", ddClass: "whitespace-pre-line" },
  { key: "exam", label: "Exame físico", ddClass: "whitespace-pre-line" },
  { key: "diagnosis", label: "Hipótese diagnóstica", ddClass: "font-semibold" },
  { key: "plan", label: "Conduta", ddClass: "whitespace-pre-line" },
  {
    key: "prescription",
    label: "Receita",
    ddClass: "whitespace-pre-line rounded-xl border border-clay-200 bg-clay-50 p-3 font-mono text-xs",
  },
];

const FOOTER_ACTION = "btn btn-outline flex-1 whitespace-nowrap px-3 py-1.5 text-xs sm:flex-none";

/** Linha do tempo dos atendimentos, do mais recente ao mais antigo. */
export function EncounterTimeline({ patientId, encounters }: { patientId: number; encounters: Encounter[] }) {
  if (encounters.length === 0) {
    return (
      <EmptyState
        title="Prontuário vazio"
        hint="Use “Novo atendimento” acima para registrar a primeira consulta — a partir dela você imprime receituário e atestado."
      />
    );
  }

  return (
    <ol className="relative ml-1.5 space-y-4 border-l-2 border-pine-200 pl-4 sm:ml-3 sm:space-y-6 sm:pl-6">
      {encounters.map((encounter) => (
        <li key={encounter.id} className="relative">
          {/* Bolinha centrada na linha: -(recuo + 1px da borda + 6px do raio). */}
          <span
            aria-hidden
            className="absolute -left-[23px] top-6 h-3 w-3 rounded-full border-2 border-white bg-pine-600 sm:-left-[31px]"
          />
          <article className="card min-w-0">
            <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-pine-900/5 px-4 pb-3 pt-4 sm:px-5">
              <p className="flex flex-wrap items-baseline gap-2 font-display text-lg font-semibold text-pine-950">
                {fmtDate(encounter.date)}
                {encounter.return_due ? (
                  <span className="chip bg-peach-100 font-sans text-pine-900">Retorno {fmtDate(encounter.return_due)}</span>
                ) : null}
              </p>
              <p className="min-w-0 truncate text-xs font-bold text-pine-900/45">{encounter.professional_name}</p>
            </header>
            <dl className="space-y-2 break-words px-4 py-4 text-sm sm:px-5">
              {FIELDS.map(({ key, label, ddClass }) =>
                encounter[key] ? (
                  <div key={key}>
                    <dt className="label mb-0.5">{label}</dt>
                    <dd className={ddClass}>{encounter[key]}</dd>
                  </div>
                ) : null
              )}
            </dl>
            <footer className="flex flex-wrap gap-2 border-t border-pine-900/5 bg-pine-50/40 px-4 py-3 sm:px-5">
              {encounter.prescription ? (
                <Link
                  href={`/pacientes/${patientId}/imprimir/${encounter.id}?tipo=receita`}
                  target="_blank"
                  className={FOOTER_ACTION}
                >
                  <IconPrinter className="h-3.5 w-3.5" />
                  Imprimir receituário
                </Link>
              ) : (
                <span className="inline-flex items-center px-1 text-xs text-pine-900/40">Sem receita neste atendimento</span>
              )}
              <Link
                href={`/pacientes/${patientId}/emitir?kind=atestado&sub=medico&encounter=${encounter.id}`}
                className={FOOTER_ACTION}
              >
                <IconFileText className="h-3.5 w-3.5" />
                Emitir documentos
              </Link>
            </footer>
          </article>
        </li>
      ))}
    </ol>
  );
}
