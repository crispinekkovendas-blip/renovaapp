import Link from "next/link";
import { Suspense } from "react";
import { sql } from "@/lib/db";
import type { Patient } from "@/lib/db";
import { ageFrom, fmtDate } from "@/lib/format";
import { patientDisplayName } from "@/lib/documents";
import { EmptyState, PageHeader } from "@/components/ui";
import { IconPlus } from "@/components/icons";
import { PatientSearchInput } from "@/components/pacientes/patient-search-input";
import { civilNameAndCpf } from "@/components/pacientes/chart/chart-model";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  const like = `%${q}%`;
  const patients = await sql<Patient>`
    SELECT p.*, (SELECT MAX(a.date) FROM appointments a WHERE a.patient_id = p.id AND a.status = 'concluido') AS last_visit
    FROM patients p
    WHERE p.name ILIKE ${like} OR COALESCE(p.cpf,'') ILIKE ${like} OR COALESCE(p.phone,'') ILIKE ${like}
    ORDER BY p.name`;
  // Nome de exibição e a linha "nome civil · CPF" calculados uma vez: as duas
  // versões da lista (cartões no celular, tabela do sm para cima) usam os dois.
  const rows = patients.map((p) => ({ ...p, displayName: patientDisplayName(p), subline: civilNameAndCpf(p) }));

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle={`${patients.length} paciente${patients.length === 1 ? "" : "s"}${q ? ` para “${q}”` : " cadastrados"}`}
        action={
          <Link href="/pacientes/novo" className="btn btn-primary">
            <IconPlus className="h-4 w-4" />
            Novo paciente
          </Link>
        }
      />

      <Suspense fallback={<div className="input mb-4 max-w-md" />}>
        <PatientSearchInput initialQuery={q} />
      </Suspense>

      {patients.length === 0 ? (
        <EmptyState
          title={q ? "Nenhum paciente encontrado" : "Nenhum paciente cadastrado"}
          hint={q ? "Tente outro termo de busca." : "Cadastre o primeiro paciente para começar."}
        />
      ) : (
        <>
          {/* Celular: cada paciente é um cartão inteiro tocável (a tabela de
              cinco colunas não cabe em 360px e esconderia o convênio). */}
          <ul className="card divide-y divide-pine-900/5 overflow-hidden sm:hidden">
            {rows.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/pacientes/${p.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-pine-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-pine-950">{p.displayName}</span>
                    <span className="block truncate text-xs text-pine-900/55">
                      {[p.birth_date ? ageFrom(p.birth_date) : null, p.insurance ?? "Particular", p.phone]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {p.subline ? (
                      <span className="block truncate text-xs text-pine-900/45">{p.subline}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-right text-[11px] leading-tight text-pine-900/45">
                    {p.last_visit ? (
                      <>
                        última
                        <span className="block font-semibold text-pine-900/70">{fmtDate(p.last_visit)}</span>
                      </>
                    ) : null}
                  </span>
                  <span aria-hidden className="shrink-0 text-lg text-pine-900/30">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="card hidden overflow-x-auto sm:block">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Idade</th>
                  <th>Telefone</th>
                  <th>Convênio</th>
                  <th>Última consulta</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/pacientes/${p.id}`} className="font-bold text-pine-950 hover:text-pine-600">
                        {p.displayName}
                      </Link>
                      {p.subline ? (
                        <span className="block text-xs text-pine-900/45">{p.subline}</span>
                      ) : null}
                    </td>
                    <td className="text-pine-900/70">{ageFrom(p.birth_date)}</td>
                    <td className="text-pine-900/70">{p.phone ?? "—"}</td>
                    <td className="text-pine-900/70">{p.insurance ?? "Particular"}</td>
                    <td className="text-pine-900/70">{fmtDate(p.last_visit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
