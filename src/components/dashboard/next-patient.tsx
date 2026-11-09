import Link from "next/link";
import type { NextKind } from "@/lib/next-appointment";
import type { TodayAppointment } from "./today-appointments";

const EYEBROW: Record<NextKind, string> = {
  em_atendimento: "Em atendimento agora",
  proximo: "Próximo paciente",
  atrasado: "Consulta em atraso",
};

/** O topo do início: quem o médico atende agora, com o botão para começar. */
export function NextPatient({
  next,
  canAttend,
}: {
  next: { appointment: TodayAppointment; kind: NextKind } | null;
  canAttend: boolean;
}) {
  if (!next) {
    return (
      <div>
        <h2 className="text-xl font-extrabold leading-tight tracking-tight text-pine-950">
          Nenhuma consulta pendente hoje
        </h2>
        <p className="mt-1 text-sm text-pine-950/75">Busque um paciente abaixo para abrir a ficha ou começar um atendimento.</p>
      </div>
    );
  }

  const { appointment: a, kind } = next;
  const action = !canAttend ? "Abrir ficha" : kind === "em_atendimento" ? "Continuar atendimento" : "Atender";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-pine-950/65">{EYEBROW[kind]}</p>
        <h2 className="mt-1 text-[22px] font-extrabold leading-tight tracking-tight break-words text-pine-950 sm:text-[26px]">
          <span className="tabular-nums">{a.start_time.slice(0, 5)}</span> · {a.patient_name}
        </h2>
        <p className="mt-1 truncate text-sm text-pine-950/75">
          {a.procedure} · {a.professional_name}
        </p>
      </div>
      <Link
        href={`/pacientes/${a.patient_id}${canAttend ? "?atender=1#novo-atendimento" : ""}`}
        className="btn btn-primary shrink-0 justify-center px-6 py-3"
      >
        {action}
      </Link>
    </div>
  );
}
