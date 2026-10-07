import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import type { Encounter, Patient, Professional } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { canIssueDocuments } from "@/lib/document-permissions";
import { fmtDate, todayISO } from "@/lib/format";
import { PROTOCOL_KIND, isDocumentKind, normalizeSubkind, parseProtocol } from "@/lib/documents";
import type { DocumentKind } from "@/lib/documents";
import { appendItems, seedFromDocument, seedFromTemplate } from "@/lib/composer";
import { parseItems as parsePrescriptionItems } from "@/lib/prescription";
import type { ComposerItem, ComposerTemplate, RenderContext } from "@/lib/composer";
import {
  documentsReady,
  getClinicHeader,
  getDocument,
  listDocumentsForPatient,
  listTemplates,
  templateUsage,
  recentPrescriptionFields,
} from "@/lib/documents-db";
import { frequentItems } from "@/lib/rx-suggestions";
import { getDraft } from "@/lib/drafts-db";
import { parseDraft } from "@/lib/drafts";
import { patientPortalLink } from "@/lib/actions-confirm";
import { memedConfig } from "@/lib/memed/client";
import { EmitComposer } from "@/components/documents/emit-composer";

/**
 * "Emitir documentos": o compositor de atestado, encaminhamento, laudo e
 * orientações num fluxo só (montar → revisar → emitir). A URL carrega o
 * contexto: `kind`/`sub` abrem o editor no tipo certo, `encounter` vincula o
 * atendimento, `from=<docId>` renova um documento já emitido e
 * `modelo=<templateId>` aplica um modelo (ou um protocolo inteiro) à pilha.
 * O formulário clássico (/documentos/novo) continua existindo para quem não
 * tem JS e para links antigos.
 */
export interface EmitQuery {
  kind?: string;
  sub?: string;
  encounter?: string;
  from?: string;
  modelo?: string;
  /** Rascunho a continuar: número do banco ou "local-…" do navegador. */
  rascunho?: string;
  erro?: string;
  ok?: string;
}

/**
 * A tela do compositor, usada pela página (F5, link direto) e pelo pop-up
 * por cima da ficha (`@modal/(.)pacientes/[id]/emitir`).
 */
export async function EmitScreen({
  params,
  searchParams,
  presentation,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<EmitQuery>;
  presentation: "modal" | "page";
}) {
  const session = await requireSession();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const patientId = Number(id);
  if (!Number.isFinite(patientId)) notFound();
  // Documento médico é ato do profissional (ou do admin): a recepção volta à ficha com o aviso.
  if (!canIssueDocuments(session)) redirect(`/pacientes/${patientId}?erro=permissao`);
  const encounterId = Number(query.encounter) || null;
  const fromId = Number(query.from) || null;
  const modeloId = Number(query.modelo) || null;

  // Tudo de uma vez: o paciente não vai mais na frente sozinho (uma ida ao banco a menos).
  const draftNumber = /^\d+$/.test(query.rascunho ?? "") ? Number(query.rascunho) : null;
  const [patientRows, allProfessionals, encounterRows, templateRows, clinic, ready, fromDoc, documents, portalUrl, pastRx, savedDraft, usage] = await Promise.all([
    sql<Patient>`SELECT * FROM patients WHERE id = ${patientId}`,
    // Da assinatura só importa se existe: a imagem (até 300 KB cada) fica no banco. Lida via to_jsonb
    // para não nomear a coluna, que só existe depois da migração 2026-09-16 (ver documents-db.ts).
    sql<ProfessionalOption>`
      SELECT id, name, council, coalesce(btrim(to_jsonb(p) ->> 'signature_image'), '') <> '' AS has_signature
      FROM professionals p WHERE active = 1 ORDER BY name`,
    encounterId
      ? sql<Encounter>`SELECT * FROM encounters WHERE id = ${encounterId} AND patient_id = ${patientId}`
      : Promise.resolve([] as Encounter[]),
    listTemplates(session.professionalId),
    getClinicHeader(),
    documentsReady(),
    fromId ? getDocument(fromId) : Promise.resolve(null),
    // Gaveta Histórico do rail ([] antes da migração) e o link do portal para o "Reenviar".
    listDocumentsForPatient(patientId),
    patientPortalLink(patientId),
    // "Seus mais receitados": as receitas que este médico já emitiu (a clínica toda, para o admin).
    recentPrescriptionFields(session.professionalId),
    draftNumber ? getDraft(draftNumber, patientId) : Promise.resolve(null),
    // "Mais usados" dos modelos: quantas vezes cada um já saiu num documento.
    templateUsage(session.professionalId),
  ]);
  const draftState = savedDraft ? parseDraft(savedDraft.state) : null;
  const draftId = savedDraft ? String(savedDraft.id) : query.rascunho?.startsWith("local-") ? query.rascunho : null;
  const patient = patientRows[0];
  if (!patient) notFound();
  // O profissional só assina em nome próprio: a lista de quem assina é ele mesmo.
  const professionals =
    session.role === "profissional" ? allProfessionals.filter((p) => p.id === session.professionalId) : allProfessionals;
  const encounter = encounterRows[0] ?? null;
  const frequentRx = frequentItems(pastRx.map(parsePrescriptionItems), 40);
  const today = todayISO();

  const defaultProfessionalId =
    session.professionalId ?? encounter?.professional_id ?? (professionals.length === 1 ? professionals[0].id : null);
  const defaultProfessional = professionals.find((p) => p.id === defaultProfessionalId) ?? null;

  const templates: ComposerTemplate[] = templateRows.map((t) => ({
    id: t.id,
    kind: t.kind,
    subkind: t.subkind,
    name: t.name,
    title: t.title,
    body: t.body,
    scope: t.professional_id === null ? "clinica" : t.professional_id === session.professionalId ? "meu" : "outro",
    items: t.kind === PROTOCOL_KIND ? parseProtocol(t.fields) : undefined,
    // Protocolo de medicamento: a lista mora em fields.medicamentos.
    medications: t.kind === "receituario" ? parsePrescriptionItems(prescriptionFieldOf(t.fields)) : undefined,
  }));

  // Sementes da pilha: "Renovar" (?from) e/ou um modelo ou protocolo (?modelo).
  const ctx: RenderContext = {
    patient: { name: patient.name, cpf: patient.cpf, social_name: patient.social_name ?? null },
    professional: defaultProfessional ? { name: defaultProfessional.name, council: defaultProfessional.council } : null,
    clinicName: clinic.name,
    date: today,
  };
  let kind: DocumentKind = isDocumentKind(query.kind) ? query.kind : "atestado";
  let subkind = normalizeSubkind(kind, query.sub);
  let seedItems: ComposerItem[] = [];
  if (fromDoc && fromDoc.patient_id === patientId) {
    seedItems = [seedFromDocument(fromDoc, templates, ctx)];
    if (!isDocumentKind(query.kind)) {
      kind = fromDoc.kind;
      subkind = normalizeSubkind(kind, fromDoc.subkind);
    }
  }
  if (modeloId) {
    const template = templates.find((t) => t.id === modeloId);
    if (template) {
      seedItems = appendItems(seedItems, seedFromTemplate(template, templates, ctx));
      if (!isDocumentKind(query.kind) && template.kind !== PROTOCOL_KIND) {
        kind = template.kind;
        subkind = normalizeSubkind(kind, template.subkind);
      }
    }
  }

  // O cabeçalho (avatar, "Paciente · atendimento de…", nome, código) é do próprio compositor.
  return (
    <>
      {ready ? (
        <EmitComposer
          patientId={patientId}
          patient={{
            name: patient.name,
            social_name: patient.social_name ?? null,
            cpf: patient.cpf,
            phone: patient.phone,
            birth_date: patient.birth_date,
            sex: patient.sex,
            allergies: patient.allergies ?? null,
            medications: patient.medications ?? null,
          }}
          professionals={professionals.map((p) => ({
            id: p.id,
            name: p.name,
            council: p.council,
            hasSignature: p.has_signature,
          }))}
          defaultProfessionalId={defaultProfessionalId}
          encounterId={encounter?.id ?? null}
          encounterDate={encounter ? fmtDate(encounter.date) : null}
          templates={templates}
          clinicName={clinic.name}
          clinicLine={clinic.line}
          clinicCnes={clinic.cnes}
          today={today}
          memedEnabled={memedConfig() !== null}
          frequentRx={frequentRx}
          templateUsage={usage}
          presentation={presentation}
          draftId={draftId}
          draftState={draftState}
          seedItems={seedItems}
          canManageTemplates={session.role === "admin"}
          initialKind={kind}
          initialSubkind={subkind}
          documents={documents}
          portalUrl={portalUrl}
          error={query.erro}
          ok={query.ok}
        />
      ) : (
        <div className="card p-6">
          <Link href={`/pacientes/${patientId}`} className="btn btn-ghost mb-3 px-3 py-1.5 text-xs">
            ← Ficha
          </Link>
          <p className="font-display text-lg font-extrabold text-pine-950">Documentos ainda não ativos</p>
          <p className="mt-2 text-sm text-pine-900/70">
            Rode a migração <code className="font-mono">2026-09-09-documentos.sql</code> no banco para emitir atestados,
            encaminhamentos, laudos e orientações com código de autenticidade.
          </p>
        </div>
      )}
    </>
  );
}

type ProfessionalOption = Pick<Professional, "id" | "name" | "council"> & { has_signature: boolean };

/** A lista de medicamentos guardada em `document_templates.fields`. */
function prescriptionFieldOf(fields: string | null): string | null {
  try {
    return JSON.parse(fields ?? "{}")?.medicamentos ?? null;
  } catch {
    return null;
  }
}
