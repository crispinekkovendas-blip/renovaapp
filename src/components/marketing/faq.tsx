import Link from "next/link";
import type { FaqItem } from "@/lib/clinic-public";
import { BOOKING_WINDOW_DAYS } from "@/lib/booking-slots";
import { SectionHeading } from "./section-heading";
import { FOCUS_RING } from "./site-header";

/**
 * As dúvidas de quem vai marcar pela primeira vez. Cada resposta descreve o
 * que o sistema faz hoje (agendamento sem conta, confirmação por link,
 * portal). O mesmo texto vira o JSON-LD `FAQPage` na página — por isso as
 * respostas são texto puro, e o link da política fica fora delas.
 */
export function landingFaq({ clinicName, clinicPhone }: { clinicName: string; clinicPhone: string | null }): FaqItem[] {
  return [
    {
      question: "Preciso criar conta ou senha para agendar?",
      answer: "Não. Basta seu nome e um telefone com WhatsApp; o e-mail é opcional.",
    },
    {
      question: "Como sei que a consulta está confirmada?",
      answer: `Depois que você escolhe o horário, a ${clinicName} confirma a consulta pelo WhatsApp que você informou.`,
    },
    {
      question: "E se eu não puder ir?",
      answer:
        "Pelo link de confirmação que a clínica envia, você avisa com um toque que não poderá ir. Se preferir, fale direto com a clínica.",
    },
    {
      question: "Não achei um horário que dê para mim. E agora?",
      answer: `A agenda online mostra os próximos ${BOOKING_WINDOW_DAYS} dias. Se nenhum horário servir, fale com a clínica${
        clinicPhone ? ` pelo ${clinicPhone}` : ""
      }.`,
    },
    {
      question: "Onde ficam minhas receitas e documentos?",
      answer:
        "No seu portal do paciente, um link pessoal que a clínica envia pelo WhatsApp. Lá ficam a próxima consulta, as receitas digitais, os documentos liberados e os recibos.",
    },
    {
      question: "O que é feito com os meus dados?",
      answer:
        "Nome, telefone e e-mail são usados para agendar e confirmar a sua consulta, e não são vendidos nem cedidos para publicidade. Os detalhes estão na política de privacidade.",
    },
  ];
}

/** Acordeões nativos (<details>): abrem e fecham sem JS. */
export function Faq({ items }: { items: FaqItem[] }) {
  return (
    <section id="duvidas" aria-labelledby="duvidas-titulo" className="scroll-mt-20 bg-peach-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:py-24">
        <div>
          <SectionHeading id="duvidas-titulo" eyebrow="Dúvidas" title="Perguntas frequentes" />
          <p className="mt-4 text-sm text-pine-900/60">
            Mais sobre o uso dos seus dados na{" "}
            <Link href="/privacidade" className={`font-bold text-pine-800 underline underline-offset-2 ${FOCUS_RING}`}>
              política de privacidade
            </Link>
            .
          </p>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <details key={item.question} className="accordion">
              <summary className="text-lg">{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
