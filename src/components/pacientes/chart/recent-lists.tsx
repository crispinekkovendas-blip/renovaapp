import type { Appointment, Payment } from "@/lib/db";
import { fmtDate, moneyBR } from "@/lib/format";
import { EmptyState, PaymentBadge, SectionTitle, StatusBadge } from "@/components/ui";

/** Só as colunas que a lista da ficha mostra (a busca pede exatamente estas). */
export type ChartAppointment = Pick<Appointment, "id" | "date" | "start_time" | "procedure" | "status" | "professional_name">;
export type ChartPayment = Pick<Payment, "id" | "description" | "amount_cents" | "status" | "due_date">;

/** Últimas consultas do paciente (a busca limita a 8). */
export function PatientAppointments({ appointments }: { appointments: ChartAppointment[] }) {
  return (
    <section id="consultas" className="scroll-mt-20">
      <SectionTitle>Consultas</SectionTitle>
      {appointments.length === 0 ? (
        <EmptyState title="Nenhuma consulta" />
      ) : (
        <div className="card divide-y divide-pine-900/5">
          {appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {fmtDate(a.date)} · {a.start_time}
                </p>
                <p className="truncate text-xs text-pine-900/55">
                  {a.procedure} · {a.professional_name}
                </p>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/** Últimos lançamentos financeiros do paciente (a busca limita a 8). */
export function PatientPayments({ payments }: { payments: ChartPayment[] }) {
  return (
    <section id="financeiro" className="scroll-mt-20">
      <SectionTitle>Financeiro</SectionTitle>
      {payments.length === 0 ? (
        <EmptyState title="Nenhum lançamento" />
      ) : (
        <div className="card divide-y divide-pine-900/5">
          {payments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{payment.description}</p>
                <p className="text-xs text-pine-900/55">{fmtDate(payment.due_date)}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
                <span className="whitespace-nowrap text-sm font-bold">{moneyBR(payment.amount_cents)}</span>
                <PaymentBadge status={payment.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
