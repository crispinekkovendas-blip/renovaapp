import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import type { Encounter, Patient, Professional } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canIssueDocuments } from "@/lib/document-permissions";
import { fmtDate, todayISO } from "@/lib/format";
import {
  ATESTADO_SUBKINDS,
  DOCUMENT_KINDS,
  defaultTemplate,
  fieldsFor,
  isDocumentKind,
  normalizeSubkind,
  patientDisplayName,
} from "@/lib/documents";
import type { DocumentKind } from "@/lib/documents";
import { documentsReady, getClinicHeader, listTemplates } from "@/lib/documents-db";
import { PageHeader } from "@/components/ui";
import { DocumentForm } from "@/components/documents/document-form";
import type { FormTemplate } from "@/components/documents/document-form";

type EncounterRef = Pick<Encounter, "id" | "date" | "professional_id">;

/**
 * Novo documento do prontuário. O tipo (e o subtipo do atestado) vem da URL,
 * como pílulas-link: trocar de tipo recarrega os campos certos sem depender
 * de JS. O formulário em si é o DocumentForm.
 */
export default async function NewDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kind?: string; sub?: string; encounter?: string; erro?: string }>;
}) {
  const session = await requireSession();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const patientId = Number(id);
  if (!Number.isFinite(patientId)) notFound();
  // Documento médico é ato do profissional (ou do admin): a recepção volta à ficha com o aviso.
  if (!canIssueDocuments(session)) redirect(`/pacientes/${patientId}?erro=permissao`);
  const kind: DocumentKind = isDocumentKind(query.kind) ? query.kind : "atestado";
  const subkind = normalizeSubkind(kind, query.sub);
  const encounterId = Number(query.encounter) || null;

  // Nada aqui depende do paciente já lido: tudo numa ida só ao banco.
  const [[patient], allProfessionals, encounterRows, templates, clinic, ready] = await Promise.all([
    sql<Pick<Patient, "name" | "cpf" | "social_name">>`SELECT * FROM patients WHERE id = ${patientId}`,
    sql<Pick<Professional, "id" | "name" | "council">>`
      SELECT id, name, council FROM professionals WHERE active = 1 ORDER BY name`,
    encounterId
      ? sql<EncounterRef>`
          SELECT id, date, professional_id FROM encounters WHERE id = ${encounterId} AND patient_id = ${patientId}`
      : Promise.resolve([] as EncounterRef[]),
    listTemplates(session.professionalId, kind),
    getClinicHeader(),
    documentsReady(),
  ]);
  if (!patient) notFound();
  // O profissional só assina em nome próprio: a lista de quem assina é ele mesmo.
  const professionals =
    session.role === "profissional" ? allProfessionals.filter((p) => p.id === session.professionalId) : allProfessionals;
  const encounter = encounterRows[0] ?? null;

  const defaultProfessionalId =
    session.professionalId ?? encounter?.professional_id ?? (professionals.length === 1 ? professionals[0].id : null);

  const standard = defaultTemplate(kind, subkind);
  const formTemplates: FormTemplate[] = [
    { id: null, name: "Padrão", title: standard.title, body: standard.body },
    ...templates
      .filter((t) => (t.subkind ?? null) === subkind)
      .map((t) => ({
        id: t.id,
        name: t.professional_id === null ? `${t.name} · da clínica` : t.name,
        title: t.title?.trim() || standard.title,
        body: t.body,
      })),
  ];

  const encounterQuery = encounter ? `&encounter=${encounter.id}` : "";
  const pill = (k: DocumentKind, sub?: string) =>
    `/pacientes/${patientId}/documentos/novo?kind=${k}${sub ? `&sub=${sub}` : ""}${encounterQuery}`;
  // No celular as pílulas ficam numa linha que rola de lado, com 44px de altura para o dedo.
  const pillClass = (active: boolean) =>
    active
      ? "chip min-h-11 shrink-0 bg-pine-950 px-4 py-1.5 text-xs text-white sm:min-h-0 sm:px-3.5"
      : "chip min-h-11 shrink-0 border border-pine-900/15 bg-white px-4 py-1.5 text-xs text-pine-900 hover:border-pine-500 hover:text-pine-700 sm:min-h-0 sm:px-3.5";

  return (
    <>
      <Link href={`/pacientes/${patientId}`} className="mb-1 inline-flex min-h-11 items-center text-xs font-bold text-pine-600 hover:underline sm:mb-2 sm:min-h-0">
        ← Voltar à ficha
      </Link>
      <PageHeader
        title="Novo documento"
        subtitle={`${patientDisplayName(patient)}${encounter ? ` · atendimento de ${fmtDate(encounter.date)}` : ""}`}
      />

      <nav aria-label="Tipo de documento" className="scroll-x -mx-4 mb-3 flex gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {DOCUMENT_KINDS.map((item) => (
          <Link
            key={item.kind}
            href={pill(item.kind, item.kind === "atestado" ? "medico" : undefined)}
            className={pillClass(item.kind === kind)}
            aria-current={item.kind === kind ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {kind === "atestado" ? (
        <nav aria-label="Tipo de atestado" className="scroll-x -mx-4 mb-6 flex gap-2 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {ATESTADO_SUBKINDS.map((item) => (
            <Link
              key={item.subkind}
              href={pill("atestado", item.subkind)}
              className={pillClass(item.subkind === subkind)}
              aria-current={item.subkind === subkind ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : (
        <div className="mb-6" />
      )}

      {ready ? (
        <DocumentForm
          patientId={patientId}
          patient={{ name: patient.name, cpf: patient.cpf, social_name: patient.social_name ?? null }}
          kind={kind}
          subkind={subkind}
          professionals={professionals}
          defaultProfessionalId={defaultProfessionalId}
          encounterId={encounter?.id ?? null}
          templates={formTemplates}
          fieldDefs={fieldsFor(kind, subkind)}
          clinicName={clinic.name}
          today={todayISO()}
          canManageTemplates={session.role === "admin"}
          error={query.erro}
        />
      ) : (
        <div className="card p-4 sm:p-6">
          <p className="font-display text-lg font-semibold text-pine-950">Documentos ainda não ativos</p>
          <p className="mt-2 text-sm text-pine-900/70">
            Rode a migração <code className="font-mono">2026-09-09-documentos.sql</code> no banco para emitir atestados,
            encaminhamentos, laudos e orientações com código de autenticidade.
          </p>
        </div>
      )}
    </>
  );
}
