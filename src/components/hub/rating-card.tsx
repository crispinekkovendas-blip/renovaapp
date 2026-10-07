import { Fragment } from "react";
import { rateVisitAction } from "@/lib/actions-hub";
import { RATING_COMMENT_MAX } from "@/lib/hub-forms";
import type { ConcludedAppointment } from "@/lib/hub";
import { fmtDate } from "@/lib/format";

/**
 * "Como foi a consulta?" — cinco estrelas como radios, só CSS: os inputs
 * ficam em ordem invertida (5 → 1) num flex-row-reverse, então `input:checked
 * ~ label` acende a estrela marcada e todas as menores; o hover faz o mesmo
 * com `label:hover ~ label`. Sem JS, funciona com teclado (setas entre as
 * opções) e o `required` da primeira opção garante que uma nota foi dada.
 */
export function RatingCard({
  token,
  appointment,
  firstName,
}: {
  token: string;
  appointment: ConcludedAppointment;
  firstName: string;
}) {
  return (
    <section className="card mt-6 p-5 sm:p-6">
      <p className="label">Como foi a consulta?</p>
      <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-pine-950">
        Conta pra gente, {firstName}
      </h2>
      <p className="mt-1 text-sm text-pine-900/60">
        Consulta de {fmtDate(appointment.date)} com {appointment.professional_name}. Leva dez segundos e ajuda a
        clínica a cuidar melhor de você.
      </p>

      <form action={rateVisitAction} className="mt-4 space-y-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="appointment_id" value={appointment.id} />

        <fieldset>
          <legend className="label">Sua nota</legend>
          <div className="flex flex-row-reverse justify-end gap-1 text-4xl leading-none">
            {[5, 4, 3, 2, 1].map((n) => (
              <Fragment key={n}>
                <input
                  type="radio"
                  id={`nota-${n}`}
                  name="rating"
                  value={n}
                  required
                  className="peer sr-only"
                />
                <label
                  htmlFor={`nota-${n}`}
                  className="inline-flex min-h-12 min-w-11 cursor-pointer items-center justify-center rounded-lg px-0.5 text-pine-900/20 transition-colors hover:text-sun-400 peer-checked:text-sun-500 [&:hover~label]:text-sun-400 [input:focus-visible+&]:outline-2 [input:focus-visible+&]:outline-offset-2 [input:focus-visible+&]:outline-sun-400"
                >
                  <span className="sr-only">
                    {n} {n === 1 ? "estrela" : "estrelas"}
                  </span>
                  <span aria-hidden="true">★</span>
                </label>
              </Fragment>
            ))}
          </div>
          <p className="mt-1 text-xs text-pine-900/50">1 = não gostei · 5 = adorei</p>
        </fieldset>

        <div>
          <label htmlFor="avaliacao-msg" className="label">
            Quer contar mais? (opcional)
          </label>
          <textarea
            id="avaliacao-msg"
            name="message"
            className="input"
            rows={3}
            maxLength={RATING_COMMENT_MAX}
            placeholder="O que foi bom, o que pode melhorar…"
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 py-1 text-sm text-pine-900/70">
          <input type="checkbox" name="publish" value="1" className="mt-0.5 h-5 w-5 shrink-0 accent-pine-800 sm:mt-1 sm:h-4 sm:w-4" />
          <span>
            Pode publicar meu comentário na página da clínica
            <span className="block text-xs text-pine-900/50">Só o seu primeiro nome aparece, nunca o sobrenome.</span>
          </span>
        </label>

        <button type="submit" className="btn btn-primary w-full">
          Enviar avaliação
        </button>
      </form>
    </section>
  );
}
