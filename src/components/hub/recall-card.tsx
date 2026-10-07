import Link from "next/link";
import type { UpcomingReturn } from "@/lib/hub";
import { recallCardTitle, recallStatus } from "@/lib/recall";

/**
 * "Retorno recomendado para dd/mm com Dra. Fulana" — aparece no portal quando
 * o último atendimento pediu retorno e o paciente ainda não tem consulta
 * marcada. O botão leva ao agendamento online já com o profissional escolhido.
 */
export function RecallCard({ retorno, today }: { retorno: UpcomingReturn; today: string }) {
  const status = recallStatus(retorno.return_due, today);
  const hint = status.overdue
    ? `A data recomendada já passou (${status.label}). Vale marcar assim que puder.`
    : status.days <= 1
      ? `É ${status.label}. Escolha um horário que dê para você.`
      : `Falta pouco (${status.label}). Escolha o horário com calma.`;

  return (
    <section className="card mt-6 overflow-hidden border-peach-300/60 bg-gradient-to-br from-peach-50 to-white">
      <div className="p-5 sm:p-6">
        <p className="label">Retorno</p>
        <p className="mt-2 font-display text-xl font-semibold leading-tight tracking-tight text-pine-950">
          {recallCardTitle(retorno.return_due, retorno.professional_name)}
        </p>
        <p className={`mt-1.5 text-sm ${status.overdue ? "font-semibold text-rose-700" : "text-pine-900/60"}`}>{hint}</p>
      </div>
      <div className="border-t border-pine-900/10 bg-white/60 p-4 sm:p-5">
        <Link href={`/agendar?prof=${retorno.professional_id}`} className="btn-hero w-full">
          Agendar retorno
          <span className="chev" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
