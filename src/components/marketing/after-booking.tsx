import type { ReactNode } from "react";
import { telHref } from "@/lib/clinic-public";
import { waLink } from "@/lib/format";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { IconCalendarAdd, IconChat, IconCheckCircle, IconPrescription, IconReceipt } from "./icons";

interface Feature {
  title: string;
  text: string;
  icon: ReactNode;
}

/** Só o que o portal do paciente e a confirmação por link fazem hoje. */
const FEATURES: Feature[] = [
  {
    title: "Lembrete no WhatsApp",
    text: "Antes da consulta, a clínica manda um lembrete com dia, hora e o link para você responder.",
    icon: <IconChat />,
  },
  {
    title: "Confirme ou desmarque com um toque",
    text: "Pelo link da mensagem, sem telefonema. A agenda da clínica é atualizada na hora.",
    icon: <IconCheckCircle />,
  },
  {
    title: "Na sua agenda do celular",
    text: "No seu portal, um toque adiciona a consulta ao calendário do celular.",
    icon: <IconCalendarAdd />,
  },
  {
    title: "Receitas digitais no celular",
    text: "Quando o profissional emite a receita digital, ela fica no seu portal, pronta para a farmácia.",
    icon: <IconPrescription />,
  },
  {
    title: "Documentos e recibos",
    text: "Atestados, encaminhamentos e recibos liberados pela clínica ficam guardados no seu portal.",
    icon: <IconReceipt />,
  },
];

/**
 * "Depois de marcar": o que o paciente recebe (lembrete, confirmação por
 * link, portal). Também é o destino do "Já tenho consulta" da abertura —
 * quem já é paciente descobre aqui que o caminho é o link do WhatsApp.
 */
export function AfterBooking({ clinicPhone }: { clinicPhone: string | null }) {
  const wa = waLink(clinicPhone, "Olá! Preciso do link da minha consulta.");
  const tel = telHref(clinicPhone);

  return (
    <section id="ja-sou-paciente" aria-labelledby="depois-titulo" className="scroll-mt-20 bg-peach-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading
          id="depois-titulo"
          eyebrow="Depois de marcar"
          title="O resto também acontece pelo celular."
          lead="Cada paciente recebe um link pessoal, o portal do paciente, com a próxima consulta e tudo o que a clínica liberar para você."
        />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {FEATURES.map((feature, i) => (
            <Reveal as="li" key={feature.title} delay={(i % 3) * 80} className="card flex gap-4 p-5 sm:p-6">
              <div className="h-10 w-10 shrink-0 text-pine-950 sm:h-12 sm:w-12">{feature.icon}</div>
              <div>
                <h3 className="font-display text-lg font-semibold leading-snug tracking-tight text-pine-950">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-pine-900/70">{feature.text}</p>
              </div>
            </Reveal>
          ))}

          {/* O cartão de quem já é paciente fecha a grade, com o mesmo peso dos outros. */}
          <Reveal as="li" delay={160} className="flex flex-col justify-between gap-4 rounded-3xl bg-pine-950 p-5 text-paper sm:p-6">
            <div>
              <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">Já tem consulta marcada?</h3>
              <p className="mt-1.5 text-sm leading-relaxed opacity-75">
                Use o link que a clínica enviou pelo WhatsApp para confirmar, desmarcar ou abrir seu portal. Perdeu o
                link? Peça um novo à clínica.
              </p>
            </div>
            {wa || tel ? (
              <div className="flex flex-wrap gap-2">
                {wa ? (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="btn min-h-11 bg-peach-200 text-pine-950 hover:bg-peach-300">
                    Pedir pelo WhatsApp
                  </a>
                ) : null}
                {tel ? (
                  <a href={tel} className="btn min-h-11 border border-white/25 text-white hover:bg-white/10">
                    Ligar
                  </a>
                ) : null}
              </div>
            ) : null}
          </Reveal>
        </ul>
      </div>
    </section>
  );
}
