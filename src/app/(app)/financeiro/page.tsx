import Link from "next/link";
import { sql } from "@/lib/db";
import type { Patient, Payment } from "@/lib/db";
import { createPaymentAction } from "@/lib/actions";
import { fmtDate, fmtMonthLong, moneyBR, monthISO, PAYMENT_METHOD_LABEL, todayISO } from "@/lib/format";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { PaymentActionsCell } from "@/components/financeiro/payment-actions-cell";
import { MonthNav } from "@/components/financeiro/month-nav";
import { AddPanel } from "@/components/financeiro/add-panel";
import { Flash } from "@/components/financeiro/flash";
import { monthFromParam, summarizeMonth } from "@/components/financeiro/month-math";

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const month = monthFromParam(params.mes, monthISO());

  // Lançamentos do mês e pacientes do select não dependem um do outro.
  const [payments, patients] = await Promise.all([
    sql<Payment>`
      SELECT pay.*, p.name AS patient_name FROM payments pay
      LEFT JOIN patients p ON p.id = pay.patient_id
      WHERE substr(pay.due_date,1,7) = ${month} OR substr(COALESCE(pay.paid_at,''),1,7) = ${month}
      ORDER BY pay.due_date DESC, pay.id DESC`,
    sql<Pick<Patient, "id" | "name">>`SELECT id, name FROM patients ORDER BY name`,
  ]);
  const { received, pending } = summarizeMonth(payments, month);
  const backUrl = `/financeiro?mes=${month}`;

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle={fmtMonthLong(month)}
        action={<MonthNav basePath="/financeiro" month={month} />}
      />

      {params.erro === "campos" ? <Flash tone="erro">Informe descrição e um valor maior que zero.</Flash> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Recebido no mês" value={moneyBR(received)} />
        <StatCard label="Pendente (do mês)" value={moneyBR(pending)} accent={pending > 0} />
        <StatCard label="Lançamentos" value={String(payments.length)} />
      </div>

      <AddPanel label="Novo lançamento" className="mt-6">
        <form action={createPaymentAction} className="grid gap-3 border-t border-pine-900/10 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
          <div className="sm:col-span-2 xl:col-span-1">
            <label className="label" htmlFor="description">
              Descrição *
            </label>
            <input
              className="input"
              id="description"
              name="description"
              required
              placeholder="Consulta, exame, procedimento…"
              autoComplete="off"
              enterKeyHint="next"
            />
          </div>
          <div>
            <label className="label" htmlFor="pay-patient">
              Paciente
            </label>
            <select className="input" id="pay-patient" name="patient_id" defaultValue="">
              <option value="">—</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="amount">
              Valor (R$) *
            </label>
            <input
              className="input"
              id="amount"
              name="amount"
              required
              placeholder="150,00"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="next"
            />
          </div>
          <div>
            <label className="label" htmlFor="due_date">
              Vencimento
            </label>
            <input className="input" type="date" id="due_date" name="due_date" defaultValue={todayISO()} />
          </div>
          <div>
            <label className="label" htmlFor="pay-method">
              Forma de pagamento
            </label>
            <select className="input" id="pay-method" name="method" defaultValue="">
              <option value="">—</option>
              {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="pay-status">
              Situação
            </label>
            <select className="input" id="pay-status" name="status" defaultValue="pendente">
              <option value="pendente">Pendente</option>
              <option value="pago">Já pago</option>
            </select>
          </div>
          <div className="flex items-end">
            <button type="submit" className="btn btn-primary w-full">
              Lançar
            </button>
          </div>
        </form>
      </AddPanel>

      <div className="mt-6">
        {payments.length === 0 ? (
          <EmptyState title="Nenhum lançamento neste mês" hint="Os lançamentos aparecem aqui — inclusive os gerados ao concluir consultas." />
        ) : (
          // No celular cada lançamento vira um cartão: descrição no alto, valor em destaque, ações embaixo.
          <div className="card overflow-hidden sm:overflow-x-auto">
            <table className="table-base table-stack">
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Descrição</th>
                  <th>Paciente</th>
                  <th>Forma</th>
                  <th className="text-right">Valor</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  // flex-col no celular só para a descrição (td-primary) subir para o topo do cartão.
                  <tr key={payment.id} className="max-sm:flex max-sm:flex-col">
                    <td data-label="Vencimento" className="whitespace-nowrap text-pine-900/70">
                      {fmtDate(payment.due_date)}
                    </td>
                    <td className="td-primary font-semibold break-words max-sm:-order-1">{payment.description}</td>
                    <td data-label="Paciente" className="min-w-0 text-pine-900/70">
                      {payment.patient_id ? (
                        <Link href={`/pacientes/${payment.patient_id}`} className="min-w-0 truncate hover:text-pine-600">
                          {payment.patient_name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td data-label="Forma" className="text-pine-900/70">
                      {payment.method ? (PAYMENT_METHOD_LABEL[payment.method] ?? payment.method) : "—"}
                    </td>
                    <td data-label="Valor" className="whitespace-nowrap text-right font-bold max-sm:text-lg max-sm:text-pine-950">
                      {moneyBR(payment.amount_cents)}
                    </td>
                    <PaymentActionsCell
                      paymentId={payment.id}
                      status={payment.status}
                      paidAt={payment.paid_at}
                      defaultMethod={payment.method ?? "pix"}
                      backUrl={backUrl}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
