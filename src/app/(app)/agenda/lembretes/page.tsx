import Link from "next/link";
import { sql } from "@/lib/db";
import type { AppointmentStatus } from "@/lib/db";
import { confirmLinkFor } from "@/lib/actions-confirm";
import { addDaysISO, fmtDateLong, todayISO, waLink } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { DateStepper } from "@/components/agenda/date-stepper";
import { reminderMessage } from "@/components/agenda/messages";
import { dateParam } from "@/components/agenda/params";

interface ReminderRow {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  procedure: string;
  status: AppointmentStatus;
  patient_id: number;
  patient_name: string;
  patient_phone: string | null;
  professional_name: string;
  professional_color: string;
}

export default async function LembretesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const tomorrow = addDaysISO(todayISO(), 1);
  const date = dateParam(params.date, tomorrow);

  const [appointments, settingsRows, autoSent, pushPatients] = await Promise.all([
    sql<ReminderRow>`
      SELECT a.id, a.date, a.start_time, a.end_time, a.procedure, a.status, a.patient_id,
        p.name AS patient_name, p.phone AS patient_phone,
        pr.name AS professional_name, pr.color AS professional_color
      FROM appointments a
      JOIN patients p ON p.id = a.patient_id
      JOIN professionals pr ON pr.id = a.professional_id
      WHERE a.date = ${date} AND a.status IN ('agendado', 'confirmado')
      ORDER BY a.start_time, pr.name`,
    sql<{ value: string }>`SELECT value FROM settings WHERE key = 'clinic_name'`,
    // Lembrete automático (push) da véspera. Coluna e tabela chegam com a
    // migração de 2026-09-07: sem elas, a página segue só com o WhatsApp.
    sql<{ id: number; reminder_sent_at: string }>`
      SELECT id, reminder_sent_at FROM appointments
      WHERE date = ${date} AND reminder_sent_at IS NOT NULL`.catch(() => [] as { id: number; reminder_sent_at: string }[]),
    sql<{ patient_id: number }>`
      SELECT DISTINCT patient_id FROM push_subscriptions
      WHERE disabled = 0
        AND patient_id IN (SELECT patient_id FROM appointments WHERE date = ${date})`.catch(
      () => [] as { patient_id: number }[]
    ),
  ]);
  const clinic = settingsRows[0]?.value?.trim() || "Clínica Renova";
  const sentAt = new Map(autoSent.map((r) => [r.id, r.reminder_sent_at]));
  const withPush = new Set(pushPatients.map((r) => r.patient_id));

  const rows = await Promise.all(
    appointments.map(async (a) => {
      const link = await confirmLinkFor(a.id, a.date);
      return {
        ...a,
        wa: waLink(a.patient_phone, reminderMessage(a, clinic, link)),
        // "YYYY-MM-DD HH:MM:SS" → "HH:MM"
        autoSentAt: sentAt.get(a.id)?.slice(11, 16) ?? null,
        pushActive: withPush.has(a.patient_id),
      };
    })
  );

  const pending = rows.filter((a) => a.status === "agendado").length;
  const confirmed = rows.length - pending;
  const automatic = rows.filter((a) => a.autoSentAt).length;

  return (
    <>
      <PageHeader
        title="Lembretes"
        subtitle={fmtDateLong(date)}
        action={
          // Mesmo arranjo da agenda: no celular, ‹ data Ir › numa linha e os atalhos na outra.
          <DateStepper
            prev={{ href: `/agenda/lembretes?date=${addDaysISO(date, -1)}`, label: "Dia anterior" }}
            next={{ href: `/agenda/lembretes?date=${addDaysISO(date, 1)}`, label: "Próximo dia" }}
            date={date}
            dateLabel="Ir para a data"
            jump={{ href: "/agenda/lembretes", label: "Amanhã" }}
          >
            <Link href={`/agenda?date=${date}`} className="btn btn-ghost">
              Ver agenda
            </Link>
          </DateStepper>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-pine-900/60">
        <span className="chip bg-pine-100 text-pine-800">{pending} a confirmar</span>
        <span className="chip bg-sky-100 text-sky-800">{confirmed} confirmada{confirmed === 1 ? "" : "s"}</span>
        {automatic > 0 ? (
          <span className="chip bg-emerald-100 text-emerald-800">
            {automatic} lembrete{automatic === 1 ? "" : "s"} automático{automatic === 1 ? "" : "s"}
          </span>
        ) : null}
        <span className="basis-full sm:ml-1 sm:basis-auto">
          Quem ativou lembretes no portal recebe o aviso automático no celular às 9h da véspera. Para os
          outros, envie pelo WhatsApp: o link na mensagem deixa o paciente confirmar ou cancelar sozinho.
        </span>
      </div>

      <div className="card">
        {rows.length === 0 ? (
          <div className="p-3 sm:p-5">
            <EmptyState
              title="Nenhuma consulta para lembrar neste dia."
              hint="Só aparecem aqui consultas agendadas ou confirmadas."
            />
          </div>
        ) : (
          <div className="divide-y divide-pine-900/5">
            {rows.map((a) => (
              <div
                key={a.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <p className="w-12 shrink-0 font-display text-lg font-semibold text-pine-950">{a.start_time}</p>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-pine-950">
                      <Link href={`/pacientes/${a.patient_id}`} className="hover:text-pine-600">
                        {a.patient_name}
                      </Link>
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-pine-900/55">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: a.professional_color }} />
                      <span className="min-w-0 break-words">
                        {a.professional_name} · {a.procedure}
                        {a.patient_phone ? ` · ${a.patient_phone}` : ""}
                      </span>
                    </p>
                    {a.autoSentAt ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-emerald-800">
                        <BellGlyph />
                        lembrete automático enviado {a.autoSentAt}
                      </p>
                    ) : null}
                  </div>
                </div>
                {/* No celular: selos à esquerda (sob o horário) e o WhatsApp grande à direita. */}
                <div className="flex shrink-0 items-center gap-2 pl-15 sm:pl-0">
                  {a.pushActive ? (
                    <span className="chip bg-emerald-100 text-emerald-800" title="Este paciente ativou lembretes no portal">
                      push ativo
                    </span>
                  ) : null}
                  <StatusBadge status={a.status} />
                  {a.wa ? (
                    <a
                      href={a.wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline ml-auto sm:ml-0"
                    >
                      WhatsApp
                    </a>
                  ) : (
                    <span className="ml-auto text-xs text-pine-900/45 sm:ml-0">Sem telefone</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/** Sino pequeno, na cor do texto: o lembrete automático (push) já saiu. */
function BellGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </svg>
  );
}
