import { unlockPortalAction } from "@/lib/actions-hub";
import { PIN_LENGTH } from "@/lib/hub-pin";
import { Feedback } from "@/components/feedback";

/**
 * O portal trancado: um card pedindo os 4 últimos dígitos do celular. Sem JS
 * funciona igual (<form action>). Depois de acertar, o navegador guarda o
 * cookie e volta para onde a pessoa queria ir (`redirectTo`).
 */
export function PinGate({ token, redirectTo, error }: { token: string; redirectTo: string; error?: boolean }) {
  return (
    <div className="card p-6 sm:p-8">
      <p className="label">Código de acesso</p>
      <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-pine-950">
        Digite os 4 últimos números do seu celular
      </h1>
      <p className="mt-2 text-sm text-pine-900/60">
        É uma proteção a mais: só quem tem este link e o seu celular vê o portal.
      </p>

      {error ? (
        <Feedback tone="erro" className="mt-4">
          Não bateu. Confira os 4 últimos números do celular cadastrado na clínica.
        </Feedback>
      ) : null}

      <form action={unlockPortalAction} className="mt-5 space-y-3">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <div>
          <label htmlFor="portal-pin" className="label">
            4 últimos números
          </label>
          <input
            id="portal-pin"
            name="pin"
            className="input text-center font-mono text-2xl tracking-[0.5em]"
            inputMode="numeric"
            pattern="[0-9]*"
            minLength={PIN_LENGTH}
            maxLength={PIN_LENGTH}
            autoComplete="one-time-code"
            enterKeyHint="go"
            placeholder="••••"
            required
          />
        </div>
        <button type="submit" className="btn-hero w-full">
          Entrar
          <span className="chev" aria-hidden="true" />
        </button>
      </form>

      <p className="mt-4 text-xs text-pine-900/50">
        Trocou de número? Fale com a clínica para atualizar o cadastro.
      </p>
    </div>
  );
}
