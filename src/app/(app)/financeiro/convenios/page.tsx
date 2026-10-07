import Link from "next/link";
import { sql } from "@/lib/db";
import { fmtDate, fmtMonthLong, moneyBR, monthISO } from "@/lib/format";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { MonthNav } from "@/components/financeiro/month-nav";
import { groupBy, monthFromParam, plural, sumBy } from "@/components/financeiro/month-math";

interface InsuranceAppointment {
  id: number;
  date: string;
  start_time: string;
  procedure: string;
  price_cents: number;
  patient_name: string;
  insurance: string;
  insurance_number: string | null;
}

export default async function InsuranceBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const params = await searchParams;
  const month = monthFromParam(params.mes, monthISO());

  const rows = await sql<InsuranceAppointment>`
    SELECT a.id, a.date, a.start_time, a.procedure, a.price_cents,
      p.name AS patient_name, p.insurance, p.insurance_number
    FROM appointments a
    JOIN patients p ON p.id = a.patient_id
    WHERE substr(a.date,1,7) = ${month} AND a.status = 'concluido'
      AND p.insurance IS NOT NULL AND p.insurance <> 'Particular'
    ORDER BY p.insurance, a.date, a.start_time`;

  // O ORDER BY já vem por convênio: os grupos saem em ordem alfabética.
  const groups = groupBy(rows, (row) => row.insurance);
  const grandTotal = sumBy(rows, (row) => row.price_cents);

  return (
    <>
      <PageHeader
        title="Faturamento de convênios"
        subtitle={`${fmtMonthLong(month)} · ${plural(rows.length, "atendimento")} · ${moneyBR(grandTotal)}`}
        action={
          <MonthNav
            basePath="/financeiro/convenios"
            month={month}
            before={
              // No celular "← Financeiro" some: as abas Pagamentos/Convênios logo acima já fazem esse caminho.
              <Link href="/financeiro" className="btn btn-outline justify-center max-sm:hidden">
                ← Financeiro
              </Link>
            }
          />
        }
      />

      {groups.size === 0 ? (
        <EmptyState
          title="Nenhum atendimento de convênio neste mês"
          hint="Somente consultas concluídas de pacientes com convênio (diferente de Particular) entram no faturamento."
        />
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([insurance, items]) => {
            const subtotal = sumBy(items, (item) => item.price_cents);
            return (
              <section key={insurance}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle>{insurance}</SectionTitle>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
                    <span className="min-w-0 text-sm font-bold text-pine-900/70">
                      {plural(items.length, "atendimento")} · {moneyBR(subtotal)}
                    </span>
                    <a
                      href={`/api/v1/convenios/csv?mes=${month}&convenio=${encodeURIComponent(insurance)}`}
                      className="btn btn-primary shrink-0 px-3 py-1.5 text-xs"
                      aria-label={`Exportar CSV de ${insurance}`}
                    >
                      Exportar CSV
                    </a>
                  </div>
                </div>
                {/* No celular cada atendimento vira um cartão com o paciente no alto. */}
                <div className="card overflow-hidden sm:overflow-x-auto">
                  <table className="table-base table-stack">
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Paciente</th>
                        <th>Carteirinha</th>
                        <th>Procedimento</th>
                        <th className="text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="max-sm:flex max-sm:flex-col">
                          <td data-label="Data" className="whitespace-nowrap text-pine-900/70">
                            {fmtDate(item.date)} · {item.start_time}
                          </td>
                          <td className="td-primary font-semibold break-words max-sm:-order-1">{item.patient_name}</td>
                          <td data-label="Carteirinha" className="break-all text-pine-900/70">
                            {item.insurance_number ?? "—"}
                          </td>
                          <td data-label="Procedimento" className="text-pine-900/70">
                            {item.procedure}
                          </td>
                          <td data-label="Valor" className="whitespace-nowrap text-right font-bold max-sm:text-base">
                            {moneyBR(item.price_cents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
          <p className="text-xs text-pine-900/45">Exportação TISS XML (padrão ANS) — em breve.</p>
        </div>
      )}
    </>
  );
}
