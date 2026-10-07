import type { ReactNode } from "react";
import type { Metadata } from "next";
import { sql } from "@/lib/db";
import type { AppointmentStatus } from "@/lib/db";
import { getSessionSecret } from "@/lib/auth";
import { verifyConfirmToken } from "@/lib/confirm-token";
import { signPatientToken } from "@/lib/patient-token";
import { cancelByTokenAction, confirmByTokenAction } from "@/lib/actions-confirm";
import { addDaysISO, fmtDateLong, todayISO } from "@/lib/format";
import { getPublicClinic, publicMetadata } from "@/lib/marketing-stats";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";

// O link carrega um token pessoal: fora dos buscadores e sem repassar a URL a terceiros.
export async function generateMetadata(): Promise<Metadata> {
  const metadata = await publicMetadata({
    title: "Confirmar consulta",
    description: "Confirme sua presença ou avise que não poderá ir.",
    path: "/confirmar",
    index: false,
  });
  return { ...metadata, alternates: undefined, referrer: "no-referrer" };
}

interface ConfirmRow {
  id: number;
  patient_id: number;
  date: string;
  start_time: string;
  status: AppointmentStatus;
  patient_name: string;
  professional_name: string;
  professional_specialty: string;
}

export default async function PatientConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const verified = verifyConfirmToken(token, getSessionSecret(), todayISO());
  if (!verified) return <Shell clinic={(await getPublicClinic()).name}><InvalidCard /></Shell>;

  const [[appointment], { name: clinic }] = await Promise.all([
    sql<ConfirmRow>`
      SELECT a.id, a.patient_id, a.date, a.start_time, a.status,
        p.name AS patient_name, pr.name AS professional_name, pr.specialty AS professional_specialty
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN professionals pr ON pr.id = a.professional_id
      WHERE a.id = ${verified.appointmentId}`,
    getPublicClinic(),
  ]);
  if (!appointment) return <Shell clinic={clinic}><InvalidCard /></Shell>;

  const firstName = appointment.patient_name.split(/\s+/)[0];
  const canConfirm = appointment.status === "agendado";
  const canCancel = appointment.status === "agendado" || appointment.status === "confirmado";

  if (query.ok === "confirmado" || query.ok === "cancelado") {
    const confirmed = query.ok === "confirmado";
    return (
      <Shell clinic={clinic}>
        <div className="card p-6 text-center sm:p-8" role="status">
          <ResultIcon tone={confirmed ? "success" : "neutral"} />
          <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-pine-950">
            {confirmed ? "Presença confirmada — até lá!" : "Consulta cancelada."}
          </h1>
          <p className="mt-3 text-sm text-pine-900/60">
            {confirmed
              ? `Obrigado, ${firstName}. Qualquer imprevisto, é só voltar a este link ou falar com a ${clinic}.`
              : `A ${clinic} foi avisada. Quando quiser remarcar, é só entrar em contato.`}
          </p>
          <Summary appointment={appointment} clinic={clinic} />
          <a
            href={`/p/${signPatientToken(appointment.patient_id, addDaysISO(todayISO(), 30), getSessionSecret())}`}
            className="btn-hero-secondary mt-6 w-full"
          >
            Ver meu portal
          </a>
        </div>
      </Shell>
    );
  }

  return (
    <Shell clinic={clinic}>
      {query.erro === "estado" ? (
        <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          Esta consulta já não pode ser alterada por aqui — fale com a clínica.
        </p>
      ) : null}

      <div className="card p-6 sm:p-8">
        <p className="text-sm text-pine-900/60">Olá, {firstName}!</p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pine-950">
          {appointment.status === "confirmado"
            ? "Sua presença já está confirmada."
            : canConfirm
              ? "Você confirma sua consulta?"
              : "Sobre a sua consulta"}
        </h1>

        <Summary appointment={appointment} clinic={clinic} />

        {appointment.status === "confirmado" ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold text-sky-800">
            <span className="chip bg-sky-100 text-sky-800">Confirmada</span>
            Até lá! Se algo mudar, avise pelo botão abaixo.
          </p>
        ) : null}

        {!canConfirm && !canCancel ? (
          <p className="mt-4 text-sm text-pine-900/60">
            {appointment.status === "cancelado"
              ? "Esta consulta foi cancelada. Para remarcar, fale com a clínica."
              : "Esta consulta já não pode ser alterada por aqui — fale com a clínica."}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3">
          {canConfirm ? (
            <form action={confirmByTokenAction}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="btn btn-primary min-h-12 w-full sm:min-h-0">
                Confirmar presença
              </button>
            </form>
          ) : null}
          {canCancel ? (
            <form action={cancelByTokenAction}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="btn btn-outline min-h-12 w-full sm:min-h-0">
                Não poderei ir
              </button>
            </form>
          ) : null}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-pine-900/50">
        Este link é pessoal e vale até o dia seguinte à consulta.
      </p>
    </Shell>
  );
}

function Summary({ appointment, clinic }: { appointment: ConfirmRow; clinic: string }) {
  return (
    <div className="mt-4 rounded-xl bg-pine-50 p-4 text-left text-sm">
      <p className="font-bold text-pine-950">{appointment.professional_name}</p>
      {appointment.professional_specialty ? (
        <p className="text-pine-900/70">{appointment.professional_specialty}</p>
      ) : null}
      <p className="mt-2 text-pine-900/70">
        {fmtDateLong(appointment.date)} às{" "}
        <strong className="text-pine-950">{appointment.start_time}</strong>
      </p>
      <p className="mt-1 text-pine-900/70">{clinic}</p>
    </div>
  );
}

function InvalidCard() {
  return (
    <div className="card p-6 text-center sm:p-8">
      <ResultIcon tone="warning" />
      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-pine-950">
        Link inválido ou vencido
      </h1>
      <p className="mt-3 text-sm text-pine-900/60">
        Este link de confirmação não é mais válido. Se você ainda precisa confirmar ou
        cancelar sua consulta, fale com a clínica pelo WhatsApp de onde recebeu a mensagem.
      </p>
    </div>
  );
}

function ResultIcon({ tone }: { tone: "success" | "neutral" | "warning" }) {
  const style = {
    success: "bg-emerald-100 text-emerald-700",
    neutral: "bg-stone-200 text-stone-600",
    warning: "bg-clay-100 text-clay-800",
  }[tone];
  return (
    <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${style}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden
      >
        {tone === "success" ? <path d="m5 13 4 4L19 7" /> : null}
        {tone === "neutral" ? <path d="M6 6l12 12M18 6L6 18" /> : null}
        {tone === "warning" ? <path d="M12 8v5M12 16.5v.5" /> : null}
      </svg>
    </span>
  );
}

function Shell({ clinic, children }: { clinic: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader clinicName={clinic} width="max-w-md" />
      <main className="min-h-[70vh] bg-paper">
        <div className="mx-auto max-w-md px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8 sm:px-6 sm:py-12">
          <p className="label mb-3">Confirmação de consulta</p>
          {children}
        </div>
      </main>
      <SiteFooter clinicName={clinic} compact />
    </>
  );
}
