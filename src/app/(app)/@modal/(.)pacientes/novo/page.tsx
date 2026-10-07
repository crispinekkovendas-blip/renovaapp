import { NewPatientForm } from "@/components/pacientes/new-patient-form";
import { Modal } from "@/components/modal";

export default async function NewPatientModal({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <Modal>
      <NewPatientForm error={erro} closeHref="/pacientes" />
    </Modal>
  );
}
