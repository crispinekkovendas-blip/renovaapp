"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { SCREEN_PARENT, SCREEN_STEP, STEPS, STEP_LABEL, resolveScreen, screenHref, screenIndex } from "@/lib/composer-screens";
import type { ScreenId } from "@/lib/composer-screens";
import { TAB_BLURB } from "@/lib/composer-tabs";
import type { ComposerTab } from "@/lib/composer-editor";
import { CODE_OF } from "@/lib/composer-editor";
import type { DocumentKind } from "@/lib/documents";
import { DraftBadge } from "./composer-header";
import type { DraftStatus } from "./use-draft";
import { IconArrowRight, TabIcon } from "./icons";
import type { TabOption } from "./type-picker";

/**
 * As telas do compositor (ver src/lib/composer-screens.ts): a tela atual na
 * URL, o "←" que volta pelo histórico, a barra do alto e a escolha do tipo.
 */

/**
 * A tela atual e como andar entre elas. Avançar empilha no histórico do
 * navegador (`?tela=`), então o voltar do celular funciona; o "←" volta pelo
 * histórico quando a tela anterior é nossa e, sem ela (link direto, F5), sobe
 * para a tela-mãe. Na primeira tela, `onExit` (fechar guardando o rascunho).
 */
export function useScreens(initial: ScreenId, itemCount: number, onExit: () => void) {
  const params = useSearchParams();
  const [fallback] = useState(initial);
  const screen = resolveScreen(params.get("tela"), fallback, itemCount);
  // As telas que este compositor empilhou, para saber se o "←" pode usar o histórico.
  const trail = useRef<ScreenId[]>([screen]);
  const current = useRef(screen);
  current.current = screen;

  useEffect(() => {
    const onPop = () => {
      const now = resolveScreen(new URL(window.location.href).searchParams.get("tela"), fallback, Infinity);
      const t = trail.current;
      if (t.length > 1 && t[t.length - 2] === now) t.pop();
      else t.push(now);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [fallback]);

  /**
   * `replace`: troca a tela atual em vez de empilhar — da busca para o
   * medicamento escolhido, para o "←" do medicamento voltar à receita, não à busca.
   */
  const go = useCallback((next: ScreenId, options?: { replace?: boolean }) => {
    if (next === current.current) return;
    const href = screenHref(window.location.href, next);
    if (options?.replace) {
      window.history.replaceState(null, "", href);
      trail.current[trail.current.length - 1] = next;
    } else {
      window.history.pushState(null, "", href);
      trail.current.push(next);
    }
    current.current = next;
    window.scrollTo({ top: 0 });
  }, []);

  const back = useCallback(() => {
    if (trail.current.length > 1) {
      window.history.back();
      return;
    }
    const parent = SCREEN_PARENT[current.current];
    if (!parent) {
      onExit();
      return;
    }
    window.history.replaceState(null, "", screenHref(window.location.href, parent));
    trail.current = [parent];
    window.scrollTo({ top: 0 });
  }, [onExit]);

  return { screen, go, back };
}

const BACK_BTN =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-900/75 transition-colors hover:bg-pine-100 hover:text-pine-950 disabled:opacity-60 pointer-coarse:h-11 pointer-coarse:w-11";

/**
 * A barra do alto de cada tela, grudada: "←", o paciente e o título da tela,
 * o rascunho salvo, o código do documento e o "×" que fecha guardando tudo.
 * Embaixo, as quatro etapas.
 */
export function ScreenBar({
  screen,
  title,
  displayName,
  encounterDate,
  draftStatus,
  code,
  onBack,
  onClose,
  closing,
}: {
  screen: ScreenId;
  /** O título da tela; em "Montar", o nome do tipo ("Receituário"). */
  title: string;
  displayName: string;
  encounterDate: string | null;
  draftStatus: DraftStatus;
  code: { kind: DocumentKind; value: string } | null;
  onBack(): void;
  onClose(): void;
  closing: boolean;
}) {
  return (
    <header className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 -mx-4 -mt-4 border-b border-[var(--color-line)] bg-paper/95 px-4 pt-3 pb-2 backdrop-blur sm:-mx-6 sm:px-6 md:top-0 md:-mx-8 md:-mt-6 md:px-8 md:pt-4">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} disabled={closing} aria-label="Voltar" title="Voltar" className={BACK_BTN}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-pine-900/55">
            {displayName}
            {encounterDate ? ` · atendimento de ${encounterDate}` : ""}
          </p>
          <h1 className="truncate font-display text-xl font-extrabold tracking-tight text-pine-950 sm:text-2xl">{title}</h1>
        </div>
        {code ? (
          <div className="hidden rounded-2xl border border-[var(--color-line)] bg-white px-3 py-1.5 text-right sm:block">
            <p className="text-[11px] font-bold text-pine-900/55">código {CODE_OF[code.kind]}</p>
            <p className="font-mono text-sm font-bold text-pine-700">{code.value}</p>
          </div>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          disabled={closing}
          aria-label="Fechar e guardar como rascunho"
          title="Fechar (o que está montado fica como rascunho)"
          className={BACK_BTN}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="h-5 w-5">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <ScreenProgress screen={screen} />
        <div className="ml-auto shrink-0">
          <DraftBadge status={draftStatus} />
        </div>
      </div>
    </header>
  );
}

/** As quatro etapas como traços; o nome de cada uma aparece a partir do sm. */
function ScreenProgress({ screen }: { screen: ScreenId }) {
  const at = screenIndex(screen);
  const step = SCREEN_STEP[screen];
  return (
    <ol className="flex min-w-0 flex-1 items-center gap-1.5" aria-label={`Etapa ${at} de ${STEPS.length}`}>
      {STEPS.map((s, i) => {
        const done = i + 1 <= at;
        return (
          <li key={s} className="min-w-0 flex-1" aria-current={s === step ? "step" : undefined}>
            <span className={`block h-1 rounded-full ${done ? "bg-pine-700" : "bg-pine-900/10"}`} aria-hidden />
            <span className={`mt-1 hidden truncate text-[11px] font-bold sm:block ${s === step ? "text-pine-950" : "text-pine-900/45"}`}>
              {i + 1} · {STEP_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Tela 1: o que vai emitir. Um cartão grande por tipo (ícone, nome, para que
 * serve); o que está em andamento leva a marca "em andamento". Tocar abre a
 * tela de montar daquele tipo.
 */
export function TypeScreen({
  tabs,
  tab,
  onChoose,
  itemCount,
  countLabel,
  onOpenStack,
  rail,
}: {
  tabs: ReadonlyArray<TabOption>;
  tab: ComposerTab;
  onChoose(tab: ComposerTab): void;
  itemCount: number;
  countLabel: string;
  onOpenStack(): void;
  /** Perfil, Histórico, Modelos e Ajuda (composer-rail.tsx). */
  rail: ReactNode;
}) {
  return (
    <div className="space-y-4">
      {itemCount > 0 ? (
        <button
          type="button"
          onClick={onOpenStack}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-pine-200 bg-pine-50 px-4 py-3 text-left transition-colors hover:bg-pine-100"
        >
          <span>
            <span className="block text-sm font-bold text-pine-950">Nesta emissão: {countLabel}</span>
            <span className="block text-xs text-pine-900/60">Ver, reordenar ou seguir para a revisão</span>
          </span>
          <IconArrowRight className="h-5 w-5 shrink-0 text-pine-700" />
        </button>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tabs.map((option) => {
          const active = option.tab === tab;
          return (
            <li key={option.tab}>
              <button
                type="button"
                onClick={() => onChoose(option.tab)}
                className={`card flex h-full w-full items-center gap-4 p-4 text-left transition-colors hover:border-pine-400 hover:bg-pine-50/60 sm:p-5 ${
                  active ? "ring-2 ring-pine-500/40" : ""
                }`}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pine-100 text-pine-800">
                  <TabIcon tab={option.tab} className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 font-bold text-pine-950">
                    {option.label}
                    {active ? <span className="chip bg-pine-100 text-pine-800">em andamento</span> : null}
                  </span>
                  <span className="mt-0.5 block text-xs text-pine-900/60">{TAB_BLURB[option.tab]}</span>
                </span>
                <span aria-hidden className="text-xl text-pine-900/30">
                  ›
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="pt-2">
        <p className="mb-2 text-xs font-bold text-pine-900/55">Do paciente</p>
        {rail}
      </div>
    </div>
  );
}
