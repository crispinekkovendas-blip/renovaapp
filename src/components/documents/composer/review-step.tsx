"use client";

import type { Dispatch, SetStateAction } from "react";
import type { ComposerItem } from "@/lib/composer";
import { avatarInitials, phoneForSend, withPatientPhone } from "@/lib/composer-editor";
import type { SendOptions } from "@/lib/composer-editor";
import { IconAlert, IconCheck } from "./icons";
import { KIND_BAR } from "./ui";
import type { ComposerPatient, ComposerProfessional } from "./types";

export interface ReviewStepProps {
  patient: ComposerPatient;
  displayName: string;
  professionals: ReadonlyArray<ComposerProfessional>;
  professionalId: number;
  onProfessionalChange(id: number): void;
  professional: ComposerProfessional | null;
  /** YYYY-MM-DD */
  date: string;
  today: string;
  onDateChange(date: string): void;
  send: SendOptions;
  onSendChange: Dispatch<SetStateAction<SendOptions>>;
  items: ReadonlyArray<ComposerItem>;
  countLabel: string;
}

/**
 * Passo 2: paciente (e o que falta no cadastro), data, profissional, portal,
 * WhatsApp, assinatura e o resumo. Os controles são inputs de verdade do
 * <form> da emissão — os `name`s são o contrato com `emitDocumentsAction`.
 */
export function ReviewStep({
  patient,
  displayName,
  professionals,
  professionalId,
  onProfessionalChange,
  professional,
  date,
  today,
  onDateChange,
  send,
  onSendChange,
  items,
  countLabel,
}: ReviewStepProps) {
  const missingCpf = !patient.cpf?.trim();
  const missingPhone = !patient.phone?.trim();
  const sendPhone = phoneForSend(patient.phone, send.patientPhone);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="card p-4 sm:p-5" aria-label="Paciente">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-100 text-sm font-extrabold text-pine-800"
            aria-hidden
          >
            {avatarInitials(displayName)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-pine-900/55">Paciente</p>
            <p className="truncate font-display text-lg font-extrabold text-pine-950">{displayName}</p>
            {patient.social_name?.trim() ? <p className="text-xs text-pine-900/50">nome civil: {patient.name}</p> : null}
          </div>
        </div>

        {missingCpf || missingPhone ? (
          <div className="mt-4 rounded-2xl border border-clay-200 bg-clay-50 p-4">
            <p className="text-sm font-bold text-clay-900">Informações faltantes</p>
            <p className="mt-0.5 text-xs text-clay-900/80">Opcional — o que você preencher aqui fica no cadastro.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {missingCpf ? (
                <div>
                  <label className="label" htmlFor="emit-cpf">
                    CPF
                  </label>
                  <input
                    className="input"
                    id="emit-cpf"
                    name="patient_cpf"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={20}
                    placeholder="000.000.000-00"
                    value={send.patientCpf}
                    onChange={(e) => {
                      const patientCpf = e.target.value;
                      onSendChange((current) => ({ ...current, patientCpf }));
                    }}
                  />
                  <p className="mt-1 text-[11px] text-pine-900/50">O CPF entra na folha e ajuda quem confere o atestado.</p>
                </div>
              ) : null}
              {missingPhone ? (
                <div>
                  <label className="label" htmlFor="emit-phone">
                    Celular
                  </label>
                  <input
                    className="input"
                    id="emit-phone"
                    name="patient_phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    maxLength={30}
                    placeholder="(11) 99999-9999"
                    value={send.patientPhone}
                    onChange={(e) => {
                      const phone = e.target.value;
                      onSendChange((current) => withPatientPhone(current, phone));
                    }}
                  />
                  <p className="mt-1 text-[11px] text-pine-900/50">Sem celular não dá para mandar o link pelo WhatsApp.</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-4 border-t border-pine-900/5 pt-4" aria-label="Como enviar">
          <p className="text-xs font-bold text-pine-900/55">Como enviar</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="emit-date">
                Data
              </label>
              <input
                className="input"
                type="date"
                id="emit-date"
                name="date"
                required
                value={date}
                onChange={(e) => onDateChange(e.target.value || today)}
              />
            </div>
            <div>
              <label className="label" htmlFor="emit-prof">
                Profissional
              </label>
              <select
                className="input"
                id="emit-prof"
                name="professional_id"
                required
                value={professionalId || ""}
                onChange={(e) => onProfessionalChange(Number(e.target.value))}
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
            <input
              type="checkbox"
              name="shared"
              value="1"
              checked={send.shared}
              onChange={(e) => {
                const shared = e.target.checked;
                onSendChange((current) => ({ ...current, shared }));
              }}
              className="h-4 w-4 accent-pine-700"
            />
            Mostrar no portal do paciente
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
            <input
              type="checkbox"
              name="open_whatsapp"
              value="1"
              checked={send.openWhatsApp}
              disabled={!sendPhone}
              onChange={(e) => {
                const openWhatsApp = e.target.checked;
                onSendChange((current) => ({ ...current, openWhatsApp }));
              }}
              className="h-4 w-4 accent-pine-700"
            />
            Abrir o WhatsApp com a mensagem depois de emitir
          </label>
          {!sendPhone ? (
            <p className="-mt-2 ml-6 text-[11px] text-pine-900/50">Sem celular, o link do portal fica para copiar ou imprimir.</p>
          ) : null}
        </div>
      </section>

      <div className="space-y-5">
        <section className="card p-4 sm:p-5" aria-label="Assinatura">
          <p className="text-xs font-bold text-pine-900/55">Assinatura</p>
          {professional?.hasSignature ? (
            <>
              <div className="mt-2 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                <IconCheck className="h-5 w-5 shrink-0" />
                Assinatura digitalizada + carimbo
              </div>
              <p className="mt-2 text-xs text-pine-900/60">A folha sai assinada e carimbada. Não é assinatura digital ICP-Brasil.</p>
            </>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-3 rounded-2xl bg-clay-50 px-4 py-3 text-sm font-bold text-clay-900">
                <IconAlert className="h-5 w-5 shrink-0" />
                Sem assinatura digitalizada
              </div>
              <p className="mt-2 text-xs text-pine-900/60">
                A folha sai com linha para assinar à mão. Cadastre a assinatura em Configurações → Profissionais.
              </p>
            </>
          )}
        </section>

        <section className="card p-4 sm:p-5" aria-label="Resumo da emissão">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-pine-950">Resumo da emissão</p>
            <span className="text-xs font-bold text-pine-900/50">{countLabel}</span>
          </div>
          <ul className="mt-3 divide-y divide-pine-900/5">
            {items.map((item) => (
              <li key={item.code} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${KIND_BAR[item.kind]}`} />
                  <span className="truncate font-bold text-pine-950">{item.title}</span>
                </span>
                <span className="break-all font-mono text-[11px] font-bold text-pine-700">{item.code}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-pine-900/50">
            Todos saem com a mesma data, o mesmo profissional e um link só para o paciente.
          </p>
        </section>
      </div>
    </div>
  );
}
