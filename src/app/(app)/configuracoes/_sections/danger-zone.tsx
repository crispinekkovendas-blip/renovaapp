import { wipeClinicalDataAction } from "@/lib/actions-admin";
import { SectionTitle } from "@/components/ui";

/** Limpeza dos dados de demonstração: irreversível, só com APAGAR digitado. */
export function DangerZoneSection() {
  return (
    <section className="mt-10">
      <SectionTitle>Zona de risco</SectionTitle>
      <details className="card overflow-hidden border-rose-200">
        <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 py-3.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-50 sm:px-5">
          Limpar dados de demonstração
        </summary>
        <div className="border-t border-rose-200 p-4 sm:p-5">
          <p className="text-sm text-pine-900/70">
            Apaga <strong>todos</strong> os pacientes, agendamentos, prontuários, cobranças e a lista de
            espera — o caminho para entregar o sistema a uma clínica real sem os dados de demonstração.
          </p>
          <p className="mt-2 text-sm text-pine-900/70">
            Preserva usuários, profissionais, horários de atendimento, chaves de API e os dados da
            clínica.
          </p>
          <p className="mt-2 text-sm font-semibold text-rose-700">
            Isto é irreversível e não distingue dado de demonstração de dado real — se já houver
            paciente de verdade cadastrado, ele também vai embora.
          </p>
          <form action={wipeClinicalDataAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="sm:min-w-48">
              <label className="label" htmlFor="confirmacao">
                Digite APAGAR para confirmar
              </label>
              <input
                className="input"
                id="confirmacao"
                name="confirmacao"
                required
                autoComplete="off"
                placeholder="APAGAR"
              />
            </div>
            <button
              type="submit"
              className="btn cursor-pointer justify-center bg-rose-600 text-white hover:bg-rose-700"
            >
              Apagar dados clínicos
            </button>
          </form>
        </div>
      </details>
    </section>
  );
}
