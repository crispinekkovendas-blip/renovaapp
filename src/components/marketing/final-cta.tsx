import Link from "next/link";
import { REFRAIN } from "./refrain";

/**
 * O fecho da página: a chamada final com o botão. Painel pêssego sobre
 * fundo branco — o rodapé logo abaixo já é pinho.
 */
export function FinalCta() {
  return (
    <section id="agende" aria-labelledby="agende-titulo" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="rounded-[2.5rem] bg-peach-100 px-6 py-12 text-center sm:px-12 sm:py-16">
          <h2
            id="agende-titulo"
            className="mx-auto max-w-2xl font-display text-3xl font-semibold leading-[1.08] tracking-tight text-pine-950 sm:text-5xl"
          >
            Pronto para marcar sua consulta?
          </h2>
          <p className="mt-4 font-display text-2xl italic text-pine-800">{REFRAIN}</p>
          <div className="mt-8 flex justify-center">
            <Link href="/agendar" className="btn-hero">
              Agendar consulta
              <span className="chev" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-4 text-sm text-pine-900/60">Sem cadastro e sem senha. Leva poucos toques.</p>
        </div>
      </div>
    </section>
  );
}
