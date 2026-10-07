import Link from "next/link";
import type { PublicProfessional } from "@/lib/marketing-stats";
import { firstNameOf, initialsOf } from "@/lib/clinic-public";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/**
 * A equipe, direto do cadastro de profissionais ativos. O botão já abre o
 * agendamento com a pessoa escolhida (`/agendar?prof=<id>`, o parâmetro que
 * a página de agendamento lê). Especialidade e conselho só aparecem quando
 * estão cadastrados — nada é inventado para preencher o cartão. Sem
 * profissional ativo, a seção some.
 */
export function Team({ team }: { team: PublicProfessional[] }) {
  if (team.length === 0) return null;

  return (
    <section id="equipe" aria-labelledby="equipe-titulo" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading
          id="equipe-titulo"
          eyebrow="Equipe"
          title="Com quem você quer se consultar?"
          lead="Toque em um nome: a agenda abre já com os horários livres de quem você escolheu."
        />

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {team.map((prof, i) => (
            <Reveal as="li" key={prof.id} delay={(i % 3) * 60} className="card flex flex-col gap-5 p-6">
              <div className="flex items-center gap-4">
                <span
                  aria-hidden="true"
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-peach-100 font-display text-xl font-semibold text-pine-950"
                >
                  {initialsOf(prof.name)}
                </span>
                <div className="min-w-0">
                  <h3 className="break-words font-display text-xl font-semibold leading-tight tracking-tight text-pine-950">
                    {prof.name}
                  </h3>
                  {prof.specialty?.trim() ? (
                    <p className="mt-0.5 text-sm text-pine-900/70">{prof.specialty}</p>
                  ) : null}
                  {prof.council?.trim() ? (
                    <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-pine-900/50">
                      {prof.council}
                    </p>
                  ) : null}
                </div>
              </div>
              <Link href={`/agendar?prof=${prof.id}`} className="btn btn-primary mt-auto min-h-11 self-start">
                Agendar com {firstNameOf(prof.name)} →
              </Link>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
