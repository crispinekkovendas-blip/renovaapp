import type { ReactNode } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

/**
 * Moldura das páginas públicas de validação (/validar e /validar/[code]):
 * a mesma voz da landing, sem menu e sem sessão. Quem chega aqui leu um QR
 * numa folha ou digitou o código do rodapé.
 */
export function ValidateShell({ clinicName, children }: { clinicName: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader clinicName={clinicName} width="max-w-xl" cta />
      <main className="min-h-[70vh] bg-paper">
        <div className="bg-peach-100 px-4 pb-8 pt-8 sm:px-6 sm:pb-10 sm:pt-10">
          <div className="mx-auto max-w-xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-pine-900/55">Validação de documento</p>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-[1.08] tracking-tight text-pine-950 sm:text-4xl">
              Recebeu um documento daqui? Confira se ele é verdadeiro.
            </h1>
          </div>
        </div>

        <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">{children}</div>
      </main>
      <SiteFooter clinicName={clinicName} compact />
    </>
  );
}

/** Formulário GET: o código vai em `?codigo=` e a página redireciona para /validar/<código>. */
export function ValidateForm({ defaultValue = "", error }: { defaultValue?: string; error?: string }) {
  return (
    <form action="/validar" method="get" className="card p-5 sm:p-6">
      <label className="label" htmlFor="codigo">
        Código do documento
      </label>
      <p className="mb-3 text-sm text-pine-900/60">
        Está no rodapé da folha, ao lado do QR — algo como <span className="font-mono font-bold">RNV-AB2C-D3EF</span>.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input font-mono uppercase tracking-wider"
          id="codigo"
          name="codigo"
          defaultValue={defaultValue}
          placeholder="RNV-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          required
        />
        <button type="submit" className="btn btn-primary shrink-0">
          Conferir
        </button>
      </div>
      {error === "formato" ? (
        <p className="mt-2 text-sm font-semibold text-rose-700" role="alert">
          Esse código não tem o formato esperado. Confira as letras e os números e tente de novo.
        </p>
      ) : null}
    </form>
  );
}
