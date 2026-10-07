import { PrescribeButton } from "@/components/memed/prescribe-button";

/** A pílula "Receita digital": a receita continua na Memed e não entra nesta emissão. */
export function ReceitaCard({ patientId, encounterId }: { patientId: number; encounterId: number | null }) {
  return (
    <section className="card space-y-3 p-4 sm:p-5" aria-label="Receita digital">
      <p className="font-display text-lg font-extrabold text-pine-950">Receita digital</p>
      <p className="text-sm text-pine-900/70">
        A receita continua na Memed, assinada digitalmente. Ela não entra nesta emissão: abra a Memed, prescreva e a
        receita aparece na ficha e no portal do paciente.
      </p>
      <PrescribeButton patientId={patientId} encounterId={encounterId} />
    </section>
  );
}
