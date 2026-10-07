import { requestRenewalAction } from "@/lib/actions-hub";
import { RENEWAL_MAX } from "@/lib/hub-forms";

/**
 * "Precisa renovar esta receita?" — formulário recolhido dentro do card de
 * cada receita digital. Sem JS: <details> + <form action>. Com um pedido
 * pendente, mostra o estado "enviado" no lugar do formulário.
 */
export function RenewalRequest({
  token,
  rowId,
  prescriptionId,
  pending,
  open,
}: {
  token: string;
  /** Id da linha em `memed_prescriptions`, só para os ids do HTML. */
  rowId: number;
  prescriptionId: string;
  pending: { message: string | null } | null;
  open?: boolean;
}) {
  if (pending) {
    return (
      <div className="mt-3 rounded-2xl bg-pine-50 px-4 py-3 text-sm" role="status">
        <p className="font-bold text-pine-950">Pedido de renovação enviado ✓</p>
        <p className="mt-1 text-pine-900/60">O consultório vai avaliar. Se aprovar, a nova receita aparece aqui.</p>
        {pending.message ? (
          <p className="mt-2 border-l-2 border-pine-200 pl-3 text-pine-900/70">“{pending.message}”</p>
        ) : null}
      </div>
    );
  }

  const fieldId = `renovacao-${rowId}`;
  // O padding vertical fica no <summary>: a linha inteira vira alvo de toque.
  return (
    <details className="group mt-3 rounded-2xl bg-pine-50 px-4" open={open}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-bold text-pine-800 [&::-webkit-details-marker]:hidden">
        <span>Precisa renovar esta receita?</span>
        <span className="text-xs font-semibold text-pine-600 group-open:hidden">pedir renovação</span>
      </summary>
      <form action={requestRenewalAction} className="space-y-3 pb-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="prescription_id" value={prescriptionId} />
        <div>
          <label htmlFor={fieldId} className="label">
            Alguma observação? (opcional)
          </label>
          <textarea
            id={fieldId}
            name="message"
            className="input"
            rows={2}
            maxLength={RENEWAL_MAX}
            placeholder="Ex.: uso contínuo, acabou esta semana"
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">
          Pedir renovação
        </button>
        <p className="text-xs text-pine-900/50">
          Quem te atende avalia o pedido. Renovação não é automática — pode ser que a clínica peça uma consulta.
        </p>
      </form>
    </details>
  );
}
