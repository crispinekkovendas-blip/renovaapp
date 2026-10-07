import { NewPatientForm } from "@/components/pacientes/new-patient-form";

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-4 sm:p-6">
        <NewPatientForm error={erro} closeHref="/pacientes" />
      </div>
    </div>
  );
}
