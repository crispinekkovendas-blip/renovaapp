import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { addDaysISO, ageFrom, fmtDate, todayISO } from "@/lib/format";
import { continuousRenewals, rxSummary } from "@/lib/receituario";
import { listIssuedPrescriptions, listMyDrafts, pickPatients, rxScope } from "@/lib/receituario-db";
import { EmptyState, PageHeader } from "@/components/ui";
import { IconSearch } from "@/components/icons";
import { MedNames, ReceiptChip, SmallLink, rxLinks } from "@/components/receituario/rx-ui";

/**
 * Receituário › Nova receita: a porta de entrada para receitar sem passar
 * pela ficha. Escolhe-se o paciente (busca, ou os atendidos por último) e o
 * compositor abre já no receituário; ao lado, os rascunhos deixados pela
 * metade, as últimas receitas e o aviso de renovações vencendo.
 */
export default async function ReceituarioPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireRole("admin", "profissional");
  const q = ((await searchParams).q ?? "").trim().slice(0, 80);
  const today = todayISO();
  const [patients, drafts, rxs] = await Promise.all([
    pickPatients(q),
    listMyDrafts(session),
    listIssuedPrescriptions({ professionalId: rxScope(session), limit: 1000 }),
  ]);

  const renewals = continuousRenewals(rxs, today);
  const overdue = renewals.filter((r) => r.status === "vencida").length;
  const soon = renewals.filter((r) => r.status === "em_breve").length;
  const monthAgo = addDaysISO(today, -30);
  const issuedToday = rxs.filter((rx) => rx.issuedAt === today).length;
  const issuedMonth = rxs.filter((rx) => rx.issuedAt >= monthAgo).length;
  const recent = rxs.slice(0, 6);

  return (
    <>
      <PageHeader
        title="Receituário"
        subtitle="Escolha o paciente e monte a receita — ou continue de onde parou."
        action={
          <Link href="/receituario/historico" className="btn btn-ghost">
            Histórico de receitas
          </Link>
        }
      />

      {overdue + soon > 0 ? (
        <Link
          href="/receituario/renovacoes"
          className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-clay-200 bg-clay-50 px-4 py-3 text-sm transition-colors hover:bg-clay-100"
        >
          <span className="text-pine-950">
            <b>Uso contínuo:</b>{" "}
            {[
              overdue ? `${overdue} receita${overdue === 1 ? "" : "s"} vencida${overdue === 1 ? "" : "s"}` : null,
              soon ? `${soon} vence${soon === 1 ? "" : "m"} em breve` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <span className="font-bold text-pine-700">Ver renovações ›</span>
        </Link>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section className="card overflow-hidden">
          <header className="border-b border-pine-900/10 p-4 sm:px-5">
            <h2 className="mb-2 text-sm font-bold text-pine-950">Para quem é a receita?</h2>
            <form action="/receituario" className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pine-900/40" />
                <input
                  name="q"
                  type="search"
                  defaultValue={q}
                  autoComplete="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  aria-label="Buscar paciente"
                  placeholder="Nome, CPF ou telefone…"
                  className="input pl-9"
                />
              </div>
              <button type="submit" className="btn btn-primary shrink-0">
                Buscar
              </button>
            </form>
            <p className="mt-2 text-xs text-pine-900/55">
              {q ? (
                <>
                  Resultado para “{q}” ·{" "}
                  <Link href="/receituario" className="font-semibold text-pine-700 hover:underline">
                    limpar
                  </Link>
                </>
              ) : (
                "Atendidos por último"
              )}
            </p>
          </header>
          {patients.length === 0 ? (
            <div className="p-3 sm:p-5">
              <EmptyState
                title={q ? "Nenhum paciente encontrado" : "Ninguém atendido ainda"}
                hint={q ? "Confira a grafia ou busque pelo CPF." : "Busque o paciente pelo nome ou CPF."}
              />
            </div>
          ) : (
            <ul className="divide-y divide-pine-900/5">
              {patients.map((p) => {
                const lastId = p.last_rx_id === null ? null : Number(p.last_rx_id);
                const id = Number(p.id);
                return (
                  <li key={id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <Link href={rxLinks.ficha(id)} className="block truncate font-bold text-pine-950 hover:text-pine-600">
                        {p.name}
                      </Link>
                      <p className="truncate text-xs text-pine-900/55">
                        {[p.birth_date ? ageFrom(p.birth_date) : null, p.cpf, p.last_rx ? `última receita ${fmtDate(p.last_rx)}` : "nenhuma receita ainda"]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {p.allergies?.trim() ? (
                        <p className="truncate text-xs font-semibold text-rose-700" title={p.allergies}>
                          ⚠ Alergia: {p.allergies}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex w-full gap-2 sm:w-auto">
                      {lastId ? (
                        <Link href={rxLinks.renovar(id, lastId)} className="btn btn-ghost flex-1 px-3 py-1.5 text-xs sm:flex-none">
                          Renovar última
                        </Link>
                      ) : null}
                      <Link href={rxLinks.nova(id)} className="btn btn-primary flex-1 px-3 py-1.5 text-xs sm:flex-none">
                        Nova receita
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          <section className="card grid grid-cols-2 divide-x divide-pine-900/10 text-center">
            <div className="p-4">
              <p className="font-display text-2xl font-semibold text-pine-950">{issuedToday}</p>
              <p className="text-xs text-pine-900/55">emitida{issuedToday === 1 ? "" : "s"} hoje</p>
            </div>
            <div className="p-4">
              <p className="font-display text-2xl font-semibold text-pine-950">{issuedMonth}</p>
              <p className="text-xs text-pine-900/55">nos últimos 30 dias</p>
            </div>
          </section>

          <section className="card overflow-hidden">
            <h2 className="border-b border-pine-900/10 px-4 py-3 text-sm font-bold text-pine-950">
              Rascunhos em andamento <span className="font-normal text-pine-900/50">({drafts.length})</span>
            </h2>
            {drafts.length === 0 ? (
              <p className="px-4 py-3 text-xs text-pine-900/55">
                Nenhum. O que você deixar montado no compositor sem emitir aparece aqui.
              </p>
            ) : (
              <ul className="divide-y divide-pine-900/5">
                {drafts.map((d) => (
                  <li key={d.id}>
                    <Link href={rxLinks.rascunho(d.patientId, d.id)} className="block px-4 py-2.5 hover:bg-pine-50">
                      <span className="block truncate text-sm font-semibold text-pine-950">{d.patientName}</span>
                      <span className="block truncate text-xs text-pine-900/55">
                        {d.title} · {fmtDate(d.updatedAt)} {d.updatedAt.slice(11, 16)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card overflow-hidden">
            <h2 className="flex items-center justify-between border-b border-pine-900/10 px-4 py-3 text-sm font-bold text-pine-950">
              Últimas receitas
              <Link href="/receituario/historico" className="text-xs font-semibold text-pine-700 hover:underline">
                ver todas
              </Link>
            </h2>
            {recent.length === 0 ? (
              <p className="px-4 py-3 text-xs text-pine-900/55">Nenhuma receita emitida ainda.</p>
            ) : (
              <ul className="divide-y divide-pine-900/5">
                {recent.map((rx) => {
                  const s = rxSummary(rx.items);
                  return (
                    <li key={rx.docId} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={rxLinks.ver(rx.patientId, rx.docId)} className="min-w-0 truncate text-sm font-semibold text-pine-950 hover:text-pine-600">
                          {rx.patientName}
                        </Link>
                        <span className="shrink-0 text-xs text-pine-900/50">{fmtDate(rx.issuedAt)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-pine-900/60">
                        <span className="min-w-0 truncate">
                          <MedNames names={s.names} max={2} />
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {s.receipt !== "simples" ? <ReceiptChip kind={s.receipt} /> : null}
                          <SmallLink href={rxLinks.renovar(rx.patientId, rx.docId)}>Renovar</SmallLink>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
