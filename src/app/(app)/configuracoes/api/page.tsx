import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import type { ApiKey } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createApiKeyAction, toggleApiKeyAction } from "@/lib/actions-admin";
import { fmtDate } from "@/lib/format";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { AddPanel } from "@/components/financeiro/add-panel";
import { Flash } from "@/components/financeiro/flash";
import { CopyButton } from "./copy-button";

const ENDPOINTS: readonly { method: "GET" | "POST"; path: string; description: string }[] = [
  { method: "GET", path: "/api/v1/patients?q=", description: "Lista pacientes (busca opcional por nome, CPF ou telefone)" },
  { method: "POST", path: "/api/v1/patients", description: "Cria paciente — JSON { name, cpf?, phone?, email?, insurance?, birth_date? }" },
  { method: "GET", path: "/api/v1/appointments?date=AAAA-MM-DD", description: "Lista agendamentos por dia (ou ?from=&to= para intervalo)" },
  { method: "POST", path: "/api/v1/appointments", description: "Cria agendamento — JSON { patient_id, professional_id, date, start_time, duration?, procedure? }" },
  { method: "GET", path: "/api/v1/professionals", description: "Lista profissionais ativos" },
];

export default async function ApiSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ nova?: string; erro?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");
  const { nova, erro } = await searchParams;

  const keys = await sql<ApiKey>`SELECT * FROM api_keys ORDER BY id DESC`;

  return (
    <>
      <PageHeader
        title="API pública"
        subtitle="Integre outros sistemas ao Renova via REST"
        action={
          <Link href="/configuracoes" className="btn btn-outline">
            ← Configurações
          </Link>
        }
      />

      {nova ? (
        <div className="card mb-6 border-clay-500/40 bg-gradient-to-br from-clay-50 to-white p-4 sm:p-5">
          <p className="text-[11px] font-bold text-clay-700">Nova chave criada</p>
          <p className="mt-1 text-sm text-pine-900/70">
            Copie agora — ela <strong>não será mostrada de novo</strong>.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* break-all: a chave é uma palavra só e, no celular, não cabe na largura. */}
            <code className="max-w-full min-w-0 rounded-lg border border-pine-900/10 bg-white px-3 py-2 font-mono text-sm font-semibold break-all">
              {nova}
            </code>
            <CopyButton value={nova} />
          </div>
        </div>
      ) : null}

      {erro === "label" ? <Flash tone="erro">Informe um nome para identificar a chave.</Flash> : null}

      <div className="grid grid-cols-1 items-start gap-8 *:min-w-0 xl:grid-cols-2">
        <section>
          <SectionTitle>Chaves de acesso</SectionTitle>
          {keys.length === 0 ? (
            <EmptyState title="Nenhuma chave criada ainda" hint="Crie uma chave para cada sistema que vai usar a API." />
          ) : (
            <div className="card divide-y divide-pine-900/5">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <p className={`truncate text-sm font-bold ${key.active ? "" : "text-pine-900/40 line-through"}`}>
                      {key.label}
                    </p>
                    <p className="text-xs text-pine-900/55">
                      <code className="font-mono">{key.key_prefix}…</code> · criada em {fmtDate(key.created_at.slice(0, 10))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`chip ${key.active ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-500"}`}>
                      {key.active ? "Ativa" : "Revogada"}
                    </span>
                    <form action={toggleApiKeyAction}>
                      <input type="hidden" name="id" value={key.id} />
                      <button type="submit" className="btn btn-ghost px-2.5 py-1 text-xs">
                        {key.active ? "Revogar" : "Reativar"}
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          <AddPanel label="Nova chave">
            <form
              action={createApiKeyAction}
              className="flex flex-col gap-3 border-t border-pine-900/10 p-4 sm:flex-row sm:flex-wrap sm:items-end sm:p-5"
            >
              <div className="flex-1 sm:min-w-56">
                <label className="label" htmlFor="key-label">
                  Nome da chave *
                </label>
                <input
                  className="input"
                  id="key-label"
                  name="label"
                  required
                  autoComplete="off"
                  placeholder="Ex.: site institucional, n8n, Zapier…"
                />
              </div>
              <button type="submit" className="btn btn-primary justify-center">
                Gerar chave
              </button>
            </form>
          </AddPanel>
        </section>

        <section>
          <SectionTitle>Como usar</SectionTitle>
          <div className="card p-4 sm:p-5">
            <p className="text-sm text-pine-900/70">
              Todas as requisições usam o header <code className="font-mono text-xs">Authorization: Bearer rnv_…</code> e
              retornam JSON.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-pine-950 p-4 font-mono text-xs text-pine-100">
              {`curl https://renovaapp.vercel.app/api/v1/patients \\\n  -H "Authorization: Bearer rnv_SUA_CHAVE"`}
            </pre>
            {/* No celular cada endpoint vira um bloco: método e caminho no alto, descrição embaixo. */}
            <div className="mt-4 sm:overflow-x-auto max-sm:-mx-4">
              <table className="table-base table-stack">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((endpoint) => (
                    <tr key={`${endpoint.method} ${endpoint.path}`}>
                      <td className="td-primary sm:whitespace-nowrap">
                        <span className="chip mr-2 bg-pine-100 text-pine-800">{endpoint.method}</span>
                        <code className="font-mono text-xs break-all">{endpoint.path}</code>
                      </td>
                      <td className="text-pine-900/70 max-sm:!block max-sm:!text-left max-sm:text-sm">{endpoint.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
