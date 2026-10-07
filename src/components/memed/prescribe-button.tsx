"use client";

import { Feedback } from "@/components/feedback";
import { useState, useTransition } from "react";
import type { ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import {
  startPrescriptionAction,
  recordPrescriptionAction,
  markPrescriptionDeletedAction,
  syncPrescriptionsAction,
} from "@/lib/actions-memed";
import { Alert } from "@/components/alert";
import { extractPrescriptionId } from "@/lib/memed/event-payload";

type Hub = {
  command: { send: (module: string, command: string, payload?: unknown) => Promise<unknown> };
  module: { show: (module: string) => Promise<unknown> };
  event: { add: (event: string, handler: (payload: unknown) => void) => void };
};

declare global {
  interface Window {
    MdHub?: Hub;
    MdSinapsePrescricao?: {
      event: { add: (event: string, handler: (payload: { name?: string }) => void) => void };
    };
  }
}

const MODULE = "plataforma.prescricao";
const SDK = "plataforma.sdk";
const SCRIPT_ID = "memed-sinapse-prescricao";

/**
 * Quem prescreveu por último neste navegador. A Memed guarda o prescritor no
 * localStorage, e numa clínica o mesmo computador atende vários profissionais —
 * sem `logout` na troca, a próxima receita sai assinada pela pessoa errada.
 */
let loadedForProfessional: number | null = null;
/** Os eventos são globais do módulo: assinar duas vezes gravaria a receita duas vezes. */
let eventsBound = false;
/**
 * De quem é a receita que está sendo emitida **agora**.
 *
 * Os handlers são assinados uma vez só, mas o app é uma SPA: o médico atende a
 * Ana, depois abre o João e prescreve. Se o handler fechasse sobre o paciente
 * da primeira vez (era o que acontecia até 2026-09-17), a receita do João
 * entrava no prontuário da Ana e aparecia no portal dela. Por isso o paciente
 * corrente mora aqui, e é atualizado a cada abertura do módulo.
 */
let current: { patientId: number; encounterId: number | null } | null = null;

/**
 * O script é injetado uma vez e só. O gancho documentado é
 * `MdSinapsePrescricao.event.add("core:moduleInit")`, que dispara quando o
 * módulo de prescrição está pronto — `MdHub` só aceita comandos depois disso.
 */
function loadMemed(scriptUrl: string, token: string): Promise<Hub> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + 25_000;

    const ready = () => {
      const hub = window.MdHub;
      if (hub) resolve(hub);
      else reject(new Error("A Memed carregou sem expor o MdHub."));
    };

    const waitForBoot = () => {
      const sinapse = window.MdSinapsePrescricao;
      if (sinapse) {
        sinapse.event.add("core:moduleInit", (moduleData) => {
          if (moduleData?.name === MODULE) ready();
        });
        // Se o módulo já tinha inicializado antes de assinarmos, o evento não
        // repete — então também aceitamos o MdHub já presente.
        if (window.MdHub) ready();
        return;
      }
      if (Date.now() > deadline) {
        reject(new Error("A Memed não carregou. Verifique a conexão e tente de novo."));
        return;
      }
      setTimeout(waitForBoot, 200);
    };

    if (document.getElementById(SCRIPT_ID)) {
      waitForBoot();
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.type = "text/javascript";
    script.src = scriptUrl;
    script.setAttribute("data-token", token);
    script.onerror = () => reject(new Error("Não foi possível baixar o módulo da Memed."));
    document.body.appendChild(script);
    waitForBoot();
  });
}

/**
 * Prepara a sessão da Memed: token do servidor, script carregado, eventos
 * assinados, paciente e configurações enviados. Devolve o hub pronto para
 * `module.show` ou `viewPrescription`.
 */
async function openMemedSession(patientId: number, encounterId: number | null): Promise<Hub> {
  const form = new FormData();
  form.set("patient_id", String(patientId));
  const result = await startPrescriptionAction(form);
  if ("error" in result) throw new Error(result.error);

  const hub = await loadMemed(result.scriptUrl, result.token);

  // Trocou de prescritor no mesmo navegador: limpa o localStorage da Memed
  // antes de qualquer coisa. Recarrega porque o token entra no script só na
  // injeção — depois do reload a próxima tentativa carrega o prescritor certo.
  if (loadedForProfessional !== null && loadedForProfessional !== result.professionalId) {
    await hub.command.send(SDK, "logout");
    loadedForProfessional = null;
    window.location.reload();
    throw new Error("Trocando de prescritor — recarregando.");
  }
  loadedForProfessional = result.professionalId;
  current = { patientId, encounterId };

  if (!eventsBound) {
    eventsBound = true;

    hub.event.add("prescricaoImpressa", (payload: unknown) => {
      const prescriptionId = extractPrescriptionId(payload);
      // Sem paciente corrente não dá para saber de quem é a receita; a
      // reconciliação ("Sincronizar receitas") a traz depois, pelo paciente
      // que a própria Memed devolve.
      if (!prescriptionId || !current) return;
      const record = new FormData();
      record.set("memed_prescription_id", prescriptionId);
      record.set("patient_id", String(current.patientId));
      if (current.encounterId) record.set("encounter_id", String(current.encounterId));
      // Sem webhook, este é o único aviso de que a receita existe.
      void recordPrescriptionAction(record).catch(() => {
        // Falhou gravar: a receita existe na Memed e o botão "Sincronizar
        // receitas" a traz. Melhor isso do que uma promessa rejeitada solta.
      });
    });

    hub.event.add("prescricaoExcluida", (payload: unknown) => {
      // Este evento entrega o id cru, não um objeto.
      const prescriptionId = extractPrescriptionId(payload);
      if (!prescriptionId) return;
      const deleted = new FormData();
      deleted.set("memed_prescription_id", prescriptionId);
      void markPrescriptionDeletedAction(deleted).catch(() => {});
    });
  }

  await hub.command.send(MODULE, "setFeatureToggle", result.featureToggle);
  if (result.workplace) await hub.command.send(MODULE, "setWorkplace", result.workplace);
  if (result.additionalData.header.length > 0 || result.additionalData.footer) {
    await hub.command.send(MODULE, "setAdditionalData", result.additionalData);
  }
  await hub.command.send(MODULE, "setPaciente", result.patient);
  return hub;
}

function useMemedAction() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(work: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await work();
      } catch (err) {
        unstable_rethrow(err);
        setError(err instanceof Error ? err.message : "Falha ao falar com a Memed.");
      }
    });
  }

  return { isPending, error, run };
}

export function PrescribeButton({
  patientId,
  encounterId,
  className = "btn btn-primary",
  children,
}: {
  patientId: number;
  encounterId: number | null;
  /** Classes do botão; o prontuário passa `doc-tab` para ele sentar entre as pílulas de documento. */
  className?: string;
  /** Conteúdo antes do rótulo (um ícone, por exemplo). */
  children?: ReactNode;
}) {
  const { isPending, error, run } = useMemedAction();

  return (
    <>
      <button
        type="button"
        onClick={() =>
          run(async () => {
            const hub = await openMemedSession(patientId, encounterId);
            await hub.module.show(MODULE);
          })
        }
        disabled={isPending}
        className={`${className} disabled:opacity-50`}
      >
        {children}
        {isPending ? "Abrindo…" : "Prescrição digital"}
      </button>
      {error ? <Alert>{error}</Alert> : null}
    </>
  );
}

/** `viewPrescription` reabre uma receita já emitida para reimprimir ou editar. */
export function ReopenPrescriptionButton({
  patientId,
  encounterId,
  prescriptionId,
  className = "font-bold text-pine-700 hover:underline",
}: {
  patientId: number;
  encounterId: number | null;
  prescriptionId: string;
  /** A lista de documentos passa a mesma classe das outras ações da linha (alvo de toque de 44px no celular). */
  className?: string;
}) {
  const { isPending, error, run } = useMemedAction();

  return (
    <>
      <button
        type="button"
        onClick={() =>
          run(async () => {
            const hub = await openMemedSession(patientId, encounterId);
            await hub.command.send(MODULE, "viewPrescription", prescriptionId);
          })
        }
        disabled={isPending}
        className={`${className} disabled:opacity-50`}
      >
        {isPending ? "Abrindo…" : "Reabrir na Memed"}
      </button>
      {error ? <Alert>{error}</Alert> : null}
    </>
  );
}

/**
 * Reconciliação manual — a rede de segurança para a receita cujo evento do
 * navegador nunca chegou.
 */
export function SyncPrescriptionsButton({ patientId }: { patientId: number }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            const form = new FormData();
            form.set("patient_id", String(patientId));
            setMessage(await syncPrescriptionsAction(form));
          })
        }
        disabled={isPending}
        className="btn btn-ghost px-2.5 py-1 text-xs disabled:opacity-50"
      >
        {isPending ? "Sincronizando…" : "Sincronizar receitas"}
      </button>
      {message ? (
        <Feedback key={message} tone="aviso" className="mt-1" onClose={() => setMessage(null)}>
          {message}
        </Feedback>
      ) : null}
    </>
  );
}
