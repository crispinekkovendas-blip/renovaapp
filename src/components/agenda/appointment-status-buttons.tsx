"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { setAppointmentStatusAction } from "@/lib/actions";
import { revertAppointmentStatusAction } from "@/lib/actions-agenda";
import { StatusBadge } from "@/components/ui";
import { Alert } from "@/components/alert";
import type { AppointmentStatus } from "@/lib/db";

const QUICK_ACTIONS: Partial<Record<AppointmentStatus, { status: AppointmentStatus; label: string }[]>> = {
  agendado: [
    { status: "confirmado", label: "Confirmar" },
    { status: "faltou", label: "Faltou" },
    { status: "cancelado", label: "Cancelar" },
  ],
  confirmado: [
    { status: "em_atendimento", label: "Iniciar" },
    { status: "faltou", label: "Faltou" },
    { status: "cancelado", label: "Cancelar" },
  ],
  em_atendimento: [{ status: "concluido", label: "Concluir" }],
};

/** Espelha PREVIOUS_STATUS no servidor — só para o feedback otimista. */
// No desktop os botões são miúdos (cabem na célula da grade); no toque viram
// pílulas de 44px de altura, o alvo mínimo para o dedo.
const SMALL_BTN =
  "inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11 pointer-coarse:rounded-full pointer-coarse:px-3.5 pointer-coarse:text-xs";

const PREVIOUS_STATUS: Partial<Record<AppointmentStatus, AppointmentStatus>> = {
  confirmado: "agendado",
  em_atendimento: "confirmado",
  concluido: "em_atendimento",
  faltou: "agendado",
  cancelado: "agendado",
};

export function AppointmentStatusButtons({
  appointmentId,
  patientId,
  status,
  backUrl,
}: {
  appointmentId: number;
  patientId: number;
  status: AppointmentStatus;
  backUrl: string;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(
    status,
    (_current: AppointmentStatus, next: AppointmentStatus) => next
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function apply(next: AppointmentStatus) {
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(next);
      const formData = new FormData();
      formData.set("id", String(appointmentId));
      formData.set("status", next);
      formData.set("back", backUrl);
      try {
        await setAppointmentStatusAction(formData);
      } catch (err) {
        unstable_rethrow(err);
        setError("Não foi possível atualizar. Tente novamente.");
      }
    });
  }

  function revert() {
    const previous = PREVIOUS_STATUS[optimisticStatus];
    if (!previous) return;
    setError(null);
    startTransition(async () => {
      setOptimisticStatus(previous);
      const formData = new FormData();
      formData.set("id", String(appointmentId));
      try {
        const message = await revertAppointmentStatusAction(formData);
        // O servidor pode recusar (ex.: cobrança já paga). O estado otimista
        // volta sozinho quando a transição termina sem o status ter mudado.
        if (message) setError(message);
      } catch (err) {
        unstable_rethrow(err);
        setError("Não foi possível voltar. Tente novamente.");
      }
    });
  }

  const actions = QUICK_ACTIONS[optimisticStatus];
  const previousStatus = PREVIOUS_STATUS[optimisticStatus];

  return (
    <>
      <StatusBadge status={optimisticStatus} />
      {error ? <Alert>{error}</Alert> : null}
      {actions ? (
        <div className="mt-1.5 flex flex-wrap gap-1 pointer-coarse:gap-1.5">
          {optimisticStatus === "em_atendimento" ? (
            <Link
              href={`/pacientes/${patientId}?atender=1#novo-atendimento`}
              className={`${SMALL_BTN} bg-clay-100 text-clay-800 hover:bg-clay-200`}
            >
              Abrir prontuário
            </Link>
          ) : null}
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={isPending}
              onClick={() => apply(action.status)}
              className={`${SMALL_BTN} cursor-pointer disabled:opacity-50 ${
                action.status === "concluido" || action.status === "confirmado" || action.status === "em_atendimento"
                  ? "bg-pine-100 text-pine-800 hover:bg-pine-200"
                  : "bg-stone-100 text-stone-500 hover:bg-rose-100 hover:text-rose-700"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
      {previousStatus ? (
        <div className={`flex flex-wrap gap-1 ${actions ? "mt-1" : "mt-1.5"}`}>
          <button
            type="button"
            disabled={isPending}
            onClick={revert}
            title="Voltar um passo no fluxo (desfaz um clique errado)"
            className={`${SMALL_BTN} cursor-pointer text-pine-900/50 underline decoration-dotted hover:text-pine-800 disabled:opacity-50`}
          >
            ← Voltar
          </button>
        </div>
      ) : null}
    </>
  );
}
