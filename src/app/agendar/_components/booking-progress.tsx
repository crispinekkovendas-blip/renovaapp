export const BOOKING_STEPS = ["Profissional", "Dia e horário", "Seus dados"] as const;
export type BookingStep = 1 | 2 | 3;

/**
 * "Passo 2 de 3 · Dia e horário" e uma barra em três segmentos. O nome de
 * cada passo fica para leitor de tela; na tela, só o atual aparece escrito.
 */
export function BookingProgress({ step }: { step: BookingStep }) {
  return (
    <div className="mb-6 sm:mb-8">
      <p className="text-xs font-bold text-pine-900/60">
        Passo {step} de {BOOKING_STEPS.length} · <span className="text-pine-950">{BOOKING_STEPS[step - 1]}</span>
      </p>
      <ol className="mt-2 flex gap-1.5" aria-label="Etapas do agendamento">
        {BOOKING_STEPS.map((label, index) => {
          const n = index + 1;
          return (
            <li
              key={label}
              aria-current={n === step ? "step" : undefined}
              className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-pine-700" : "bg-pine-900/10"}`}
            >
              <span className="sr-only">
                {n}. {label}
                {n < step ? " (feito)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
