import { SectionTitle } from "@/components/ui";
import { ThemePicker } from "@/components/theme-picker";

/**
 * Tema do app. Não é dado da clínica — vale para o navegador de quem escolhe —,
 * mas é aqui que se procura por ele; a mesma escolha está em Minha conta, para
 * os perfis que não entram em Configurações.
 */
export function AppearanceSection() {
  return (
    <section className="card mb-6 p-4 sm:mb-8 sm:p-5">
      <SectionTitle>Aparência</SectionTitle>
      <p className="-mt-2 mb-4 text-xs text-pine-900/55">
        O tema do sistema neste aparelho. Os outros usuários escolhem o deles em Minha conta.
      </p>
      <ThemePicker className="max-w-md" />
    </section>
  );
}
