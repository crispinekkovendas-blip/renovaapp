import { sql } from "@/lib/db";
import { fmtMonthLong, moneyBR, monthISO } from "@/lib/format";
import { EmptyState, PageHeader, SectionTitle, StatCard } from "@/components/ui";
import { MonthNav } from "@/components/financeiro/month-nav";
import { barWidth, monthFromParam, monthIndicators, percent, plural, sumBy } from "@/components/financeiro/month-math";

interface ProductionRow {
  id: number;
  name: string;
  color: string;
  agendadas: number;
  concluidas: number;
  faltas: number;
  receita: number;
}

interface InsuranceRow {
  insurance: string;
  total: number;
}

interface SourceRow {
  source: string;
  n: number;
}

const SOURCE_LABEL: Readonly<Record<string, string>> = {
  interno: "Recepção / interno",
  online: "Agendamento online",
  api: "API",
};

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 w-full min-w-24 rounded-full bg-pine-100">
      <div className="h-2 rounded-full bg-pine-500" style={{ width: `${barWidth(value, max)}%` }} />
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const params = await searchParams;
  const month = monthFromParam(params.mes, monthISO());

  // Agregados independentes do mesmo mês: em paralelo, não em fila. As duas
  // contagens de consultas viraram um SELECT só (mesmos filtros, via FILTER).
  const [[counts], [{ receita }], production, byInsurance, bySource] = await Promise.all([
    sql<{ consultas: number; concluidas: number; faltas: number }>`
      SELECT
        COUNT(*) FILTER (WHERE status <> 'cancelado')::int AS consultas,
        COUNT(*) FILTER (WHERE status = 'concluido')::int AS concluidas,
        COUNT(*) FILTER (WHERE status = 'faltou')::int AS faltas
      FROM appointments WHERE substr(date,1,7) = ${month}`,
    sql<{ receita: number }>`
      SELECT COALESCE(SUM(amount_cents),0)::int AS receita FROM payments
      WHERE status = 'pago' AND substr(COALESCE(paid_at,''),1,7) = ${month}`,
    sql<ProductionRow>`
      SELECT pr.id, pr.name, pr.color,
        COUNT(a.id) FILTER (WHERE a.status <> 'cancelado')::int AS agendadas,
        COUNT(a.id) FILTER (WHERE a.status = 'concluido')::int AS concluidas,
        COUNT(a.id) FILTER (WHERE a.status = 'faltou')::int AS faltas,
        COALESCE(SUM(a.price_cents) FILTER (WHERE a.status = 'concluido'),0)::int AS receita
      FROM professionals pr
      LEFT JOIN appointments a ON a.professional_id = pr.id AND substr(a.date,1,7) = ${month}
      WHERE pr.active = 1
      GROUP BY pr.id, pr.name, pr.color
      ORDER BY receita DESC, pr.name`,
    sql<InsuranceRow>`
      SELECT COALESCE(p.insurance, 'Particular') AS insurance, COALESCE(SUM(pay.amount_cents),0)::int AS total
      FROM payments pay
      LEFT JOIN patients p ON p.id = pay.patient_id
      WHERE pay.status = 'pago' AND substr(COALESCE(pay.paid_at,''),1,7) = ${month}
      GROUP BY COALESCE(p.insurance, 'Particular')
      ORDER BY total DESC`,
    sql<SourceRow>`
      SELECT source, COUNT(*)::int AS n FROM appointments
      WHERE substr(date,1,7) = ${month}
      GROUP BY source ORDER BY n DESC`,
  ]);

  const { consultas, concluidas, faltas } = counts;
  const { noShowBase, noShowRate, ticket } = monthIndicators({ concluidas, faltas, receita });

  const maxReceita = Math.max(...production.map((r) => r.receita), 0);
  const maxInsurance = Math.max(...byInsurance.map((r) => r.total), 0);
  const totalSource = sumBy(bySource, (r) => r.n);

  return (
    <>
      <PageHeader title="Relatórios" subtitle={fmtMonthLong(month)} action={<MonthNav basePath="/relatorios" month={month} />} />

      {/* No celular os números curtos dividem a linha; os valores em reais, longos, ocupam a largura toda. */}
      <div className="grid grid-cols-2 gap-3 *:*:h-full sm:gap-4 xl:grid-cols-4">
        <div>
          <StatCard label="Consultas no mês" value={String(consultas)} hint={`${concluidas} concluídas`} />
        </div>
        <div>
          <StatCard
            label="Taxa de falta"
            value={`${noShowRate}%`}
            hint={`${plural(faltas, "falta")} em ${plural(noShowBase, "atendimento")}`}
            accent={noShowRate >= 20}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <StatCard label="Receita recebida" value={moneyBR(receita)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <StatCard label="Ticket médio" value={moneyBR(ticket)} hint="receita ÷ consultas concluídas" />
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <section>
          <SectionTitle>Produção por profissional</SectionTitle>
          {production.length === 0 ? (
            <EmptyState title="Nenhum profissional ativo" />
          ) : (
            // No celular cada profissional vira um cartão (nome no alto, números rotulados, barra embaixo).
            <div className="card overflow-hidden sm:overflow-x-auto">
              <table className="table-base table-stack">
                <thead>
                  <tr>
                    <th>Profissional</th>
                    <th className="text-right">Agendadas</th>
                    <th className="text-right">Concluídas</th>
                    <th className="text-right">Faltas</th>
                    <th className="text-right">Receita gerada</th>
                    <th className="w-40" />
                  </tr>
                </thead>
                <tbody>
                  {production.map((row) => (
                    <tr key={row.id}>
                      <td className="td-primary">
                        <span className="flex min-w-0 items-center gap-2 font-bold">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
                          <span className="min-w-0 break-words">{row.name}</span>
                        </span>
                      </td>
                      <td data-label="Agendadas" className="text-right text-pine-900/70">
                        {row.agendadas}
                      </td>
                      <td data-label="Concluídas" className="text-right font-semibold">
                        {row.concluidas}
                      </td>
                      <td data-label="Faltas" className="text-right text-pine-900/70">
                        {row.faltas}
                      </td>
                      <td data-label="Receita gerada" className="whitespace-nowrap text-right font-bold">
                        {moneyBR(row.receita)}
                      </td>
                      <td className="max-sm:pt-2">
                        <Bar value={row.receita} max={maxReceita} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid items-start gap-8 xl:grid-cols-2">
          <section>
            <SectionTitle>Receita por convênio</SectionTitle>
            {byInsurance.length === 0 ? (
              <EmptyState title="Nenhum recebimento no mês" />
            ) : (
              <div className="card overflow-hidden sm:overflow-x-auto">
                <table className="table-base table-stack">
                  <thead>
                    <tr>
                      <th>Convênio</th>
                      <th className="text-right">Recebido</th>
                      <th className="w-32" />
                    </tr>
                  </thead>
                  <tbody>
                    {byInsurance.map((row) => (
                      <tr key={row.insurance}>
                        <td className="td-primary font-semibold break-words">{row.insurance}</td>
                        <td data-label="Recebido" className="whitespace-nowrap text-right font-bold">
                          {moneyBR(row.total)}
                        </td>
                        <td className="max-sm:pt-2">
                          <Bar value={row.total} max={maxInsurance} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <SectionTitle>Origem dos agendamentos</SectionTitle>
            {bySource.length === 0 ? (
              <EmptyState title="Nenhum agendamento no mês" />
            ) : (
              <div className="card overflow-hidden sm:overflow-x-auto">
                <table className="table-base table-stack">
                  <thead>
                    <tr>
                      <th>Origem</th>
                      <th className="text-right">Agendamentos</th>
                      <th className="w-32" />
                    </tr>
                  </thead>
                  <tbody>
                    {bySource.map((row) => (
                      <tr key={row.source}>
                        <td className="td-primary font-semibold">{SOURCE_LABEL[row.source] ?? row.source}</td>
                        <td data-label="Agendamentos" className="text-right font-bold">
                          <span>
                            {row.n}
                            <span className="ml-1 text-xs font-normal text-pine-900/50">
                              ({percent(row.n, totalSource)}%)
                            </span>
                          </span>
                        </td>
                        <td className="max-sm:pt-2">
                          <Bar value={row.n} max={totalSource} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
