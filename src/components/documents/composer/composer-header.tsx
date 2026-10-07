import type { DraftStatus } from "./use-draft";
import { CODE_OF, avatarInitials } from "@/lib/composer-editor";
import type { ComposerStep } from "@/lib/composer-editor";
import type { DocumentKind } from "@/lib/documents";

const STEP_PILL = "rounded-full bg-peach-100 px-3 py-1 text-pine-950";
const BADGE = "ml-auto rounded-2xl border border-[#e2dcec] bg-white px-3 py-1.5 sm:ml-0 sm:px-4 sm:py-2";

/**
 * Cabeçalho: avatar, "Paciente · atendimento de…", nome; à direita o link da
 * ficha e o código do documento (na revisão, quantos documentos saem).
 */
export function ComposerHeader({
  patientId,
  displayName,
  encounterDate,
  step,
  countLabel,
  code,
  onClose,
  closing,
  draftStatus,
}: {
  patientId: number;
  displayName: string;
  encounterDate: string | null;
  step: ComposerStep;
  countLabel: string;
  /** O código do documento no editor; null na pílula "Receita" ou antes da hidratação. */
  code: { kind: DocumentKind; value: string } | null;
  /** Fecha o compositor guardando o rascunho. */
  onClose(): void;
  closing: boolean;
  draftStatus: DraftStatus;
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-4">
      <div
        className="flex h-11 w-11 shrink-0 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-pine-100 text-base font-extrabold text-pine-800"
        aria-hidden
      >
        {avatarInitials(displayName)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-pine-900/55">
          Paciente{encounterDate ? ` · atendimento de ${encounterDate}` : ""}
        </p>
        <h1 className="truncate font-display text-xl font-extrabold tracking-tight text-pine-950">{displayName}</h1>
      </div>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
        <DraftBadge status={draftStatus} />
        {step === "review" ? (
          <div className={BADGE}>
            <p className="text-[11px] font-bold text-pine-900/55">nesta emissão</p>
            <p className="text-sm font-extrabold text-pine-700">{countLabel}</p>
          </div>
        ) : code ? (
          <div className={BADGE}>
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
          className="order-first flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-50 text-pine-900/70 transition-colors hover:bg-pine-100 hover:text-pine-950 disabled:opacity-60 sm:order-last pointer-coarse:h-11 pointer-coarse:w-11"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="h-5 w-5">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
    </header>
  );
}

/** "Rascunho salvo às 14:32": o médico vê que fechar não perde nada. */
function DraftBadge({ status }: { status: DraftStatus }) {
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

export function StepIndicator({ step }: { step: ComposerStep }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-pine-900/50" aria-label="Etapas">
      <li className={step === "compose" ? STEP_PILL : "px-1"} aria-current={step === "compose" ? "step" : undefined}>
        1 · Montar
      </li>
      <li aria-hidden>›</li>
      <li className={step === "review" ? STEP_PILL : "px-1"} aria-current={step === "review" ? "step" : undefined}>
        2 · Revisar e emitir
      </li>
    </ol>
  );
}
