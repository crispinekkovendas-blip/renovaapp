import { requireSession } from "@/lib/auth";
import { changeOwnPasswordAction } from "@/lib/actions-account";
import { PageHeader, SectionTitle } from "@/components/ui";
import { Flash } from "@/components/financeiro/flash";
import { ROLE_LABEL } from "../configuracoes/roles";

const ERROS: Readonly<Record<string, string>> = {
  atual: "Senha atual incorreta.",
  curta: "A nova senha precisa ter pelo menos 6 caracteres.",
  confirmacao: "A confirmação não bate com a nova senha.",
  igual: "A nova senha é igual à atual. Escolha outra.",
};

export default async function ContaPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const [session, params] = await Promise.all([requireSession(), searchParams]);
  const erro = params.erro && Object.hasOwn(ERROS, params.erro) ? ERROS[params.erro] : undefined;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Minha conta" subtitle={`${session.name} · ${ROLE_LABEL[session.role]}`} />

      {params.ok === "senha" ? <Flash tone="ok">Senha alterada. Ela já vale para o próximo login.</Flash> : null}
      {erro ? <Flash tone="erro">{erro}</Flash> : null}

      <SectionTitle>Alterar senha</SectionTitle>
      <div className="card p-4 sm:p-5">
        <form action={changeOwnPasswordAction} className="space-y-3">
          <div>
            <label className="label" htmlFor="current_password">
              Senha atual *
            </label>
            <input
              className="input"
              type="password"
              id="current_password"
              name="current_password"
              required
              autoComplete="current-password"
              enterKeyHint="next"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Nova senha *
            </label>
            <input
              className="input"
              type="password"
              id="password"
              name="password"
              required
              minLength={6}
              autoComplete="new-password"
              enterKeyHint="next"
              aria-describedby="password-hint"
            />
            <p id="password-hint" className="mt-1 text-xs text-pine-900/50">
              Mínimo de 6 caracteres.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="password_confirm">
              Confirmar nova senha *
            </label>
            <input
              className="input"
              type="password"
              id="password_confirm"
              name="password_confirm"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <button type="submit" className="btn btn-primary w-full justify-center">
            Alterar senha
          </button>
        </form>
      </div>

      <p className="mt-4 text-xs text-pine-900/50">
        Esqueceu a senha? Um administrador pode definir uma nova em Configurações → Usuários. O projeto
        não envia e-mail, então não há link de recuperação por conta própria.
      </p>
    </div>
  );
}
