import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { loginAction } from "@/lib/actions";
import { getSession } from "@/lib/auth";
import { REFRAIN } from "@/components/marketing/refrain";
import { Feedback } from "@/components/feedback";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

/** A porta do app: mesmo tema do app do médico (`theme-app`), roxo e rosa. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/dashboard");
  const { erro } = await searchParams;

  return (
    <main className="theme-app grid min-h-screen min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-pine-950 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 15%, rgba(255,182,191,0.35), transparent 45%), radial-gradient(circle at 90% 85%, rgba(108,61,181,0.6), transparent 50%)",
          }}
        />
        <p className="relative flex items-center gap-2.5 text-xl font-extrabold tracking-tight">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-base text-pine-950">R</span>
          Renova
        </p>
        <div className="relative">
          {/* O título da página é o "Entrar" do formulário; isto é o slogan do painel. */}
          <p className="font-display text-5xl font-extrabold leading-[1.08] tracking-tight">
            Cuidar bem
            <br />
            começa com
            <br />
            <span className="text-peach-200">organização.</span>
          </p>
          <p className="mt-6 max-w-md text-white/75">
            Agenda, prontuário, documentos com código de autenticidade e o portal do paciente em um só
            lugar — simples, rápido e no seu controle.
          </p>
        </div>
        <p className="relative text-xs font-bold text-white/50">Gestão de clínicas · pt-BR</p>
      </section>

      {/* No celular: margens enxutas e respiro para o recorte e a barra do iPhone. */}
      <section className="flex items-center justify-center px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] sm:p-8">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-4 inline-flex min-h-11 items-center text-xs font-bold text-pine-600 hover:underline sm:mb-6 sm:min-h-0"
          >
            ← Página da clínica
          </Link>
          <p className="mb-8 flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-pine-950 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pine-950 text-base text-white">R</span>
            Renova
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-pine-950">Entrar</h1>
          <p className="mt-1 text-sm text-pine-900/60">{REFRAIN}</p>

          {erro ? (
            <Feedback tone="erro" className="mt-4">
              E-mail ou senha inválidos.
            </Feedback>
          ) : null}

          <form action={loginAction} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="email">
                E-mail
              </label>
              <input
                className="input"
                type="email"
                id="email"
                name="email"
                required
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                placeholder="voce@clinica.com"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Senha
              </label>
              <input
                className="input"
                type="password"
                id="password"
                name="password"
                required
                autoComplete="current-password"
                enterKeyHint="go"
                placeholder="••••••••"
              />
            </div>
            <button className="btn btn-primary min-h-12 w-full sm:min-h-0" type="submit">
              Entrar
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-pine-900/40">
            <Link href="/privacidade" className="inline-flex min-h-11 items-center px-2 hover:underline sm:min-h-0">
              Política de privacidade
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
