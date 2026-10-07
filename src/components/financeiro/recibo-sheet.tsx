import { sql } from "@/lib/db";
import type { Payment } from "@/lib/db";
import { fmtDate, fmtDateLong, moneyBR, PAYMENT_METHOD_LABEL } from "@/lib/format";
import { valorPorExtenso } from "@/lib/extenso";
import { PRINT_STYLE } from "@/components/documents/document-sheet";
import { FitWidth } from "@/components/fit-width";

/** 210mm em px CSS (96 dpi): a largura natural da folha, que o FitWidth encolhe no celular. */
const A4_PX = 793.7;

/**
 * A folha A4 do recibo, compartilhada pelo financeiro (`/financeiro/recibo/<id>`)
 * e pelo portal do paciente (`/p/<token>/recibos/<id>`). `ReciboSheet` só
 * desenha; `loadRecibo` junta pagamento, pagador, consulta e cabeçalho da
 * clínica — quem chama decide se o pagamento está pago e se é do paciente certo.
 */

export interface ReciboPatient {
  id: number;
  name: string;
  cpf: string | null;
}

export interface ReciboAppointment {
  date: string;
  procedure: string;
  professional_name: string;
}

export interface ReciboData {
  payment: Payment;
  patient: ReciboPatient | null;
  appointment: ReciboAppointment | null;
  settings: Record<string, string>;
}

export async function loadRecibo(paymentId: number): Promise<ReciboData | null> {
  if (!Number.isInteger(paymentId) || paymentId <= 0) return null;
  const [payment] = await sql<Payment>`SELECT * FROM payments WHERE id = ${paymentId}`;
  if (!payment) return null;

  const [[patient], [appointment], settingsRows] = await Promise.all([
    payment.patient_id
      ? sql<ReciboPatient>`SELECT id, name, cpf FROM patients WHERE id = ${payment.patient_id}`
      : Promise.resolve([] as ReciboPatient[]),
    payment.appointment_id
      ? sql<ReciboAppointment>`
          SELECT a.date, a.procedure, pr.name AS professional_name
          FROM appointments a
          JOIN professionals pr ON pr.id = a.professional_id
          WHERE a.id = ${payment.appointment_id}`
      : Promise.resolve([] as ReciboAppointment[]),
    sql<{ key: string; value: string }>`SELECT key, value FROM settings`.catch(() => [] as { key: string; value: string }[]),
  ]);

  return {
    payment,
    patient: patient ?? null,
    appointment: appointment ?? null,
    settings: Object.fromEntries(settingsRows.map((row) => [row.key, row.value])),
  };
}

export function ReciboSheet({ payment, patient, appointment, settings }: ReciboData) {
  const clinicName = settings.clinic_name || "Clínica";
  const clinicLine = [settings.clinic_address, settings.clinic_phone, settings.clinic_document]
    .filter(Boolean)
    .join(" · ");
  const paidAt = (payment.paid_at ?? payment.due_date).slice(0, 10);
  const payerName = patient?.name ?? "______________________________";
  const referente = appointment?.procedure || payment.description || "atendimento";
  const methodLabel = payment.method ? (PAYMENT_METHOD_LABEL[payment.method] ?? payment.method) : null;
  const cityDateLine = [settings.clinic_city, fmtDateLong(paidAt)].filter(Boolean).join(", ");

  return (
    <>
      {/* Na impressão, só o documento (.print-area) aparece — o resto da página some. */}
      <style>{PRINT_STYLE}</style>

      {/* No celular a folha é encolhida para caber na largura (A4 não refaz linhas); a impressão sai do tamanho real. */}
      <FitWidth width={A4_PX}>
        <article className="print-area mx-auto flex min-h-[280mm] w-full max-w-[210mm] flex-col bg-white p-[18mm] text-ink shadow-[0_2px_16px_rgba(22,51,43,0.12)]">
          <header className="border-b-2 border-pine-900 pb-4">
            <p className="font-display text-2xl font-semibold text-pine-950">{clinicName}</p>
            {clinicLine ? <p className="mt-1 text-xs text-pine-900/60">{clinicLine}</p> : null}
          </header>

          <div className="mt-10 flex items-start justify-between gap-6">
            <h1 className="font-display text-xl font-semibold text-pine-950">
              Recibo nº {payment.id}
            </h1>
            <p className="rounded-lg border-2 border-pine-900 px-4 py-2 font-display text-xl font-semibold text-pine-950">
              {moneyBR(payment.amount_cents)}
            </p>
          </div>

          <div className="mt-10 flex-1">
            <p className="text-justify text-base leading-8">
              Recebemos de <strong>{payerName}</strong>
              {patient?.cpf ? <>, CPF {patient.cpf}</> : null} a importância de{" "}
              <strong>{moneyBR(payment.amount_cents)}</strong> ({valorPorExtenso(payment.amount_cents)}), referente a{" "}
              {referente}
              {appointment ? (
                <>
                  {" "}
                  em {fmtDate(appointment.date)} com {appointment.professional_name}
                </>
              ) : null}
              .
            </p>

            <div className="mt-8 space-y-1 text-sm">
              {methodLabel ? (
                <p>
                  <span className="font-bold">Forma de pagamento:</span> {methodLabel}
                </p>
              ) : null}
              <p>
                <span className="font-bold">Recebido em:</span> {fmtDateLong(paidAt)}
              </p>
            </div>

            <p className="mt-12 text-right text-sm">{cityDateLine}</p>
          </div>

          <footer className="mt-16 flex flex-col items-center gap-1 pb-2 text-center text-sm">
            <div className="w-72 border-t border-ink pt-2">
              <p className="font-bold">{clinicName}</p>
              {settings.clinic_document ? (
                <p className="text-xs text-pine-900/70">{settings.clinic_document}</p>
              ) : null}
            </div>
          </footer>
        </article>
      </FitWidth>
    </>
  );
}
