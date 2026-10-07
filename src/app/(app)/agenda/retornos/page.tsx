import Link from "next/link";
import { sql } from "@/lib/db";
import { dismissRecallAction } from "@/lib/actions";
import { publicBaseUrl } from "@/lib/marketing-stats";
import { fmtDate, todayISO, waLink } from "@/lib/format";
import { bookingUrlFor, recallMessage, recallStatus, recallWindow } from "@/lib/recall";
import { EmptyState, PageHeader } from "@/components/ui";
import { Feedback } from "@/components/feedback";

/**
 * Retornos: quem saiu do consultório com "retorno em N dias" e ainda não
 * marcou. Janela de 30 dias para trás (atrasados, em vermelho) e 30 para a
 * frente; pacientes com consulta futura já marcada não aparecem. Cada linha:
 * WhatsApp com a mensagem pronta (link do agendamento online já com o
 * profissional), "Agendar" na agenda com o paciente preenchido e "Já marcou /
 * ignorar". Sem as colunas (migração 2026-09-09), a página avisa.
 */

interface RecallRow {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string | null;
  professional_id: number;
  professional_name: string;
  professional_color: string;
  date: string;
  return_days: number | null;
  return_due: string;
  return_reminded_at: string | null;
}

export default async function RetornosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { ok, erro } = await searchParams;
  const today = todayISO();
  const { from, to } = recallWindow(today);

  // Um retorno por paciente (o atendimento mais recente com prazo); depois ordenado pela data do retorno.
  // Sem as colunas da migração a consulta falha: vira null e a página avisa.
  const [found, base] = await Promise.all([
    sql<RecallRow>`
      SELECT DISTINCT ON (e.patient_id)
        e.id, e.patient_id, p.name AS patient_name, p.phone AS patient_phone,
        e.professional_id, pr.name AS professional_name, pr.color AS professional_color,
        e.date, e.return_days, e.return_due, e.return_reminded_at
      FROM encounters e
      JOIN patients p ON p.id = e.patient_id
      JOIN professionals pr ON pr.id = e.professional_id
      WHERE e.return_due IS NOT NULL AND e.return_due >= ${from} AND e.return_due <= ${to}
        AND NOT EXISTS (
          SELECT 1 FROM appointments a
          WHERE a.patient_id = e.patient_id AND a.date >= ${today} AND a.status IN ('agendado', 'confirmado'))
      ORDER BY e.patient_id, e.date DESC, e.id DESC`.catch(() => null),
    publicBaseUrl(),
  ]);
  const ready = found !== null;
  const rows: RecallRow[] = found ? [...found] : [];
  rows.sort((a, b) => a.return_due.localeCompare(b.return_due) || a.patient_name.localeCompare(b.patient_name));
  const pending = rows.filter((row) => !row.return_reminded_at);
  const handled = rows.filter((row) => row.return_reminded_at);
  const overdue = pending.filter((row) => row.return_due < today).length;

  const renderRow = (row: RecallRow) => {
    const status = recallStatus(row.return_due, today);
    const firstName = row.patient_name.split(/\s+/)[0];
    const wa = waLink(
      row.patient_phone,
      recallMessage({
        firstName,
        professional: row.professional_name,
        bookingUrl: bookingUrlFor(base, row.professional_id),
      })
    );
    return (
      <div key={row.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 sm:items-center sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold break-words text-pine-950">
            <Link href={`/pacientes/${row.patient_id}`} className="hover:text-pine-600">
              {row.patient_name}
            </Link>
          </p>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-pine-900/55">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.professional_color }} />
            {row.professional_name} · atendimento em {fmtDate(row.date)}
            {row.return_days ? ` · retorno em ${row.return_days} dias` : ""}
            {row.patient_phone ? ` · ${row.patient_phone}` : ""}
          </p>
          {row.return_reminded_at ? (
            <p className="mt-0.5 text-xs text-pine-900/45">
              Avisado ou tratado em {fmtDate(row.return_reminded_at.slice(0, 10))}
            </p>
          ) : null}
        </div>
        {/* No celular a data fica à direita do nome, e os botões descem para a linha de baixo. */}
        <div className="shrink-0 text-right sm:w-36 sm:text-left">
          <p className={`text-sm font-bold ${status.overdue ? "text-rose-700" : "text-pine-950"}`}>
            {fmtDate(row.return_due)}
          </p>
          <p className={`text-xs ${status.overdue ? "font-semibold text-rose-700" : "text-pine-900/55"}`}>
            {status.label}
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 *:flex-1 sm:w-auto sm:shrink-0 sm:*:flex-none">
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              WhatsApp
            </a>
          ) : (
            <span className="text-xs text-pine-900/45">Sem telefone</span>
          )}
          <Link
            href={`/agenda/novo?patient=${row.patient_id}&prof=${row.professional_id}`}
            className="btn btn-primary"
          >
            Agendar
          </Link>
          {row.return_reminded_at ? null : (
            <form action={dismissRecallAction} className="flex">
              <input type="hidden" name="id" value={row.id} />
              <button
                type="submit"
                className="btn btn-ghost w-full"
                title="Tira desta lista sem criar agendamento (ex.: já marcou por telefone, ou não vai voltar)"
              >
                Já marcou / ignorar
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Retornos"
        subtitle="Quem ainda não marcou o retorno recomendado no atendimento"
        action={
          <Link href="/agenda" className="btn btn-ghost">
            Ver agenda
          </Link>
        }
      />

      {ok === "tratado" ? (
        <Feedback tone="ok" className="mb-4">
          Retorno marcado como tratado.
        </Feedback>
      ) : null}
      {erro === "migracao" || !ready ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          Os retornos dependem da migração 2026-09-09 (colunas <code>return_*</code> em encounters). Rode a
          migração no Supabase e volte aqui.
        </p>
      ) : null}

      {ready ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-pine-900/60">
          <span className="chip bg-pine-100 text-pine-800">{pending.length} a marcar</span>
          {overdue > 0 ? (
            <span className="chip bg-rose-100 text-rose-700">
              {overdue} atrasado{overdue === 1 ? "" : "s"}
            </span>
          ) : null}
          <span className="basis-full sm:ml-1 sm:basis-auto">
            Quem ativou lembretes no portal recebe um aviso automático três dias antes da data. Para os outros,
            mande o WhatsApp: o link já abre o agendamento com o profissional certo.
          </span>
        </div>
      ) : null}

      <div className="card">
        {!ready ? (
          <div className="p-3 sm:p-5">
            <EmptyState title="Retornos indisponíveis por enquanto." hint="Falta rodar a migração 2026-09-09." />
          </div>
        ) : pending.length === 0 ? (
          <div className="p-3 sm:p-5">
            <EmptyState
              title="Ninguém com retorno pendente."
              hint='Os retornos nascem no prontuário: ao registrar um atendimento, escolha "Retorno em" 7, 15, 30, 60, 90 ou 180 dias.'
            />
          </div>
        ) : (
          <div className="divide-y divide-pine-900/5">{pending.map(renderRow)}</div>
        )}
      </div>

      {handled.length > 0 ? (
        <details className="card mt-4 overflow-hidden">
          <summary className="cursor-pointer px-4 py-3.5 sm:px-5 text-sm font-bold text-pine-700 transition-colors hover:bg-pine-50">
            Já avisados ou tratados, ainda sem consulta marcada ({handled.length})
          </summary>
          <div className="divide-y divide-pine-900/5 border-t border-pine-900/10">{handled.map(renderRow)}</div>
        </details>
      ) : null}
    </>
  );
}
