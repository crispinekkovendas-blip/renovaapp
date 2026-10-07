import type { PublicTestimonial } from "@/lib/marketing-stats";
import { firstNameOf, monthYearPT } from "@/lib/clinic-public";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * Avaliações deixadas no portal do paciente depois da consulta, só as que a
 * pessoa autorizou publicar (4 ou 5 estrelas, com comentário). Aparece o
 * primeiro nome e o mês. Sem nenhuma — ou sem a tabela ainda — a seção some.
 */
export function Testimonials({ items }: { items: PublicTestimonial[] }) {
  if (items.length === 0) return null;

  return (
    <section id="depoimentos" aria-labelledby="depoimentos-titulo" className="section-ink scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="depoimentos-titulo"
          dark
          eyebrow="Depoimentos"
          title="Quem já marca assim."
          lead="Avaliações que os próprios pacientes deixaram no portal depois da consulta e autorizaram publicar."
        />

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <Reveal as="li" key={`${item.created_at}-${i}`} delay={i * 60} className="card flex flex-col gap-4 p-6 text-pine-950">
              <Stars rating={item.rating} />
              <blockquote className="font-display text-xl italic leading-snug">“{item.message.trim()}”</blockquote>
              <p className="mt-auto text-sm text-pine-900/60">
                <span className="font-bold text-pine-900">{firstNameOf(item.patient_name)}</span>
                {monthYearPT(item.created_at) ? ` · ${monthYearPT(item.created_at)}` : ""}
              </p>
            </Reveal>
          ))}
        </ul>
        {/* Publicidade médica (CFM 2.336/2023): relato de experiência, nunca promessa de resultado. */}
        <p className="mt-6 text-xs opacity-60">
          Relatos individuais sobre o atendimento. Não representam garantia de resultado de tratamento.
        </p>
      </div>
    </section>
  );
}

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <p className="text-lg leading-none tracking-[0.1em] text-sun-500" aria-label={`${filled} de 5 estrelas`}>
      <span aria-hidden="true">
        {"★".repeat(filled)}
        <span className="text-pine-900/20">{"★".repeat(5 - filled)}</span>
      </span>
    </p>
  );
}
