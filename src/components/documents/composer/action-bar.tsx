"use client";

import { useFormStatus } from "react-dom";
import { IconArrowRight } from "./icons";

/** Uma ação do rodapé. `submit`: o botão que emite (o formulário em volta é o da emissão). */
export interface BarAction {
  label: string;
  onClick?(): void;
  disabled?: boolean;
  submit?: boolean;
  /** Só abaixo do lg (ex.: "Ver a folha", que no computador já está ao lado). */
  mobileOnly?: boolean;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={pending}>
      {pending ? (
        "Emitindo…"
      ) : (
        <>
          {label}
          <IconArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

/**
 * Rodapé grudado embaixo de cada tela do compositor: **um botão principal**,
 * sempre no mesmo lugar (à direita), e no máximo um secundário ao lado. Quem
 * decide o que cada tela mostra é o compositor; fechar e guardar o rascunho é
 * o "×" do alto. Sem ação nenhuma (tocar já avança, como na escolha do tipo),
 * o rodapé some.
 *
 * Abaixo do md ele para logo acima da barra de abas do app (4rem + área segura)
 * e sangra até a borda na medida do padding do <main> (px-4 → sm:px-6 → md:px-8).
 */
export function ComposerActionBar({
  countLabel,
  primary,
  secondary,
}: {
  countLabel: string;
  primary: BarAction | null;
  secondary: BarAction | null;
}) {
  if (!primary && !secondary) return null;
  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 -mb-8 flex items-center justify-between gap-3 border-t border-[var(--color-line)] bg-paper/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:bottom-0 md:-mx-8 md:-mb-6 md:px-8">
      <p className="hidden text-xs text-pine-900/60 sm:block">
        <span className="font-bold text-pine-950">{countLabel}</span>
      </p>
      <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
        {secondary ? (
          <button
            type="button"
            onClick={secondary.onClick}
            disabled={secondary.disabled}
            className={`btn btn-outline disabled:opacity-50 ${secondary.mobileOnly ? "lg:hidden" : ""}`}
          >
            {secondary.label}
          </button>
        ) : null}
        {primary ? (
          primary.submit ? (
            <SubmitButton label={primary.label} />
          ) : (
            <button type="button" onClick={primary.onClick} disabled={primary.disabled} className="btn btn-primary disabled:opacity-50">
              {primary.label}
              <IconArrowRight className="h-4 w-4" />
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
