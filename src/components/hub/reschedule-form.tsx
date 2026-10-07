import { requestRescheduleAction } from "@/lib/actions-hub";
import { RESCHEDULE_MAX } from "@/lib/hub-forms";

/**
 * "Precisa remarcar?" — formulário recolhido no card da próxima consulta.
 * Sem JS: <details> + <form action>. Quando já existe um pedido pendente,
 * mostra o estado "enviado" em vez do formulário.
 */
export function RescheduleRequest({
  token,
  appointmentId,
  pending,
  open,
}: {
  token: string;
  appointmentId: number;
  pending: { message: string | null } | null;
  /** Abre por padrão (depois de um erro, para o paciente ver o campo). */
  open?: boolean;
}) {
  if (pending) {
    return (
      <div className="rounded-2xl bg-pine-50 px-4 py-3 text-sm" role="status">
        <p className="font-bold text-pine-950">Pedido de remarcação enviado ✓</p>
        <p className="mt-1 text-pine-900/60">
          A clínica te chama no WhatsApp para combinar o novo horário. Até lá, a consulta continua marcada.
        </p>
        {pending.message ? (
          <p className="mt-2 border-l-2 border-pine-200 pl-3 text-pine-900/70">“{pending.message}”</p>
        ) : null}
      </div>
    );
  }

  // O padding vertical fica no <summary>: a linha inteira vira alvo de toque.
  return (
    <details className="group rounded-2xl bg-pine-50 px-4" open={open}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-bold text-pine-800 [&::-webkit-details-marker]:hidden">
        <span>Precisa remarcar?</span>
        <span className="text-xs font-semibold text-pine-600 group-open:hidden">pedir outro horário</span>
      </summary>
      <form action={requestRescheduleAction} className="space-y-3 pb-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="appointment_id" value={appointmentId} />
        <div>
          <label htmlFor="remarcacao-msg" className="label">
            Quando fica bom pra você?
          </label>
          <textarea
            id="remarcacao-msg"
            name="message"
            className="input"
            rows={3}
            maxLength={RESCHEDULE_MAX}
            required
            placeholder="Ex.: qualquer dia da semana que vem, de manhã"
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Pedir remarcação
        </button>
        <p className="text-xs text-pine-900/50">
          Sua consulta continua marcada até a clínica confirmar o novo horário com você.
        </p>
      </form>
    </details>
  );
}
