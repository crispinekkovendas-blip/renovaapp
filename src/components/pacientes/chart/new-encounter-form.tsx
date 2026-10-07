import { createEncounterAction } from "@/lib/actions";
import { todayISO } from "@/lib/format";
import { RETURN_OPTIONS } from "@/lib/recall";
import { IconStethoscope } from "@/components/icons";

/**
 * "Registrar novo atendimento": um <details> que abre sozinho quando a URL
 * traz ?atender=1 (a pílula "Novo atendimento" do alto da ficha).
 */
export function NewEncounterForm({
  patientId,
  professionals,
  open,
}: {
  patientId: number;
  professionals: { id: number; name: string }[];
  open: boolean;
}) {
  return (
    // overflow-clip e não overflow-hidden: o hidden criaria um contêiner de rolagem
    // e a barra "Salvar atendimento" (sticky no celular) deixaria de grudar.
    <details id="novo-atendimento" className="group card mb-6 scroll-mt-20 overflow-clip" open={open}>
      <summary className="flex cursor-pointer items-center gap-3 border-l-4 border-pine-600 px-4 py-4 transition-colors hover:bg-pine-50 sm:px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pine-100 text-pine-700">
          <IconStethoscope className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-bold text-pine-950">Registrar novo atendimento</span>
          <span className="block text-xs text-pine-900/55">Queixa, anamnese, exame, diagnóstico, conduta e receita</span>
        </span>
        <span aria-hidden className="ml-auto shrink-0 text-xs font-bold text-pine-600 group-open:hidden">
          abrir ▾
        </span>
      </summary>
      <form action={createEncounterAction} className="space-y-3 border-t border-pine-900/10 p-4 sm:p-5">
        <input type="hidden" name="patient_id" value={patientId} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="enc-date">
              Data
            </label>
            <input className="input" type="date" id="enc-date" name="date" defaultValue={todayISO()} required />
          </div>
          <div>
            <label className="label" htmlFor="enc-prof">
              Profissional
            </label>
            <select className="input" id="enc-prof" name="professional_id" required defaultValue="">
              <option value="" disabled>
                Selecione…
              </option>
              {professionals.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="complaint">
            Queixa principal
          </label>
          <input className="input" id="complaint" name="complaint" enterKeyHint="next" />
        </div>
        <div>
          <label className="label" htmlFor="anamnesis">
            Anamnese / história
          </label>
          <textarea className="input" id="anamnesis" name="anamnesis" rows={3} />
        </div>
        <div>
          <label className="label" htmlFor="exam">
            Exame físico
          </label>
          <textarea className="input" id="exam" name="exam" rows={2} />
        </div>
        <div>
          <label className="label" htmlFor="diagnosis">
            Hipótese diagnóstica (CID)
          </label>
          <input className="input" id="diagnosis" name="diagnosis" enterKeyHint="next" />
        </div>
        <div>
          <label className="label" htmlFor="plan">
            Conduta
          </label>
          <textarea className="input" id="plan" name="plan" rows={2} />
        </div>
        <div>
          <label className="label" htmlFor="prescription">
            Receita
          </label>
          <textarea
            className="input font-mono sm:text-xs"
            id="prescription"
            name="prescription"
            rows={3}
            aria-describedby="prescription-hint"
            placeholder={"Medicamento — posologia\nMedicamento — posologia"}
          />
          <p id="prescription-hint" className="mt-1 text-xs text-pine-900/50">
            Preencha a receita para liberar a impressão do receituário deste atendimento.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="return_days">
              Retorno em
            </label>
            <select
              className="input"
              id="return_days"
              name="return_days"
              defaultValue="0"
              aria-describedby="return-days-hint"
            >
              {RETURN_OPTIONS.map((option) => (
                <option key={option.days} value={option.days}>
                  {option.label}
                </option>
              ))}
            </select>
            <p id="return-days-hint" className="mt-1 text-xs text-pine-900/50">
              Entra em Agenda › Retornos, no portal do paciente e no lembrete automático três dias antes.
            </p>
          </div>
        </div>
        <div className="mobile-action-bar">
          <button type="submit" className="btn btn-primary w-full sm:w-auto">
            Salvar atendimento
          </button>
        </div>
      </form>
    </details>
  );
}
