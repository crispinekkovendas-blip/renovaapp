import type { ReactNode } from "react";
import { Feedback } from "@/components/feedback";
import type { DocumentKind } from "@/lib/documents";

/* Classes e peças visuais repetidas entre as partes do compositor. */

/** A barra colorida de cada item da pilha (e o pontinho do resumo). */
export const KIND_BAR: Record<DocumentKind, string> = {
  atestado: "bg-pine-950",
  encaminhamento: "bg-peach-300",
  laudo: "bg-pine-300",
  orientacoes: "bg-sun-400",
  receituario: "bg-emerald-500",
};

/** 44px no celular (dedo), os 32px de sempre no desktop. */
export const ROUND_BTN =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e2dcec] bg-white transition-colors disabled:opacity-30 lg:h-8 lg:w-8";
/** Fileira que rola de lado abaixo do lg e volta a quebrar linha no desktop. */
export const CHIP_ROW = "scroll-x flex gap-2 lg:flex-wrap lg:overflow-visible";
/** Botão-pílula pequeno dos painéis de exames e dos protocolos de receituário. */
export const QUICK_CHIP =
  "rounded-xl border border-[#e2dcec] px-2.5 py-1 text-[12px] font-bold text-pine-900/75 transition-colors hover:border-pine-400 hover:bg-pine-50 pointer-coarse:min-h-11 pointer-coarse:px-3";

export type BannerTone = "ok" | "erro" | "aviso";


/** Aviso do compositor: o `Feedback` do app (com "×"; sucesso some sozinho). */
export function Banner({ tone, children }: { tone: BannerTone; children: ReactNode }) {
  return <Feedback tone={tone}>{children}</Feedback>;
}

/** O aviso de pilha cheia no rodapé dos editores. */
export function LimitNote({ max }: { max: number }) {
  return (
    // basis-full no celular: o aviso fica numa linha e os botões dividem a de baixo.
    <span className="mr-auto basis-full text-xs text-pine-900/55 sm:basis-auto">Limite de {max} documentos por emissão.</span>
  );
}
