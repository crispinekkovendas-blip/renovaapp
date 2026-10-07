import type { ReactNode } from "react";
import Link from "next/link";
import { REFRAIN } from "@/components/marketing/refrain";
import { Feedback } from "@/components/feedback";

/**
 * A moldura do portal do paciente: cabeçalho escuro com o nome da clínica e
 * a saudação, o conteúdo numa coluna estreita (ou larga, para uma folha A4)
 * e o rodapé. Usada pela página principal, pelo documento e pelo recibo.
 */
export function HubShell({
  clinic,
  firstName,
  heading,
  subheading,
  wide,
  children,
}: {
  clinic?: string;
  firstName?: string;
  /** Substitui o "Olá, Nome" (ex.: o título do documento aberto). */
  heading?: string;
  subheading?: string;
  /** Coluna larga para uma folha A4 (documento, recibo). */
  wide?: boolean;
  children: ReactNode;
}) {
  const column = wide ? "mx-auto max-w-[230mm]" : "mx-auto max-w-md";
  return (
    <main className="min-h-screen">
      {/* No portal salvo na tela de início (iOS em tela cheia), o cabeçalho escuro vai até
          a borda de cima: o conteúdo desce pelo recorte da câmera. */}
      <header className="section-ink px-4 pb-7 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-8">
        <div className={column}>
          <p className="truncate text-xs uppercase tracking-[0.2em] opacity-70">{clinic ?? "Renova"}</p>
          {heading ? (
            <>
              <h1 className="mt-3 break-words font-display text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h1>
              {subheading ? <p className="mt-2 text-base opacity-80">{subheading}</p> : null}
            </>
          ) : firstName ? (
            <>
              <h1 className="mt-3 break-words font-display text-3xl font-semibold tracking-tight sm:text-4xl">Olá, {firstName}</h1>
              <p className="mt-2 text-base opacity-80">Aqui está tudo o que você precisa da sua consulta.</p>
            </>
          ) : (
            <p className="mt-3 font-display text-3xl font-semibold italic">Renova</p>
          )}
        </div>
      </header>

      <div className={`${column} px-4 py-6 sm:px-6 sm:py-8`}>{children}</div>

      <footer className="section-ink mt-8 px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-10 text-center sm:px-6">
        <div className={column}>
          <p className="font-display text-2xl font-semibold italic">{REFRAIN}</p>
          <p className="mt-6 text-xs opacity-70">
            <Link href="/privacidade" className="inline-flex min-h-11 items-center underline underline-offset-2 sm:min-h-0">
              Privacidade
            </Link>
            <span className="mx-2">·</span>
            Feito com Renova
          </p>
        </div>
      </footer>
    </main>
  );
}

/**
 * Aviso do portal. Tem o "×" e fechar limpa `?ok=`/`?erro=` da URL; não some
 * sozinho — o paciente lê no tempo dele.
 */
export function HubBanner({
  tone,
  title,
  children,
}: {
  tone: "success" | "neutral" | "warning";
  title: string;
  children?: ReactNode;
}) {
  const feedbackTone = ({ success: "ok", neutral: "aviso", warning: "erro" } as const)[tone];
  return (
    <Feedback tone={feedbackTone} autoHide={false} className="mb-4">
      <p>{title}</p>
      {children ? <p className="mt-1 font-normal opacity-80">{children}</p> : null}
    </Feedback>
  );
}

export function InvalidLinkCard() {
  return (
    <div className="card p-6 text-center sm:p-8">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-clay-100 text-clay-800">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-7 w-7"
          aria-hidden
        >
          <path d="M12 8v5M12 16.5v.5" />
        </svg>
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-pine-950">
        Link vencido ou inválido
      </h1>
      <p className="mt-3 text-sm text-pine-900/60">
        Este link venceu ou não é válido. Peça um novo à clínica.
      </p>
      <Link href="/" className="btn btn-outline mt-5 min-h-11 w-full sm:w-auto">
        Ir para a página da clínica
      </Link>
    </div>
  );
}

/** Documento ou recibo que este link não pode abrir (não é seu, foi revogado ou não está liberado). */
export function UnavailableCard({ backHref }: { backHref: string }) {
  return (
    <div className="card p-6 text-center sm:p-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-pine-950">
        Este documento não está disponível
      </h1>
      <p className="mt-3 text-sm text-pine-900/60">
        Ele pode ter sido substituído ou ainda não foi liberado para o portal. Em dúvida, fale com a clínica.
      </p>
      <Link href={backHref} className="btn btn-outline mt-5 w-full sm:w-auto">
        ← Voltar ao portal
      </Link>
    </div>
  );
}
