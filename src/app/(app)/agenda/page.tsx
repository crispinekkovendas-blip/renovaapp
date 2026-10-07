import Link from "next/link";
import { sql } from "@/lib/db";
import type { Appointment, Patient, Professional, WaitlistEntry } from "@/lib/db";
import { confirmLinkFor } from "@/lib/actions-confirm";
import { addDaysISO, fmtDateLong, todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { AGENDA_ERRORS, ErrorBanner } from "@/components/agenda/agenda-errors";
import { DateStepper } from "@/components/agenda/date-stepper";
import { DayGrid } from "@/components/agenda/day-grid";
import { DayTimeline } from "@/components/agenda/day-timeline";
import { WaitlistSection } from "@/components/agenda/waitlist-section";
import { dateParam, profParam } from "@/components/agenda/params";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; erro?: string; prof?: string }>;
}) {
  const params = await searchParams;
  const date = dateParam(params.date, todayISO());
  // Filtro de profissional da lista do celular (no desktop a grade já mostra todos lado a lado).
  const profId = profParam(params.prof);

  const [professionals, patients, appointments, waitlist] = await Promise.all([
    sql<Pick<Professional, "id" | "name" | "color" | "specialty">>`
      SELECT id, name, color, specialty FROM professionals WHERE active = 1 ORDER BY name`,
    sql<Pick<Patient, "id" | "name">>`SELECT id, name FROM patients ORDER BY name`,
    sql<Appointment>`
      SELECT a.*, p.name AS patient_name, p.phone AS patient_phone, pr.color AS professional_color,
        pr.name AS professional_name
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN professionals pr ON pr.id = a.professional_id
      WHERE a.date = ${date}
      ORDER BY a.start_time`,
    sql<WaitlistEntry>`
      SELECT w.*, p.name AS patient_name, p.phone AS patient_phone, pr.name AS professional_name
      FROM waitlist w
      LEFT JOIN patients p ON p.id = w.patient_id
      LEFT JOIN professionals pr ON pr.id = w.professional_id
      WHERE w.status = 'aguardando'
      ORDER BY w.id`,
  ]);

  // Link assinado por agendamento para o paciente confirmar pelo WhatsApp.
  const confirmLinks = new Map(
    await Promise.all(appointments.map(async (a) => [a.id, await confirmLinkFor(a.id, a.date)] as const))
  );

  const backUrl = `/agenda?date=${date}`;
  const selectedProf = profId ? professionals.find((p) => p.id === profId) : undefined;
  const profQuery = selectedProf ? `&prof=${selectedProf.id}` : "";

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle={fmtDateLong(date)}
        action={
          <DateStepper
            prev={{ href: `/agenda?date=${addDaysISO(date, -1)}${profQuery}`, label: "Dia anterior" }}
            next={{ href: `/agenda?date=${addDaysISO(date, 1)}${profQuery}`, label: "Próximo dia" }}
            date={date}
            dateLabel="Ir para a data"
            hidden={selectedProf ? { prof: selectedProf.id } : undefined}
            jump={{ href: `/agenda${selectedProf ? `?prof=${selectedProf.id}` : ""}`, label: "Hoje" }}
          >
            <Link href={`/agenda/lembretes?date=${date}`} className="btn btn-outline">
              Lembretes
            </Link>
            <Link href={`/agenda/novo?date=${date}${profQuery}`} className="btn btn-primary">
              <IconPlus className="h-4 w-4" />
              Agendar
            </Link>
          </DateStepper>
        }
      />

      <ErrorBanner code={params.erro} messages={AGENDA_ERRORS} className="mb-4" />

      <div className="md:hidden">
        <DayTimeline
          date={date}
          professionals={professionals}
          selectedProf={selectedProf}
          appointments={
            selectedProf ? appointments.filter((a) => a.professional_id === selectedProf.id) : appointments
          }
          confirmLinks={confirmLinks}
          backUrl={backUrl}
        />
      </div>

      <div className="hidden gap-6 md:grid">
        <DayGrid
          date={date}
          professionals={professionals}
          appointments={appointments}
          confirmLinks={confirmLinks}
          backUrl={backUrl}
        />
      </div>

      <WaitlistSection
        date={date}
        backUrl={backUrl}
        waitlist={waitlist}
        patients={patients}
        professionals={professionals}
      />
    </>
  );
}
