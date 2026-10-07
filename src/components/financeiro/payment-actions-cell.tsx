"use client";

import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { payPaymentAction } from "@/lib/actions";
import { PaymentBadge } from "@/components/ui";
import { Alert } from "@/components/alert";
import { fmtDate, PAYMENT_METHOD_LABEL } from "@/lib/format";
import type { PaymentStatus } from "@/lib/db";

interface PaymentState {
  status: PaymentStatus;
  paidAt: string | null;
}

export function PaymentActionsCell({
  paymentId,
  status,
  paidAt,
  defaultMethod,
  backUrl,
}: {
  paymentId: number;
  status: PaymentStatus;
  paidAt: string | null;
  defaultMethod: string;
  backUrl: string;
}) {
  const [optimistic, setOptimistic] = useOptimistic<PaymentState, PaymentState>(
    { status, paidAt },
    (_current, next) => next
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePay(formData: FormData) {
    setError(null);
    startTransition(async () => {
      setOptimistic({ status: "pago", paidAt: new Date().toISOString().slice(0, 10) });
      try {
        await payPaymentAction(formData);
      } catch (err) {
        unstable_rethrow(err);
        setError("Não foi possível confirmar o pagamento.");
      }
    });
  }

  return (
    <>
      {/* data-label/td-actions: no celular a tabela vira cartões (.table-stack). */}
      <td data-label="Situação">
        <div>
          <PaymentBadge status={optimistic.status} />
          {optimistic.status === "pago" && optimistic.paidAt ? (
            <span className="block text-[11px] text-pine-900/45">em {fmtDate(optimistic.paidAt)}</span>
          ) : null}
        </div>
      </td>
      <td className="td-actions text-right max-sm:flex-wrap">
        {optimistic.status === "pendente" ? (
          // No celular a forma de pagamento e o "Receber" dividem a linha, com 44px de altura (via .btn/.input).
          <form action={handlePay} className="flex items-center justify-end gap-1.5 max-sm:w-full max-sm:gap-2">
            <input type="hidden" name="id" value={paymentId} />
            <input type="hidden" name="back" value={backUrl} />
            <select
              name="method"
              aria-label="Forma de pagamento"
              className="input w-auto px-2 py-1 max-sm:min-w-0 max-sm:flex-1 sm:text-xs"
              defaultValue={defaultMethod}
            >
              {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary px-2.5 py-1 text-xs disabled:opacity-50 max-sm:flex-1 max-sm:justify-center max-sm:text-sm"
            >
              Receber
            </button>
          </form>
        ) : null}
        {optimistic.status === "pago" && !isPending ? (
          <Link
            href={`/financeiro/recibo/${paymentId}`}
            target="_blank"
            rel="noopener"
            className="btn btn-ghost px-2.5 py-1 text-xs max-sm:min-h-11 max-sm:px-4 max-sm:text-sm"
          >
            Recibo
          </Link>
        ) : null}
        {error ? <Alert>{error}</Alert> : null}
      </td>
    </>
  );
}
