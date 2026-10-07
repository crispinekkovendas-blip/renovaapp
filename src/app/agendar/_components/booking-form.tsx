import Link from "next/link";
import { createPublicBookingAction } from "@/lib/actions-booking";

/**
 * Passo 3: nome, WhatsApp e e-mail (opcional), mais o consentimento. Os
 * campos e os `name` são o contrato com `createPublicBookingAction` — não
 * mudar sem mudar a ação. Sem JS funciona igual (<form action>).
 */
export function BookingForm({
  professionalId,
  date,
  time,
}: {
  professionalId: number;
  date: string;
  time: string;
}) {
  return (
    <form action={createPublicBookingAction} className="space-y-4">
      <input type="hidden" name="professional_id" value={professionalId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="time" value={time} />
      {/* Honeypot anti-bot — humanos não veem este campo */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label className="label" htmlFor="name">
          Nome completo *
        </label>
        <input
          className="input"
          id="name"
          name="name"
          required
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
        />
      </div>
      <div>
        <label className="label" htmlFor="phone">
          Telefone (WhatsApp) *
        </label>
        <input
          className="input"
          type="tel"
          id="phone"
          name="phone"
          required
          inputMode="tel"
          autoComplete="tel-national"
          enterKeyHint="next"
          placeholder="(11) 90000-0000"
          aria-describedby="phone-hint"
        />
        <p id="phone-hint" className="mt-1 text-xs text-pine-900/55">
          É por aqui que a clínica confirma a consulta.
        </p>
      </div>
      <div>
        <label className="label" htmlFor="email">
          E-mail <span className="font-normal normal-case tracking-normal">(opcional)</span>
        </label>
        <input
          className="input"
          type="email"
          id="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
        />
      </div>
      <label className="flex items-start gap-3 rounded-2xl bg-pine-50 p-3 text-xs leading-relaxed text-pine-900/75">
        <input
          type="checkbox"
          name="consent"
          value="1"
          required
          className="mt-0.5 h-5 w-5 shrink-0 accent-pine-700 sm:h-4 sm:w-4"
        />
        <span>
          Autorizo o uso do meu nome, telefone e e-mail para agendar e confirmar esta consulta, conforme a{" "}
          <Link href="/privacidade" className="font-bold text-pine-700 underline underline-offset-2">
            política de privacidade
          </Link>
          .
        </span>
      </label>
      {/* No celular o botão fica colado no rodapé (acima da barra do iPhone),
          sempre ao alcance do polegar enquanto se preenche o formulário. */}
      <div className="sticky bottom-0 z-10 -mx-4 border-t border-stone-200 bg-paper/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="submit"
          className="btn btn-primary min-h-12 w-full text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine-600"
        >
          Confirmar agendamento
        </button>
        <p className="mt-2 text-center text-xs text-pine-900/55 sm:mt-3">
          Sem cadastro e sem senha. A clínica confirma pelo WhatsApp informado.
        </p>
      </div>
    </form>
  );
}
