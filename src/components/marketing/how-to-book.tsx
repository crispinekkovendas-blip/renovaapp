import Link from "next/link";
import { BOOKING_WINDOW_DAYS } from "@/lib/booking-slots";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

const STEPS = [
  {
    title: "Escolha com quem",
    text: "Veja a equipe e toque no profissional com quem quer se consultar.",
  },
  {
    title: "Escolha o dia e o horário",
    text: `Aparecem só os horários livres de verdade, nos próximos ${BOOKING_WINDOW_DAYS} dias.`,
  },
  {
    title: "Deixe seu nome e WhatsApp",
    text: "Sem criar conta. A clínica confirma a consulta pelo número que você informar.",
  },
] as const;

/** Os três passos do agendamento online, na ordem em que aparecem em /agendar. */
export function HowToBook() {
  return (
    <section id="como-agendar" aria-labelledby="como-agendar-titulo" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading
          id="como-agendar-titulo"
          eyebrow="Como agendar"
          title="Três passos, direto do celular."
          lead="Sem fila no telefone e sem esperar o horário comercial: a agenda online fica aberta a qualquer hora."
        />

        <ol className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, i) => (
            <Reveal
              as="li"
              key={step.title}
              delay={i * 80}
              className="flex gap-4 rounded-3xl border border-pine-900/10 bg-peach-50 p-5 sm:block sm:p-6"
            >
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pine-950 font-display text-lg font-semibold text-white"
              >
                {i + 1}
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold tracking-tight text-pine-950 sm:mt-5">
                  <span className="sr-only">Passo {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-1.5 text-base leading-relaxed text-pine-900/70 sm:mt-2">{step.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>

        <div className="mt-10">
          <Link href="/agendar" className="btn-hero">
            Ver horários livres
            <span className="chev" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
