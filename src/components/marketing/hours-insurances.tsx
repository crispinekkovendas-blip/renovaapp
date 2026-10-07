import type { HoursRun } from "@/lib/clinic-public";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * Um bloco pastel, duas colunas: os horários (resumidos das agendas de todos
 * os profissionais) e os convênios (`settings.clinic_insurances`). Cada
 * coluna some quando não há dado; sem nenhum, a seção inteira some.
 */
export function HoursInsurances({ hours, insurances }: { hours: HoursRun[]; insurances: string[] }) {
  const hasHours = hours.length > 0;
  const hasInsurances = insurances.length > 0;
  if (!hasHours && !hasInsurances) return null;

  return (
    <section id="horarios" aria-labelledby="horarios-titulo" className="scroll-mt-20 bg-peach-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading
          id="horarios-titulo"
          eyebrow={hasHours && hasInsurances ? "Horários e convênios" : hasHours ? "Horários" : "Convênios"}
          title={
            hasHours && hasInsurances
              ? "Quando dá pra vir? E como pagar?"
              : hasHours
                ? "Quando dá pra vir?"
                : "Como você paga?"
          }
        />

        <div className={`mt-10 grid gap-6 ${hasHours && hasInsurances ? "lg:grid-cols-2" : "lg:max-w-2xl"}`}>
          {hasHours ? (
            <Reveal className="card p-6 sm:p-8">
              <h3 className="font-display text-2xl font-semibold tracking-tight text-pine-950">
                Horário de atendimento
              </h3>
              <dl className="mt-4 divide-y divide-pine-900/10">
                {hours.map((run) => (
                  <div key={run.days} className="flex items-baseline justify-between gap-6 py-3">
                    <dt className="font-bold text-pine-950">{run.days}</dt>
                    <dd className="text-right text-pine-900/75 tabular-nums">{run.hours}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-pine-900/60">
                Cada profissional tem a própria agenda. Na hora de marcar, você vê só o que está livre.
              </p>
            </Reveal>
          ) : null}

          {hasInsurances ? (
            <Reveal delay={hasHours ? 100 : 0} className="card p-6 sm:p-8">
              <h3 className="font-display text-2xl font-semibold tracking-tight text-pine-950">
                Convênios aceitos
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {insurances.map((name) => (
                  <li key={name} className="chip bg-peach-100 px-3.5 py-1.5 text-sm text-pine-950">
                    {name}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-pine-900/60">
                Não achou o seu? Fale com a clínica antes de marcar.
              </p>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}
