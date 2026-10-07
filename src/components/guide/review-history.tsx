import { CURRENT_REVISION, revisionLabel } from "@/lib/guide-revisions";

/** Botão-texto discreto dos itens do guia (ex.: "Ver orientação ao paciente"). */
export const SEE_MORE_ITEM =
  "inline-flex items-center gap-1 text-[12px] font-bold text-pine-600 hover:underline pointer-coarse:min-h-10";

/** O "Revisões · ver mais" do alto de cada aba. */
export const SEE_MORE_TAB =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-pine-900/12 bg-white px-3 py-1.5 text-[12.5px] font-bold text-pine-800 hover:border-pine-400 pointer-coarse:min-h-10";

/** Cor da revisão: a atual em âmbar, a publicação em verde, as do meio em azul. */
export function revisionTone(rev: number): string {
  if (rev === CURRENT_REVISION) return "bg-amber-50 text-amber-900 ring-amber-300";
  if (rev === 1) return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  return "bg-sky-50 text-sky-900 ring-sky-200";
}

export function RevisionBadge({ rev }: { rev: number }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${revisionTone(rev)}`}>{revisionLabel(rev)}</span>
  );
}
