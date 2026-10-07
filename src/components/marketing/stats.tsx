import type { PublicStats } from "@/lib/marketing-stats";
import { CountUp } from "./count-up";
import { Reveal } from "./reveal";
import { SectionHeading } from "./section-heading";

/** Só números de atividade: o tamanho da equipe já aparece na seção Equipe. */
const FIGURES: { key: keyof PublicStats; label: string }[] = [
  { key: "consultas", label: "consultas agendadas" },
  { key: "confirmadas", label: "confirmadas ou realizadas" },
  { key: "receitas", label: "receitas digitais emitidas" },
  // Papelômetro: cada documento ou receita digital é uma folha que não saiu da impressora.
  { key: "folhas", label: "folhas de papel poupadas" },
];

/**
 * Números reais, direto do banco da clínica, e exatos (sem "+", que leria
 * como "mais de"). Figura nula (tabela ausente, banco fora) ou zerada some
 * sozinha; sem nenhuma, a seção inteira some — a clínica nova não abre a
 * página com "0". Cada número sobe do zero quando entra na tela (CountUp);
 * o valor final já vem do servidor.
 */
export function Stats({ stats }: { stats: PublicStats }) {
  const figures = FIGURES.flatMap((figure) => {
    const value = stats[figure.key];
    return typeof value === "number" && value > 0 ? [{ ...figure, value }] : [];
  });

  if (figures.length === 0) return null;

  return (
    <section aria-labelledby="numeros-titulo" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <SectionHeading
          id="numeros-titulo"
          eyebrow="Em números"
          title="Números reais, direto da agenda da clínica."
        />

        <dl className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {figures.map((figure, i) => (
            // dt antes de dd no DOM; o número aparece acima do rótulo via flex-col-reverse.
            <Reveal key={figure.key} delay={i * 80} className="flex flex-col-reverse border-t border-pine-900/10 pt-5">
              <dt className="mt-2 text-sm font-bold text-pine-900/70">{figure.label}</dt>
              <dd className="bignum text-[3.5rem] sm:text-[4.5rem]">
                <CountUp value={figure.value} />
              </dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}
