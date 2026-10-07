import type { Metadata } from "next";
import { sql } from "@/lib/db";
import { APP_TZ, todayISO } from "@/lib/format";
import {
  BOOKING_WINDOW_DAYS,
  addDaysISO,
  bookingDays,
  parseBookingParams,
  type BookingDay,
  type BusyRange,
  type ScheduleWindow,
} from "@/lib/booking-slots";
import { getPublicClinic, publicMetadata } from "@/lib/marketing-stats";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BookingProgress, type BookingStep } from "./_components/booking-progress";
import { ProfessionalPicker } from "./_components/professional-picker";
import { SlotPicker } from "./_components/slot-picker";
import { BookingSummary } from "./_components/booking-summary";
import { BookingForm } from "./_components/booking-form";
import { NoAvailability } from "./_components/no-availability";
import type { BookingProfessional } from "./_components/types";
import { Feedback } from "@/components/feedback";

/** Os `?erro=` que `createPublicBookingAction` devolve. */
const ERROR_MESSAGE = {
  campos: "Preencha seu nome e um telefone válido para concluir o agendamento.",
  consentimento: "Para agendar, é preciso autorizar o uso dos seus dados de contato.",
  ocupado: "Esse horário acabou de ser reservado. Escolha outro, por favor.",
  indisponivel: "Esse horário não está mais disponível. Escolha outro, por favor.",
  limite:
    "Estamos recebendo muitos agendamentos agora. Aguarde alguns minutos e tente de novo, ou ligue para a clínica.",
  limite_telefone:
    "Já há agendamentos recentes para este telefone. Se precisar de mais um horário, fale com a clínica.",
} as const;

function errorMessage(code: string | undefined): string | null {
  return code && Object.hasOwn(ERROR_MESSAGE, code) ? ERROR_MESSAGE[code as keyof typeof ERROR_MESSAGE] : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const { name } = await getPublicClinic();
  return publicMetadata({
    title: "Agendar consulta",
    description: `Escolha o profissional, o dia e um horário livre na agenda da ${name}. Sem cadastro e sem senha; a confirmação chega pelo WhatsApp.`,
    path: "/agendar",
  });
}

function nowTimeSaoPaulo(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * Janelas de atendimento e consultas ocupadas dos próximos dias — de um
 * profissional ou, no passo 1, de todos (para cada cartão mostrar o
 * próximo horário). Duas leituras em paralelo, só com as colunas usadas.
 */
async function loadAvailability(professionalId: number | null, today: string) {
  const last = addDaysISO(today, BOOKING_WINDOW_DAYS - 1);
  const [schedules, busy] = await Promise.all([
    professionalId
      ? sql<ScheduleWindow>`
          SELECT professional_id, weekday, start_time, end_time, slot_minutes FROM schedules
          WHERE professional_id = ${professionalId}`
      : sql<ScheduleWindow>`
          SELECT s.professional_id, s.weekday, s.start_time, s.end_time, s.slot_minutes
          FROM schedules s JOIN professionals p ON p.id = s.professional_id
          WHERE p.active = 1`,
    professionalId
      ? sql<BusyRange>`
          SELECT professional_id, date, start_time, end_time FROM appointments
          WHERE professional_id = ${professionalId} AND date BETWEEN ${today} AND ${last}
            AND status NOT IN ('cancelado','faltou')`
      : sql<BusyRange>`
          SELECT professional_id, date, start_time, end_time FROM appointments
          WHERE date BETWEEN ${today} AND ${last}
            AND status NOT IN ('cancelado','faltou')`,
  ]);
  return { schedules, busy };
}

export default async function PublicBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ prof?: string; date?: string; time?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const { profId, date, time } = parseBookingParams(params);
  const today = todayISO();

  const [professionals, clinic] = await Promise.all([
    sql<BookingProfessional>`
      SELECT id, name, specialty, color FROM professionals WHERE active = 1 ORDER BY name`,
    getPublicClinic(),
  ]);
  // Clínica com um profissional só: o passo 1 não tem o que escolher.
  const only = professionals.length === 1 ? professionals[0] : null;
  const professional = (profId ? professionals.find((p) => p.id === profId) : only) ?? null;

  const step: BookingStep = !professional ? 1 : !date || !time ? 2 : 3;

  // O passo 3 só grava o que a ação valida de novo; a agenda livre é dos passos 1 e 2.
  const daysByProfessional = new Map<number, BookingDay[]>();
  if (step < 3) {
    const { schedules, busy } = await loadAvailability(professional?.id ?? null, today);
    const nowTime = nowTimeSaoPaulo();
    for (const prof of professional ? [professional] : professionals) {
      daysByProfessional.set(
        prof.id,
        bookingDays({ professionalId: prof.id, schedules, busy, today, nowTime })
      );
    }
  }

  const error = errorMessage(params.erro);
  const nobodyAvailable = step === 1 && [...daysByProfessional.values()].every((days) => days.length === 0);
  const changeProfessionalHref = only ? undefined : "/agendar";

  return (
    <>
      <SiteHeader clinicName={clinic.name} width="max-w-3xl" />

      <main className="min-h-[70vh] bg-paper">
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
          <BookingProgress step={step} />

          {error ? (
            <Feedback tone="erro" className="mb-6">
              {error}
            </Feedback>
          ) : null}

          {step === 1 ? (
            <section aria-labelledby="passo-titulo">
              <h1 id="passo-titulo" className="font-display text-3xl font-semibold tracking-tight text-pine-950">
                Com quem você quer se consultar?
              </h1>
              <p className="mt-2 text-sm text-pine-900/65">
                Escolha o profissional. Na próxima tela aparecem os horários livres.
              </p>
              <div className="mt-6 space-y-6">
                {nobodyAvailable && professionals.length > 0 ? (
                  <NoAvailability who={null} clinicName={clinic.name} clinicPhone={clinic.phone} />
                ) : null}
                {professionals.length > 0 ? (
                  <ProfessionalPicker
                    professionals={professionals}
                    daysByProfessional={daysByProfessional}
                    today={today}
                  />
                ) : (
                  <NoAvailability who={null} clinicName={clinic.name} clinicPhone={clinic.phone} />
                )}
              </div>
            </section>
          ) : null}

          {step === 2 && professional ? (
            <section aria-labelledby="passo-titulo">
              <BookingSummary professional={professional} changeProfessionalHref={changeProfessionalHref} />
              <h1 id="passo-titulo" className="font-display text-3xl font-semibold tracking-tight text-pine-950">
                Escolha o dia e o horário
              </h1>
              <p className="mt-2 text-sm text-pine-900/65">
                Só aparecem horários livres, nos próximos {BOOKING_WINDOW_DAYS} dias.
              </p>
              <div className="mt-6">
                {(daysByProfessional.get(professional.id) ?? []).length > 0 ? (
                  <SlotPicker
                    professionalId={professional.id}
                    days={daysByProfessional.get(professional.id) ?? []}
                    selectedDate={date}
                    today={today}
                  />
                ) : (
                  <NoAvailability
                    who={professional.name}
                    clinicName={clinic.name}
                    clinicPhone={clinic.phone}
                    otherProfessionalsHref={changeProfessionalHref}
                  />
                )}
              </div>
            </section>
          ) : null}

          {step === 3 && professional && date && time ? (
            <section aria-labelledby="passo-titulo" className="max-w-md">
              <h1 id="passo-titulo" className="font-display text-3xl font-semibold tracking-tight text-pine-950">
                Quase lá!
              </h1>
              <p className="mb-5 mt-2 text-sm text-pine-900/65">Confira sua escolha e deixe seu contato.</p>
              <BookingSummary
                professional={professional}
                date={date}
                time={time}
                changeProfessionalHref={changeProfessionalHref}
                changeTimeHref={`/agendar?prof=${professional.id}&date=${date}`}
              />
              <BookingForm professionalId={professional.id} date={date} time={time} />
            </section>
          ) : null}
        </div>
      </main>

      <SiteFooter clinicName={clinic.name} compact />
    </>
  );
}
