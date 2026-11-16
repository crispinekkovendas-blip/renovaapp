import { todayISO } from "@/lib/format";
import { safePath } from "@/lib/form-fields";
import { loadNewAppointmentOptions } from "@/components/agenda/new-appointment-data";
import { NewAppointmentForm } from "@/components/agenda/new-appointment-form";
import { dateParam } from "@/components/agenda/params";
import type { NewAppointmentSearchParams } from "@/components/agenda/params";

/**
 * "Novo agendamento" a partir dos parâmetros da URL — o mesmo na página
 * cheia (/agenda/novo) e no modal interceptado sobre a agenda.
 */
export async function NewAppointment({
  params,
  standalone = false,
}: {
  params: NewAppointmentSearchParams;
  /** Página cheia (/agenda/novo): o título vira o h1. */
  standalone?: boolean;
}) {
  const date = dateParam(params.date, todayISO());
  // Só caminho do próprio app; qualquer outra coisa é ignorada.
  const returnTo = safePath(params.volta ?? "", "") || undefined;
  const { professionals, patients } = await loadNewAppointmentOptions();

  return (
    <NewAppointmentForm
      date={date}
      time={params.time}
      professionalId={params.prof}
      patientId={params.patient}
      waitlistId={params.waitlist}
      patients={patients}
      professionals={professionals}
      error={params.erro}
      closeHref={returnTo ?? `/agenda?date=${date}`}
      returnTo={returnTo}
      Heading={standalone ? "h1" : "h2"}
    />
  );
}
