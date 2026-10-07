"use client";

import { useFormStatus } from "react-dom";
import type { ComposerStep } from "@/lib/composer-editor";
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
 * Rodapé grudado embaixo da coluna principal: a contagem e as ações do passo atual.
 * Abaixo do md ele para logo acima da barra de abas do app (4rem + área segura) e
 * sangra até a borda na medida do padding do <main> (px-4 → sm:px-6 → md:px-8).
 * É o papel da `.mobile-action-bar`, mas aquela vira bloco estático no sm e este
 * continua grudado em todo tamanho, como sempre foi no desktop.
 */
export function ComposerActionBar({
  step,
  patientId,
  countLabel,
  canContinue,
  onStepChange,
  onClose,
  closing,
  inSheet,
}: {
  step: ComposerStep;
  patientId: number;
  countLabel: string;
  canContinue: boolean;
  onStepChange(step: ComposerStep): void;
  /** Guarda o rascunho e volta à ficha. */
  onClose(): void;
  closing: boolean;
  /** Dentro do pop-up: gruda no fundo da folha (não há barra de abas embaixo). */
  inSheet: boolean;
}) {
  const place = inSheet
    ? "sticky bottom-0 z-20 -mx-4 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    : "sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 px-4 -mb-8 sm:-mx-6 sm:px-6 md:bottom-0 md:-mx-8 md:-mb-6 md:px-8";
  return (
    <div
      className={`${place} flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-[#e8e1f0] bg-paper/90 pt-3 backdrop-blur ${inSheet ? "" : "pb-3"}`}
    >
      {/* No celular: na montagem, contagem + Continuar numa linha só (o "← Ficha" do
          cabeçalho faz o Cancelar); na revisão, Voltar e Emitir dividem a largura. */}
      <p className={`text-xs text-pine-900/60 ${step === "review" ? "hidden sm:block" : ""}`}>
        <span className="font-bold text-pine-950">{countLabel}</span>
        <span className="hidden sm:inline"> · mesma data, mesmo profissional, um link só para o paciente</span>
      </p>
      <div className={`flex items-center gap-2 ${step === "review" ? "w-full sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none" : ""}`}>
        {step === "compose" ? (
          <>
            <button
              type="button"
              onClick={onClose}
              disabled={closing}
              className="btn btn-outline hidden disabled:opacity-60 sm:inline-flex"
              title="Guarda o que está montado como rascunho e volta à ficha"
            >
              {closing ? "Salvando…" : "Salvar rascunho"}
            </button>
            <button
              type="button"
              onClick={() => onStepChange("review")}
              disabled={!canContinue}
              className="btn btn-primary disabled:opacity-50"
            >
              Continuar
              <IconArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onStepChange("compose")} className="btn btn-outline">
              Voltar
            </button>
            <SubmitButton />
          </>
        )}
      </div>
    </div>
  );
}
