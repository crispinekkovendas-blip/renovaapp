import Link from "next/link";
import { sql } from "@/lib/db";
import { moneyBR } from "@/lib/format";
import { parseDraft } from "@/lib/whatsapp/triage";
import type { Stage } from "@/lib/whatsapp/flow";
import { EmptyState, PageHeader } from "@/components/ui";
import { Feedback } from "@/components/feedback";
import { AutoRefresh } from "@/components/whatsapp/auto-refresh";
import { StageChip, fmtWhen } from "@/components/whatsapp/stage-chip";

/**
 * Conversas do WhatsApp, na ordem em que pedem alguém: urgências, consultas
 * pagas esperando o médico, consultas em andamento, depois o que o robô ainda
 * está conduzindo (triagem, revisão, pagamento). Encerrados ficam no fim.
 */

interface Row {
  id: number;
  stage: Stage;
  triage: string;
  bot_paused: number;
  last_error: string | null;
  price_cents: number;
  updated_at: string;
  phone: string;
  contact_name: string | null;
  simulated: number;
  unread: number;
  patient_id: number | null;
  patient_name: string | null;
  last_message_at: string | null;
}

const GROUPS: ReadonlyArray<{ title: string; hint: string; stages: Stage[] }> = [
  { title: "Urgências", hint: "O robô orientou procurar emergência — confira e fale com o paciente.", stages: ["urgente"] },
  { title: "Pagas — aguardando o médico", hint: "Triagem pronta e paga. Abra e inicie a consulta.", stages: ["pago"] },
  { title: "Em consulta", hint: "", stages: ["consulta"] },
  { title: "Aguardando pagamento", hint: "", stages: ["pagamento", "revisao"] },
  { title: "Em triagem com o robô", hint: "", stages: ["consentimento", "triagem"] },
];

export default async function WhatsappPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { ok, erro } = await searchParams;
  const rows = await sql<Row>`
    SELECT c.id, c.stage, c.triage, c.bot_paused, c.last_error, c.price_cents, c.updated_at,
      t.phone, t.contact_name, t.simulated, t.unread, t.patient_id, p.name AS patient_name, t.last_message_at
    FROM wa_cases c
    JOIN wa_threads t ON t.id = c.thread_id
    LEFT JOIN patients p ON p.id = t.patient_id
    WHERE c.stage NOT IN ('encerrado', 'recusado') OR c.updated_at > now() - interval '7 days'
    ORDER BY c.updated_at DESC
    LIMIT 300`.catch(() => null);

  const renderRow = (row: Row) => {
    const draft = parseDraft(row.triage);
    const name = row.patient_name || draft.nome || row.contact_name || row.phone;
    return (
      <Link
        key={row.id}
        href={`/whatsapp/${row.id}`}
        className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-pine-50 sm:items-center sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold break-words text-pine-950">
            {name}
            {row.simulated ? <span className="chip bg-slate-100 text-slate-600">simulação</span> : null}
            {row.unread > 0 ? <span className="chip bg-pine-700 text-white">{row.unread} nova{row.unread === 1 ? "" : "s"}</span> : null}
            {row.bot_paused ? <span className="chip bg-clay-100 text-clay-800">robô pausado</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-pine-900/60">
            {draft.queixa ? `${draft.queixa.slice(0, 120)}${draft.queixa.length > 120 ? "…" : ""}` : "Sem queixa registrada ainda"}
          </p>
          {draft.alertas?.length ? (
            <p className="mt-0.5 text-xs font-semibold text-rose-700">⚠ {draft.alertas.slice(0, 2).join(" · ")}</p>
          ) : null}
          {row.last_error ? <p className="mt-0.5 text-xs text-clay-800">{row.last_error}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          <StageChip stage={row.stage} />
          <p className="mt-1 text-xs text-pine-900/50">
            {fmtWhen(row.last_message_at ?? row.updated_at)}
            {row.price_cents ? ` · ${moneyBR(row.price_cents)}` : ""}
          </p>
        </div>
      </Link>
    );
  };

  const open = rows ?? [];
  const closed = open.filter((r) => r.stage === "encerrado" || r.stage === "recusado");

  return (
    <>
      <AutoRefresh seconds={10} />
      <PageHeader
        title="WhatsApp"
        subtitle="Triagem automática, pagamento e teleconsulta pelo WhatsApp da clínica"
        action={
          <Link href="/whatsapp/simulador" className="btn btn-ghost">
            Testar no simulador
          </Link>
        }
      />

      {ok === "encerrado" ? (
        <Feedback tone="ok" className="mb-4">
          Atendimento encerrado.
        </Feedback>
      ) : null}
      {erro === "caso" ? (
        <Feedback tone="erro" className="mb-4">
          Esse atendimento não existe mais.
        </Feedback>
      ) : null}

      {rows === null ? (
        <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          O atendimento pelo WhatsApp depende da migração <code>2026-10-29-whatsapp.sql</code>. Rode-a no Supabase e volte
          aqui.
        </p>
      ) : open.length === 0 ? (
        <div className="card p-3 sm:p-5">
          <EmptyState
            title="Nenhuma conversa ainda."
            hint="Quando um paciente mandar mensagem para o número da clínica, ela aparece aqui. Para ver o fluxo inteiro agora, use o Simulador."
          />
        </div>
      ) : (
        <div className="space-y-4">
          {GROUPS.map((group) => {
            const items = open.filter((r) => group.stages.includes(r.stage));
            if (!items.length) return null;
            return (
              <section key={group.title} className="card overflow-hidden">
                <header className="border-b border-pine-900/10 px-4 py-3 sm:px-5">
                  <h2 className="text-sm font-bold text-pine-950">
                    {group.title} <span className="font-normal text-pine-900/50">({items.length})</span>
                  </h2>
                  {group.hint ? <p className="text-xs text-pine-900/55">{group.hint}</p> : null}
                </header>
                <div className="divide-y divide-pine-900/5">{items.map(renderRow)}</div>
              </section>
            );
          })}
          {closed.length ? (
            <details className="card overflow-hidden">
              <summary className="cursor-pointer px-4 py-3.5 text-sm font-bold text-pine-700 transition-colors hover:bg-pine-50 sm:px-5">
                Encerrados nos últimos 7 dias ({closed.length})
              </summary>
              <div className="divide-y divide-pine-900/5 border-t border-pine-900/10">{closed.map(renderRow)}</div>
            </details>
          ) : null}
        </div>
      )}
    </>
  );
}
