import Link from "next/link";
import { sql } from "@/lib/db";
import type { Patient } from "@/lib/db";
import { patientFirstName } from "@/lib/documents";
import { getSessionSecret } from "@/lib/auth";
import { verifyPatientToken } from "@/lib/patient-token";
import { fmtDate, moneyBR, todayISO } from "@/lib/format";
import { hubClinic, portalLocked } from "@/lib/hub";
import { ReciboSheet, loadRecibo } from "@/components/financeiro/recibo-sheet";
import { PrintButton } from "@/components/print-button";
import { HubShell, InvalidLinkCard, UnavailableCard } from "@/components/hub/shell";
import { PinGate } from "@/components/hub/pin-gate";

/**
 * Recibo de um pagamento recebido, aberto pelo portal: a mesma folha do
 * financeiro. Só abre se o pagamento for deste paciente e estiver pago — e,
 * com `portal_pin` ligado, depois do código de acesso.
 */

export const metadata = {
  title: "Recibo",
  robots: { index: false, follow: false },
};

export default async function HubReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string; paymentId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const [{ token, paymentId }, query] = await Promise.all([params, searchParams]);
  const today = todayISO();
  const secret = getSessionSecret();
  const verified = verifyPatientToken(token, secret, today);
  if (!verified) return <HubShell><InvalidLinkCard /></HubShell>;

  // SELECT * porque `social_name` (migração 2026-09-16) pode ainda não existir.
  const [patient] = await sql<Pick<Patient, "id" | "name" | "phone" | "social_name">>`
    SELECT * FROM patients WHERE id = ${verified.patientId}`;
  if (!patient) return <HubShell><InvalidLinkCard /></HubShell>;

  const portalPath = `/p/${token}`;
  const clinic = await hubClinic();
  if (await portalLocked(patient, secret, today)) {
    return (
      <HubShell clinic={clinic.name}>
        <PinGate token={token} redirectTo={`${portalPath}/recibos/${paymentId}`} error={query.erro === "pin"} />
      </HubShell>
    );
  }

  const recibo = await loadRecibo(Number(paymentId)).catch(() => null);
  if (!recibo || recibo.payment.patient_id !== patient.id || recibo.payment.status !== "pago") {
    return (
      <HubShell clinic={clinic.name} firstName={patientFirstName(patient)}>
        <UnavailableCard backHref={portalPath} />
      </HubShell>
    );
  }

  const paidAt = (recibo.payment.paid_at ?? recibo.payment.due_date).slice(0, 10);

  return (
    <HubShell
      clinic={clinic.name}
      heading={`Recibo nº ${recibo.payment.id}`}
      subheading={`${moneyBR(recibo.payment.amount_cents)} · recebido em ${fmtDate(paidAt)}`}
      wide
    >
      {/* No celular, Voltar e Imprimir dividem a linha meio a meio. */}
      <div className="no-print mb-5 flex items-center justify-between gap-3 [&>*]:flex-1 sm:flex-wrap sm:[&>*]:flex-none">
        <Link href={portalPath} className="btn btn-outline">
          ← Voltar ao portal
        </Link>
        <PrintButton />
      </div>

      <ReciboSheet {...recibo} />
    </HubShell>
  );
}
