import type { DraftStatus } from "./use-draft";

/**
 * "Rascunho salvo às 14:32": o médico vê que fechar não perde nada. Fica na
 * barra do alto de cada tela do compositor (screens.tsx).
 */
export function DraftBadge({ status }: { status: DraftStatus }) {
  if (status.kind === "idle") return null;
  const text =
    status.kind === "saving"
      ? "Salvando rascunho…"
      : status.kind === "error"
        ? "Rascunho não salvo"
        : `Rascunho salvo às ${status.at}${status.where === "navegador" ? " (neste navegador)" : ""}`;
  return (
    <p className="text-[11.5px] font-semibold text-pine-900/55" role="status" aria-live="polite">
      {status.kind === "saved" ? (
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" aria-hidden />
      ) : null}
      {text}
    </p>
  );
}
