import { updatePortalSettingsAction } from "@/lib/actions";
import { SectionTitle } from "@/components/ui";

/** Portal do paciente: liga ou desliga o código de acesso (4 últimos dígitos do celular). */
export function PortalSettingsSection({ pinRequired }: { pinRequired: boolean }) {
  return (
    <section className="card mb-6 p-4 sm:mb-8 sm:p-5">
      <SectionTitle>Portal do paciente</SectionTitle>
      <p className="-mt-2 mb-4 text-xs text-pine-900/55">
        O link pessoal que o paciente recebe pelo WhatsApp (próxima consulta, receitas, documentos, recibos).
      </p>
      <form action={updatePortalSettingsAction} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
        <label className="flex flex-1 items-start gap-3 text-sm" htmlFor="portal_pin">
          <input
            type="checkbox"
            id="portal_pin"
            name="portal_pin"
            value="1"
            defaultChecked={pinRequired}
            className="mt-1 h-4 w-4 accent-pine-700"
          />
          <span>
            <span className="block font-bold text-pine-950">Exigir código de acesso no portal do paciente</span>
            <span className="block text-xs text-pine-900/55">
              Antes de ver o portal, o paciente digita os 4 últimos dígitos do celular cadastrado. Vale por 30 dias
              no aparelho. Quem não tem celular no cadastro entra direto; o link de confirmação de consulta
              continua sem código.
            </span>
          </span>
        </label>
        <button type="submit" className="btn btn-primary justify-center">
          Salvar
        </button>
      </form>
    </section>
  );
}
