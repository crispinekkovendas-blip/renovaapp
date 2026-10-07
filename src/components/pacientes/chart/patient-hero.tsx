import Link from "next/link";
import type { ReactNode } from "react";
import type { Patient } from "@/lib/db";
import { ageFrom } from "@/lib/format";
import { Popover, PopoverClose } from "@/components/popover";
import { IconFileText, IconStethoscope } from "@/components/icons";
import { PrescribeButton } from "@/components/memed/prescribe-button";
import { initials, PATIENT_TABS, patientTabHref } from "./chart-model";
import type { PatientTab } from "./chart-model";

/**
 * O topo da ficha, à moda Apple: quem é o paciente numa linha, as duas coisas
 * que se fazem com ele (atender, emitir documento) e o resto guardado no "···".
 * Nada some — Editar, Portal, Agendar, Resumo IA e a última receita impressa
 * estão no menu.
 */
export function PatientHero({
  patient,
  displayName,
  socialName,
  phoneWa,
  portalHref,
  aiOn,
  emitHref,
  canIssue,
  memedEnabled,
  latestEncounterId,
  latestWithRxId,
}: {
  patient: Pick<Patient, "id" | "name" | "birth_date" | "cpf" | "phone" | "insurance">;
  displayName: string;
  socialName: string | null;
  phoneWa: string | null;
  portalHref: string;
  aiOn: boolean;
  /** O compositor (abre como pop-up por cima da ficha). */
  emitHref: string;
  canIssue: boolean;
  memedEnabled: boolean;
  latestEncounterId: number | null;
  latestWithRxId: number | null;
}) {
  const facts = [ageFrom(patient.birth_date), patient.insurance ?? "Particular"].filter(Boolean);
  return (
    <section className="mb-5">
      <div className="flex items-start gap-3.5 sm:gap-4">
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-pine-950 text-xl font-extrabold text-white sm:h-16 sm:w-16 sm:text-2xl"
        >
          {initials(displayName)}
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <h1 className="truncate font-display text-2xl font-extrabold tracking-tight text-pine-950 sm:text-[28px]">
            {displayName}
          </h1>
          {socialName ? <p className="truncate text-xs text-pine-900/50">Nome civil: {patient.name}</p> : null}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13.5px] text-pine-900/60">
            {facts.map((fact, i) => (
              <span key={fact}>
                {i > 0 ? <span aria-hidden className="mr-2 text-pine-900/25">·</span> : null}
                {fact}
              </span>
            ))}
            {patient.phone ? (
              <span className="basis-full sm:basis-auto">
                <span aria-hidden className="mr-2 hidden text-pine-900/25 sm:inline">·</span>
                {phoneWa ? (
                  <a
                    href={phoneWa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-pine-700 hover:underline"
                  >
                    {patient.phone} (WhatsApp)
                  </a>
                ) : (
                  patient.phone
                )}
              </span>
            ) : null}
          </p>
        </div>
        <MoreMenu>
          <MenuLink href={`/pacientes/${patient.id}?editar=1#dados`}>Editar dados do paciente</MenuLink>
          <MenuLink href="/agenda?novo=1">Agendar consulta</MenuLink>
          <MenuLink href={portalHref} external>
            Enviar o portal do paciente
          </MenuLink>
          {aiOn ? <MenuLink href={`/pacientes/${patient.id}/resumo`}>Resumo com IA</MenuLink> : null}
          {latestWithRxId ? (
            <MenuLink href={`/pacientes/${patient.id}/imprimir/${latestWithRxId}?tipo=receita`} external>
              Imprimir a última receita do atendimento
            </MenuLink>
          ) : null}
        </MoreMenu>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Link
          href={`/pacientes/${patient.id}?aba=atendimentos&atender=1#novo-atendimento`}
          className="btn btn-primary justify-center"
        >
          <IconStethoscope className="h-4 w-4 shrink-0" />
          Novo atendimento
        </Link>
        {canIssue ? (
          <Link href={emitHref} className="btn btn-outline justify-center">
            <IconFileText className="h-4 w-4 shrink-0" />
            Emitir documento
          </Link>
        ) : null}
        {memedEnabled ? (
          <PrescribeButton
            patientId={patient.id}
            encounterId={latestEncounterId}
            className="btn btn-ghost col-span-2 justify-center sm:col-span-1"
          >
            <IconFileText className="h-4 w-4 shrink-0" />
          </PrescribeButton>
        ) : null}
      </div>
    </section>
  );
}

function MoreMenu({ children }: { children: ReactNode }) {
  return (
    <Popover
      className="relative shrink-0"
      summary={
        <span aria-label="Mais opções" className="flex h-11 w-11 items-center justify-center rounded-full bg-pine-50 text-pine-900/70 hover:bg-pine-100">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-5 w-5">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </span>
      }
      summaryClassName="cursor-pointer rounded-full"
    >
      <div className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-[#e2dcec] bg-white p-1.5 shadow-lg">
        <div className="flex justify-end">
          <PopoverClose />
        </div>
        <nav className="-mt-2 flex flex-col">{children}</nav>
      </div>
    </Popover>
  );
}

function MenuLink({ href, external, children }: { href: string; external?: boolean; children: ReactNode }) {
  const className =
    "block min-h-11 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-pine-950 hover:bg-pine-50 sm:min-h-0";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** As abas da ficha: um controle segmentado, com a contagem onde ajuda. */
export function PatientTabs({
  patientId,
  active,
  counts,
}: {
  patientId: number;
  active: PatientTab;
  counts: Partial<Record<PatientTab, number>>;
}) {
  return (
    <nav aria-label="Seções da ficha" className="mb-5 grid grid-cols-4 gap-1 rounded-2xl bg-pine-100/60 p-1">
      {PATIENT_TABS.map((tab) => {
        const on = tab.id === active;
        const count = counts[tab.id];
        return (
          <Link
            key={tab.id}
            href={patientTabHref(patientId, tab.id)}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-0.5 text-center text-[11.5px] font-bold tracking-tight transition-colors sm:px-1 sm:text-[13.5px] sm:tracking-normal ${
              on ? "bg-white text-pine-950 shadow-sm" : "text-pine-900/60 hover:text-pine-950"
            }`}
          >
            <span>{tab.label}</span>
            {count ? (
              <span className={`hidden rounded-full px-1.5 text-[11px] sm:inline ${on ? "bg-pine-100" : "bg-white/60"}`}>
                {count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
