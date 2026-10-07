import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { ReciboSheet, loadRecibo } from "@/components/financeiro/recibo-sheet";

/** Recibo de um pagamento recebido, para imprimir (sessão exigida pelo layout). */
export default async function ReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const payId = Number(paymentId);
  if (!Number.isFinite(payId)) notFound();

  const recibo = await loadRecibo(payId);
  if (!recibo) notFound();

  if (recibo.payment.status !== "pago") {
    return (
      <div className="card mx-auto max-w-md p-6 text-center">
        <p className="font-display text-lg font-semibold text-pine-950">Recibo indisponível</p>
        <p className="mt-2 text-sm text-pine-900/70">Recibo disponível só para pagamento recebido.</p>
        <Link href="/financeiro" className="btn btn-outline mt-5">
          ← Voltar ao financeiro
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
        <Link href="/financeiro" className="btn btn-outline">
          ← Voltar ao financeiro
        </Link>
        <PrintButton />
      </div>

      <ReciboSheet {...recibo} />
    </>
  );
}
