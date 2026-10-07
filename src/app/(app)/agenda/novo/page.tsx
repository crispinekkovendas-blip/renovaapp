import { NewAppointment } from "@/components/agenda/new-appointment";
import type { NewAppointmentSearchParams } from "@/components/agenda/params";

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<NewAppointmentSearchParams>;
}) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-4 sm:p-6">
        <NewAppointment params={await searchParams} standalone />
      </div>
    </div>
  );
}
