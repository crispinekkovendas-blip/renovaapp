import { preConsultAction } from "@/lib/actions-hub";
import { PRE_CONSULT_FIELDS, PRE_CONSULT_MAX } from "@/lib/hub-forms";

/**
 * Pré-consulta: quatro perguntas que o paciente responde antes de chegar,
 * para a consulta começar já sabendo o essencial. <details> + <form action>,
 * sem JS. Depois de enviada, só o estado "enviada".
 */
export function PreConsultForm({
  token,
  appointmentId,
  sent,
  open,
}: {
  token: string;
  appointmentId: number;
  sent: boolean;
  open?: boolean;
}) {
  if (sent) {
    return (
      <div className="rounded-2xl bg-pine-50 px-4 py-3 text-sm" role="status">
        <p className="font-bold text-pine-950">Pré-consulta enviada ✓</p>
        <p className="mt-1 text-pine-900/60">
          Suas respostas já estão com quem vai te atender. A consulta começa mais rápida.
        </p>
      </div>
    );
  }

  // O padding vertical fica no <summary>: a linha inteira vira alvo de toque.
  return (
    <details className="group rounded-2xl bg-pine-50 px-4" open={open}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-sm font-bold text-pine-800 [&::-webkit-details-marker]:hidden">
        <span>
          Adiantar a consulta
          <span className="mt-0.5 block text-xs font-normal text-pine-900/55">
            Quatro perguntas, dois minutos — e a consulta começa já sabendo de você.
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-pine-600 group-open:hidden">responder</span>
      </summary>
      <form action={preConsultAction} className="space-y-3 pb-4">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="appointment_id" value={appointmentId} />
        {PRE_CONSULT_FIELDS.map((field) => (
          <div key={field.key}>
            <label htmlFor={`pre-${field.key}`} className="label">
              {field.label}
            </label>
            <textarea
              id={`pre-${field.key}`}
              name={field.key}
              className="input"
              rows={2}
              maxLength={PRE_CONSULT_MAX}
              placeholder={field.hint}
            />
          </div>
        ))}
        <button type="submit" className="btn btn-primary w-full">
          Enviar pré-consulta
        </button>
        <p className="text-xs text-pine-900/50">
          Responda o que souber; nada é obrigatório. Só a equipe da clínica vê as respostas.
        </p>
      </form>
    </details>
  );
}
