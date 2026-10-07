import { NewAppointment } from "@/components/agenda/new-appointment";
import type { NewAppointmentSearchParams } from "@/components/agenda/params";
import { Modal } from "@/components/modal";

export default async function NewAppointmentModal({
  searchParams,
}: {
  searchParams: Promise<NewAppointmentSearchParams>;
}) {
  return (
    <Modal>
      <NewAppointment params={await searchParams} />
    </Modal>
  );
}
