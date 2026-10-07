import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import type { Professional, Schedule } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { addScheduleAction, deleteScheduleAction } from "@/lib/actions-booking";
import { PageHeader, SectionTitle } from "@/components/ui";
import { Flash } from "@/components/financeiro/flash";

/** Índice = `weekday` do banco (0 = domingo, como Date.getDay). */
const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
] as const;

export default async function SchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");
  const { erro } = await searchParams;

  const [professionals, schedules] = await Promise.all([
    sql<Pick<Professional, "id" | "name" | "color" | "active">>`
      SELECT id, name, color, active FROM professionals ORDER BY active DESC, name`,
    sql<Schedule>`SELECT * FROM schedules ORDER BY professional_id, weekday, start_time`,
  ]);

  return (
    <>
      <Link
        href="/configuracoes"
        className="mb-1 inline-flex min-h-11 items-center text-xs font-bold text-pine-600 hover:underline sm:mb-2 sm:min-h-0"
      >
        ← Configurações
      </Link>
      <PageHeader
        title="Horários de atendimento"
        subtitle="Estas janelas alimentam o agendamento online público em /agendar"
      />

      {erro === "campos" ? (
        <Flash tone="erro">Verifique os campos: o horário final precisa ser depois do inicial.</Flash>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-8 *:min-w-0 xl:grid-cols-2">
        {professionals.map((prof) => {
          const rows = schedules.filter((s) => s.professional_id === prof.id);
          return (
            <section key={prof.id}>
              <SectionTitle>
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: prof.color }} />
                  {prof.name}
                  {!prof.active ? (
                    <span className="chip bg-stone-200 text-stone-500">inativo</span>
                  ) : null}
                </span>
              </SectionTitle>

              {/* No celular cada janela é uma linha só: dia e horário à esquerda, Remover à direita. */}
              <div className="card overflow-hidden sm:overflow-x-auto">
                <table className="table-base table-stack">
                  <thead>
                    <tr>
                      <th>Dia</th>
                      <th>Início</th>
                      <th>Fim</th>
                      <th>Duração</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="max-sm:flex max-sm:items-center max-sm:gap-3">
                        <td className="td-primary font-semibold max-sm:min-w-0 max-sm:flex-1 max-sm:pb-0">
                          {WEEKDAYS[row.weekday]}
                          <span className="block text-sm font-normal text-pine-900/65 sm:hidden">
                            {row.start_time}–{row.end_time} · {row.slot_minutes} min
                          </span>
                        </td>
                        <td className="text-pine-900/70 max-sm:hidden">{row.start_time}</td>
                        <td className="text-pine-900/70 max-sm:hidden">{row.end_time}</td>
                        <td className="text-pine-900/70 max-sm:hidden">{row.slot_minutes} min</td>
                        <td className="td-actions text-right max-sm:w-auto max-sm:shrink-0 max-sm:pt-0">
                          <form action={deleteScheduleAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button type="submit" className="btn btn-ghost px-2.5 py-1 text-xs">
                              Remover
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center text-sm text-pine-900/50 max-sm:!block max-sm:!text-left">
                          Sem janelas — este profissional não aparece no agendamento online.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <form
                action={addScheduleAction}
                className="card mt-3 grid grid-cols-2 gap-3 p-4 *:min-w-0 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto] xl:grid-cols-[1.4fr_1fr_1fr]"
              >
                <input type="hidden" name="professional_id" value={prof.id} />
                {/* No celular: dia na linha toda, início e fim lado a lado, duração e Adicionar embaixo.
                    No xl são duas colunas na página, e cinco campos não cabem numa linha: vão em duas. */}
                <div className="col-span-2 sm:col-span-1">
                  <label className="label" htmlFor={`weekday-${prof.id}`}>
                    Dia
                  </label>
                  <select className="input" id={`weekday-${prof.id}`} name="weekday" defaultValue="1">
                    {WEEKDAYS.map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor={`start-${prof.id}`}>
                    Início
                  </label>
                  <input className="input" type="time" id={`start-${prof.id}`} name="start_time" defaultValue="08:00" required />
                </div>
                <div>
                  <label className="label" htmlFor={`end-${prof.id}`}>
                    Fim
                  </label>
                  <input className="input" type="time" id={`end-${prof.id}`} name="end_time" defaultValue="18:00" required />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="label" htmlFor={`slot-${prof.id}`}>
                    Duração
                  </label>
                  <select className="input" id={`slot-${prof.id}`} name="slot_minutes" defaultValue="30">
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min</option>
                  </select>
                </div>
                <div className="col-span-2 flex items-end sm:col-span-1 xl:col-span-2">
                  <button type="submit" className="btn btn-primary w-full justify-center">
                    Adicionar
                  </button>
                </div>
              </form>
            </section>
          );
        })}
      </div>
    </>
  );
}
