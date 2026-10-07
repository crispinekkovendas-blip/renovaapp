"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { APP_TZ, HUB_TOKEN_KEY, readTokenExpiry } from "@/lib/push";

/**
 * Tela inicial do app instalado (`/p/app`): reabre o último link do portal
 * guardado neste aparelho. Sem link guardado — ou com o link vencido — explica
 * o que fazer em vez de mostrar um erro.
 */

type State = "checking" | "none" | "expired";

export function AppStart() {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");

  useEffect(() => {
    let token: string | null = null;
    try {
      token = localStorage.getItem(HUB_TOKEN_KEY);
    } catch {
      token = null;
    }
    const parsed = token ? readTokenExpiry(token) : null;
    if (!parsed) {
      setState("none");
      return;
    }
    const today = new Date().toLocaleDateString("en-CA", { timeZone: APP_TZ });
    if (parsed.expiresAt < today) {
      setState("expired");
      return;
    }
    router.replace(`/p/${token}`);
  }, [router]);

  return (
    <main className="min-h-screen">
      {/* Aberto pelo ícone da tela de início: o cabeçalho escuro encosta no topo do aparelho. */}
      <header className="section-ink px-4 pb-7 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-8">
        <div className="mx-auto max-w-md">
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">Meu portal</p>
          <p className="mt-3 font-display text-3xl font-semibold italic">Renova</p>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:py-8">
        <div className="card p-5 sm:p-6" role="status" aria-live="polite">
          {state === "checking" ? (
            <>
              <p className="font-display text-xl font-semibold tracking-tight text-pine-950">Abrindo seu portal…</p>
              <p className="mt-2 text-sm text-pine-900/60">Um instante.</p>
            </>
          ) : state === "expired" ? (
            <>
              <p className="font-display text-xl font-semibold tracking-tight text-pine-950">Seu link venceu.</p>
              <p className="mt-2 text-sm text-pine-900/60">
                O link do portal vale por 30 dias. Peça um novo à clínica pelo WhatsApp — ao abrir, ele fica
                guardado aqui de novo.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-xl font-semibold tracking-tight text-pine-950">
                Abra o link que a clínica te mandou no WhatsApp.
              </p>
              <p className="mt-2 text-sm text-pine-900/60">
                É ele que abre o seu portal — próxima consulta, receitas e lembretes. Depois de abrir uma vez,
                este ícone passa a levar direto para lá.
              </p>
            </>
          )}
          <noscript>
            <p className="mt-3 text-sm text-pine-900/60">
              Abra o link que a clínica te mandou no WhatsApp para entrar no seu portal.
            </p>
          </noscript>
        </div>

        <p className="mt-6 text-center text-xs text-pine-900/50">
          <Link href="/" className="inline-flex min-h-11 items-center underline underline-offset-2 sm:min-h-0">
            Conhecer a clínica
          </Link>
        </p>
      </div>
    </main>
  );
}
