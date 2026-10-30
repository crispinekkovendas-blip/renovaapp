import Link from "next/link";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { fmtDate } from "@/lib/format";
import { hasMedication, rxSummary } from "@/lib/receituario";
import { listIssuedPrescriptions, rxScope } from "@/lib/receituario-db";
import type { ReceiptKind } from "@/lib/medications";
import { EmptyState, PageHeader } from "@/components/ui";
import { MedNames, ReceiptChip, SmallLink, rxLinks } from "@/components/receituario/rx-ui";

/**
 * Receituário › Histórico: todas as receitas emitidas (as do profissional; as
 * da clínica para o admin), com busca por paciente/código, por medicamento,
 * por período e por tipo de papel. Cada linha abre a folha, baixa o PDF ou
 * renova — o compositor abre já com os mesmos medicamentos.
 */

const SHOWN = 200;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

interface Query {
  q?: string;
  med?: string;
  de?: string;
  ate?: string;
  tipo?: string;
  revogadas?: string;
  prof?: string;
}

export default async function HistoricoPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await requireRole("admin", "profissional");
  const query = await searchParams;
  const q = (query.q ?? "").trim().slice(0, 80);
  const med = (query.med ?? "").trim().slice(0, 80);
  const de = ISO.test(query.de ?? "") ? query.de! : "";
  const ate = ISO.test(query.ate ?? "") ? query.ate! : "";
  const tipo: ReceiptKind | "" = query.tipo === "simples" || query.tipo === "controle_especial" ? query.tipo : "";
  const revogadas = query.revogadas === "1";
  const admin = session.role === "admin";
  const prof = admin ? Number(query.prof) || null : null;

  const [rows, professionals] = await Promise.all([
    listIssuedPrescriptions({ professionalId: rxScope(session, prof), q, from: de, to: ate, includeRevoked: revogadas }),
    admin ? sql<{ id: number; name: string }>`SELECT id, name FROM professionals WHERE active = 1 ORDER BY name` : Promise.resolve([]),
  ]);
  const filtered = rows
    .map((rx) => ({ ...rx, summary: rxSummary(rx.items) }))
    .filter((rx) => hasMedication(rx.items, med))
    .filter((rx) => !tipo || rx.summary.receipt === tipo);
  const shown = filtered.slice(0, SHOWN);
  const anyFilter = Boolean(q || med || de || ate || tipo || revogadas || prof);

  return (
    <>
      <PageHeader
        title="Histórico de receitas"
        subtitle={`${filtered.length} receita${filtered.length === 1 ? "" : "s"}${anyFilter ? " com estes filtros" : admin ? " da clínica" : " suas"}`}
        action={
          <Link href="/receituario" className="btn btn-primary">
            Nova receita
          </Link>
        }
      />

      <form action="/receituario/historico" className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6 sm:p-5">
        <label className="block lg:col-span-2">
          <span className="label">Paciente ou código</span>
          <input name="q" type="search" defaultValue={q} placeholder="Nome, CPF ou RNV-…" className="input" />
        </label>
        <label className="block lg:col-span-2">
          <span className="label">Medicamento</span>
          <input name="med" type="search" defaultValue={med} placeholder="ex.: amoxicilina" className="input" />
        </label>
        <label className="block">
          <span className="label">De</span>
          <input name="de" type="date" defaultValue={de} className="input" />
        </label>
        <label className="block">
          <span className="label">Até</span>
          <input name="ate" type="date" defaultValue={ate} className="input" />
        </label>
        <label className="block">
          <span className="label">Papel</span>
          <select name="tipo" defaultValue={tipo} className="input">
            <option value="">Todos</option>
            <option value="simples">Simples</option>
            <option value="controle_especial">Controle especial</option>
          </select>
        </label>
        {admin ? (
          <label className="block">
            <span className="label">Profissional</span>
            <select name="prof" defaultValue={prof ?? ""} className="input">
              <option value="">Todos</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="revogadas" value="1" defaultChecked={revogadas} />
          Incluir revogadas
        </label>
        <div className="flex gap-2 self-end sm:col-span-2 lg:col-span-1 lg:col-start-6">
          <button type="submit" className="btn btn-primary flex-1">
            Filtrar
          </button>
          {anyFilter ? (
            <Link href="/receituario/historico" className="btn btn-ghost">
              Limpar
            </Link>
          ) : null}
        </div>
      </form>

      {shown.length === 0 ? (
        <div className="card p-3 sm:p-5">
          <EmptyState
            title={anyFilter ? "Nenhuma receita com estes filtros" : "Nenhuma receita emitida ainda"}
            hint={anyFilter ? "Afrouxe o período ou o termo da busca." : "As receitas emitidas pelo compositor aparecem aqui."}
          />
        </div>
      ) : (
        <>
          {/* Celular: um cartão por receita. */}
          <ul className="card divide-y divide-pine-900/5 overflow-hidden md:hidden">
            {shown.map((rx) => (
              <li key={rx.docId} className={`px-4 py-3 ${rx.revokedAt ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <Link href={rxLinks.ficha(rx.patientId)} className="min-w-0 truncate font-bold text-pine-950">
                    {rx.patientName}
                  </Link>
                  <span className="shrink-0 text-xs text-pine-900/50">{fmtDate(rx.issuedAt)}</span>
                </div>
                <p className="mt-0.5 text-sm text-pine-900/75">
                  <MedNames names={rx.summary.names} />
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <ReceiptChip kind={rx.summary.receipt} />
                  {rx.summary.continuous ? <span className="chip bg-sky-100 text-sky-800">Uso contínuo</span> : null}
                  {rx.revokedAt ? <span className="chip bg-rose-100 text-rose-700">Revogada</span> : null}
                  <span className="ml-auto flex gap-1">
                    <SmallLink href={rxLinks.ver(rx.patientId, rx.docId)}>Ver</SmallLink>
                    <SmallLink href={rxLinks.renovar(rx.patientId, rx.docId)}>Renovar</SmallLink>
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="card hidden overflow-x-auto md:block">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Paciente</th>
                  <th>Medicamentos</th>
                  <th>Papel</th>
                  {admin ? <th>Profissional</th> : null}
                  <th>Código</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((rx) => (
                  <tr key={rx.docId} className={rx.revokedAt ? "opacity-60" : ""}>
                    <td className="whitespace-nowrap text-pine-900/70">{fmtDate(rx.issuedAt)}</td>
                    <td>
                      <Link href={rxLinks.ficha(rx.patientId)} className="font-bold text-pine-950 hover:text-pine-600">
                        {rx.patientName}
                      </Link>
                    </td>
                    <td className="max-w-xs text-pine-900/75">
                      <MedNames names={rx.summary.names} />
                    </td>
                    <td>
                      <span className="flex flex-wrap gap-1">
                        <ReceiptChip kind={rx.summary.receipt} />
                        {rx.summary.continuous ? <span className="chip bg-sky-100 text-sky-800">Contínuo</span> : null}
                        {rx.revokedAt ? <span className="chip bg-rose-100 text-rose-700">Revogada</span> : null}
                      </span>
                    </td>
                    {admin ? <td className="text-pine-900/70">{rx.professionalName}</td> : null}
                    <td className="whitespace-nowrap font-mono text-xs text-pine-900/60">{rx.code}</td>
                    <td>
                      <span className="flex justify-end gap-1">
                        <SmallLink href={rxLinks.ver(rx.patientId, rx.docId)}>Ver</SmallLink>
                        <a
                          href={rxLinks.pdf(rx.patientId, rx.docId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost px-2.5 py-1 text-xs"
                        >
                          PDF
                        </a>
                        <SmallLink href={rxLinks.renovar(rx.patientId, rx.docId)}>Renovar</SmallLink>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > SHOWN ? (
            <p className="mt-3 text-center text-xs text-pine-900/55">
              Mostrando as {SHOWN} mais recentes de {filtered.length}. Use o período ou a busca para achar as anteriores.
            </p>
          ) : null}
        </>
      )}
    </>
  );
}
