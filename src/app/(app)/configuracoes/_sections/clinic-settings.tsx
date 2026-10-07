import { updateClinicSettingsAction } from "@/lib/actions";
import { SectionTitle } from "@/components/ui";

/** Dados da clínica: portal de agendamento, documentos impressos e cabeçalho da prescrição. */
export function ClinicSettingsSection({ settings }: { settings: Record<string, string> }) {
  return (
    <section className="card mb-6 p-4 sm:mb-8 sm:p-5">
      <SectionTitle>Dados da clínica</SectionTitle>
      <p className="-mt-2 mb-4 text-xs text-pine-900/55">
        Usados no portal de agendamento online, nos documentos impressos (receitas e atestados) e no
        cabeçalho da prescrição digital.
      </p>
      <form action={updateClinicSettingsAction} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div>
          <label className="label" htmlFor="clinic_name">
            Nome da clínica
          </label>
          <input className="input" id="clinic_name" name="clinic_name" defaultValue={settings.clinic_name ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="clinic_phone">
            Telefone
          </label>
          <input
            className="input"
            type="tel"
            id="clinic_phone"
            name="clinic_phone"
            autoComplete="tel"
            defaultValue={settings.clinic_phone ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="clinic_address">
            Endereço
          </label>
          <input
            className="input"
            id="clinic_address"
            name="clinic_address"
            autoComplete="street-address"
            defaultValue={settings.clinic_address ?? ""}
          />
        </div>
        <div>
          <label className="label" htmlFor="clinic_document">
            CNPJ
          </label>
          <input className="input" id="clinic_document" name="clinic_document" defaultValue={settings.clinic_document ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="clinic_insurances">
            Convênios aceitos
          </label>
          <input
            className="input"
            id="clinic_insurances"
            name="clinic_insurances"
            defaultValue={settings.clinic_insurances ?? ""}
            placeholder="Unimed, Bradesco Saúde, Amil"
            aria-describedby="clinic_insurances-hint"
          />
          <p id="clinic_insurances-hint" className="mt-1 text-[11px] text-pine-900/50">
            Separe por vírgula; deixe vazio se atende só particular. Aparece na página pública da clínica.
          </p>
        </div>
        {/* No celular o Salvar desce para baixo do CNES e ocupa a largura toda. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-2">
          <div className="flex-1">
            <label className="label" htmlFor="clinic_cnes">
              CNES
            </label>
            <input
              className="input"
              id="clinic_cnes"
              name="clinic_cnes"
              inputMode="numeric"
              defaultValue={settings.clinic_cnes ?? ""}
              placeholder="0000000"
            />
          </div>
          <button type="submit" className="btn btn-primary justify-center">
            Salvar
          </button>
        </div>
      </form>
    </section>
  );
}
