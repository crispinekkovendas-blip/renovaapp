"use client";

import { useFormStatus } from "react-dom";
import type { ScreenId } from "@/lib/composer-screens";
import { IconArrowRight } from "./icons";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={pending}>
      {pending ? (
        "Emitindo…"
      ) : (
        <>
          Emitir e enviar
          <IconArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

/**
 * Rodapé grudado embaixo de cada tela do compositor, com as ações dela:
 *
 * - Tipo e Montar: "Salvar rascunho" e, se já há algo, "Nesta emissão (n)";
 *   em Montar, incluir o documento é o botão do próprio editor.
 * - Nesta emissão: "Outro documento" e "Continuar".
 * - Revisar: "Voltar" e "Emitir e enviar".
 *
 * Abaixo do md ele para logo acima da barra de abas do app (4rem + área segura)
 * e sangra até a borda na medida do padding do <main> (px-4 → sm:px-6 → md:px-8).
 */
export function ComposerActionBar({
  screen,
  countLabel,
  itemCount,
  onGo,
  onBack,
  onClose,
  closing,
}: {
  screen: ScreenId;
  countLabel: string;
  itemCount: number;
  onGo(screen: ScreenId): void;
  onBack(): void;
  /** Guarda o rascunho e fecha. */
  onClose(): void;
  closing: boolean;
}) {
  const split = "w-full sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none";
  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 -mb-8 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[var(--color-line)] bg-paper/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:bottom-0 md:-mx-8 md:-mb-6 md:px-8">
      <p className="hidden text-xs text-pine-900/60 sm:block">
        <span className="font-bold text-pine-950">{countLabel}</span>
        <span> · mesma data, mesmo profissional, um link só para o paciente</span>
      </p>
      <div className={`flex items-center gap-2 ${split}`}>
        {screen === "tipo" || screen === "montar" ? (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={closing}
              className="btn btn-outline disabled:opacity-60"
              title="Guarda o que está montado como rascunho e fecha"
            >
              {closing ? "Salvando…" : "Salvar rascunho"}
            </button>
            {itemCount > 0 ? (
              <button type="button" onClick={() => onGo("emissao")} className="btn btn-primary">
                Nesta emissão ({itemCount})
                <IconArrowRight className="h-4 w-4" />
              </button>
            ) : null}
          </>
        ) : screen === "emissao" ? (
          <>
            <button type="button" onClick={() => onGo("tipo")} className="btn btn-outline">
              + Outro documento
            </button>
            <button type="button" onClick={() => onGo("revisar")} disabled={itemCount === 0} className="btn btn-primary disabled:opacity-50">
              Continuar
              <IconArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onBack} className="btn btn-outline">
              Voltar
            </button>
            <SubmitButton />
          </>
        )}
      </div>
    </div>
  );
}
