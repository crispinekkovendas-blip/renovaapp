import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { addDaysISO, fmtDate, todayISO } from "@/lib/format";
import { medicationStats } from "@/lib/receituario";
import { listIssuedPrescriptions, rxScope } from "@/lib/receituario-db";
import { EmptyState, PageHeader } from "@/components/ui";
import { ReceiptChip } from "@/components/receituario/rx-ui";

/**
 * Receituário › Mais receitados: o que o médico mais prescreve, para quantos
 * pacientes e com quais posologias. É o mesmo dado do "Seus mais receitados"
 * do compositor, visto inteiro — bom para conferir padrões e decidir o que
 * vale virar modelo. Cada medicamento leva ao histórico filtrado por ele.
 */

const PERIODS: ReadonlyArray<{ key: string; label: string; days: number | null }> = [
  { key: "90", label: "Últimos 90 dias", days: 90 },
  { key: "365", label: "Último ano", days: 365 },
  { key: "tudo", label: "Tudo", days: null },
];

export default async function MaisReceitadosPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const session = await requireRole("admin", "profissional");
  const { periodo } = await searchParams;
  const period = PERIODS.find((p) => p.key === periodo) ?? PERIODS[1];
  const from = period.days ? addDaysISO(todayISO(), -period.days) : null;
  const rxs = await listIssuedPrescriptions({ professionalId: rxScope(session), from, limit: 3000 });
  const stats = medicationStats(rxs);
  const max = stats[0]?.count ?? 1;

  return (
    <>
      <PageHeader
        title="Mais receitados"
        subtitle={`${rxs.length} receita${rxs.length === 1 ? "" : "s"} no período${session.role === "admin" ? " · clínica toda" : ""}`}
        action={
          <Link href="/configuracoes/modelos" className="btn btn-ghost">
            Personalizar modelos
          </Link>
        }
      />

      <nav aria-label="Período" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => {
          const on = p.key === period.key;
          return (
            <Link
              key={p.key}
              href={p.key === "365" ? "/receituario/mais-receitados" : `/receituario/mais-receitados?periodo=${p.key}`}
              aria-current={on ? "page" : undefined}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                on ? "bg-pine-900 text-white" : "bg-pine-50 text-pine-900/70 hover:bg-pine-100"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </nav>

      {stats.length === 0 ? (
        <div className="card p-3 sm:p-5">
          <EmptyState title="Nenhuma receita no período" hint="Escolha um período maior ou emita a primeira receita." />
        </div>
      ) : (
        <ol className="card divide-y divide-pine-900/5 overflow-hidden">
          {stats.map((stat, index) => (
            <li key={stat.name} className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="w-6 shrink-0 text-right font-mono text-xs text-pine-900/40">{index + 1}</span>
                <Link
                  href={`/receituario/historico?med=${encodeURIComponent(stat.name)}`}
                  className="min-w-0 font-bold text-pine-950 hover:text-pine-600"
                >
                  {stat.name}
                </Link>
                {stat.receipt !== "simples" ? <ReceiptChip kind={stat.receipt} /> : null}
                {stat.continuous ? <span className="chip bg-sky-100 text-sky-800">Uso contínuo</span> : null}
                <span className="ml-auto text-xs text-pine-900/55">
                  <b className="text-pine-950">{stat.count}</b> receita{stat.count === 1 ? "" : "s"} · {stat.patients} paciente
                  {stat.patients === 1 ? "" : "s"} · última {fmtDate(stat.lastIssuedAt)}
                </span>
              </div>
              <div className="mt-1.5 ml-9 h-1.5 rounded-full bg-pine-900/5" aria-hidden>
                <div className="h-full rounded-full bg-pine-500" style={{ width: `${Math.max(4, (stat.count / max) * 100)}%` }} />
              </div>
              {stat.posologies.length ? (
                <ul className="mt-1.5 ml-9 space-y-0.5 text-xs text-pine-900/65">
                  {stat.posologies.map((p) => (
                    <li key={p.text}>
                      {p.text} <span className="text-pine-900/40">· {p.count}×</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
