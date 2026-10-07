"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { sql, transaction } from "./db";
import type { Patient, Tx } from "./db";
import { requireSession } from "./auth";
import { canActOnDocument, canIssueDocuments, issuerProfessionalId } from "./document-permissions";
import type { Session } from "./auth";
import { todayISO } from "./format";
import {
  DOCUMENT_CODE_RE,
  PROTOCOL_KIND,
  buildTemplateVars,
  documentTitle,
  fieldsFor,
  generateDocumentCode,
  isDocumentKind,
  normalizeFieldValues,
  normalizeSubkind,
  parseDocumentFields,
  pickTemplate,
  renderTemplate,
  serializeDocumentFields,
  serializeProtocol,
} from "./documents.ts";
import type { DocumentFieldValues, DocumentKind, DocumentTemplate } from "./documents.ts";
import { itemsToProtocol, parseItems } from "./composer.ts";
import { DOCUMENT_LIBRARY } from "./document-library.ts";
import { searchMedications } from "./medications-db";
import { searchCid } from "./cid-db";
import { parseItems as parsePrescriptionItems, serializeItems as serializePrescriptionItems } from "./prescription";
import { receiptKindFor, receiptWarning } from "./medications";
import type { Tarja, ReceiptKind } from "./medications";
import { getClinicHeader, getDocument, getTemplate, getTemplatesByIds } from "./documents-db";
import { deleteDraft } from "./drafts-db";
import type { ClinicHeader } from "./documents-db";
import { ISO_DATE_RE, str } from "./form-fields.ts";
import { isMigrationPending, isMissingColumn, isUniqueViolation } from "./pg-errors.ts";

/**
 * Documentos do prontuário (atestado, encaminhamento, laudo, orientações),
 * a emissão em lote do compositor ("Emitir documentos"), os Modelos de
 * Configurações e os protocolos. Tudo exige sessão. Se a migração
 * 2026-09-09-documentos (ou a 2026-09-16-emitir) ainda não rodou, a ação
 * volta com `?erro=migracao` em vez de um erro 500.
 */

/* ---------- Documentos ---------- */

interface NewDocument {
  patientId: number;
  professionalId: number;
  encounterId: number | null;
  kind: DocumentKind;
  subkind: string | null;
  title: string;
  body: string;
  fields: string | null;
  issuedAt: string;
  shared: 0 | 1;
  /** Código pedido pelo cliente (o compositor mostra desde o primeiro clique); inválido ou ocupado → outro. */
  code?: string | null;
}

type InsertResult = { id: number } | { error: "migracao" | "codigo" };
type BatchResult = { ids: number[] } | { error: "migracao" | "codigo" };

/**
 * Códigos livres para cada documento: o pedido, quando válido e ainda não
 * usado; senão um novo. A checagem vem antes do INSERT (`= ANY`) porque um
 * 23505 dentro da transação derrubaria os outros documentos do lote. Três
 * rodadas bastam (32^8 combinações); se ainda assim colidir, o INSERT devolve
 * 23505 e o lote inteiro vira "codigo".
 */
async function freeCodes(tx: Tx, wanted: ReadonlyArray<string | null | undefined>): Promise<string[]> {
  let codes = wanted.map((code) => (code && DOCUMENT_CODE_RE.test(code) ? code : generateDocumentCode()));
  for (let round = 0; round < 3; round += 1) {
    const seen = new Set<string>();
    codes = codes.map((code) => {
      let unique = code;
      while (seen.has(unique)) unique = generateDocumentCode();
      seen.add(unique);
      return unique;
    });
    const taken = await tx<{ code: string }[]>`SELECT code FROM documents WHERE code = ANY(${codes})`;
    if (taken.length === 0) return codes;
    const busy = new Set(taken.map((row) => row.code));
    codes = codes.map((code) => (busy.has(code) ? generateDocumentCode() : code));
  }
  return codes;
}

/**
 * Grava todos os documentos numa transação só: ou entram todos, ou nenhum.
 * `batchId` liga os que foram emitidos juntos (uma mensagem, "imprimir
 * todos"); antes da migração 2026-09-16 a coluna não existe (42703) e a
 * gravação é refeita sem ela. Tabela ausente ou CHECK antigo → "migracao".
 */
async function insertDocuments(docs: ReadonlyArray<NewDocument>, batchId: string | null): Promise<BatchResult> {
  if (docs.length === 0) return { ids: [] };
  const attempt = (withBatch: boolean) =>
    transaction(async (tx) => {
      const codes = await freeCodes(
        tx,
        docs.map((doc) => doc.code)
      );
      const ids: number[] = [];
      for (let i = 0; i < docs.length; i += 1) {
        const doc = docs[i];
        const code = codes[i];
        const [row] = withBatch
          ? await tx<{ id: number }[]>`
              INSERT INTO documents (patient_id, professional_id, encounter_id, kind, subkind, title, body, fields, code,
                issued_at, shared_with_patient, batch_id)
              VALUES (${doc.patientId}, ${doc.professionalId}, ${doc.encounterId}, ${doc.kind}, ${doc.subkind},
                ${doc.title}, ${doc.body}, ${doc.fields}, ${code}, ${doc.issuedAt}, ${doc.shared}, ${batchId})
              RETURNING id`
          : await tx<{ id: number }[]>`
              INSERT INTO documents (patient_id, professional_id, encounter_id, kind, subkind, title, body, fields, code,
                issued_at, shared_with_patient)
              VALUES (${doc.patientId}, ${doc.professionalId}, ${doc.encounterId}, ${doc.kind}, ${doc.subkind},
                ${doc.title}, ${doc.body}, ${doc.fields}, ${code}, ${doc.issuedAt}, ${doc.shared})
              RETURNING id`;
        if (!row) throw new Error("INSERT em documents sem RETURNING id");
        ids.push(Number(row.id));
      }
      return ids;
    });

  try {
    try {
      return { ids: await attempt(batchId !== null) };
    } catch (error) {
      // Sem a coluna batch_id (migração 2026-09-16 pendente): grava sem o lote.
      if (batchId !== null && isMissingColumn(error)) return { ids: await attempt(false) };
      throw error;
    }
  } catch (error) {
    if (isMigrationPending(error)) return { error: "migracao" };
    if (isUniqueViolation(error)) return { error: "codigo" };
    throw error;
  }
}

/** Um documento só (formulário clássico, Duplicar): o mesmo caminho do lote, sem batch_id. */
async function insertDocument(doc: NewDocument): Promise<InsertResult> {
  const result = await insertDocuments([doc], null);
  if ("error" in result) return result;
  return { id: result.ids[0] };
}

/** Todos os campos do tipo; checkbox desmarcado não vem no POST e por isso não entra. */
function readFields(formData: FormData, kind: DocumentKind, subkind: string | null): DocumentFieldValues {
  const raw: Record<string, string> = {};
  for (const def of fieldsFor(kind, subkind)) raw[def.key] = str(formData, def.key);
  return normalizeFieldValues(raw);
}

/** O que o formulário e o compositor mandam igual: data (hoje se inválida) e "compartilhar no portal". */
function readIssue(formData: FormData): { issuedAt: string; shared: 0 | 1 } {
  const dateRaw = str(formData, "date");
  return {
    issuedAt: ISO_DATE_RE.test(dateRaw) ? dateRaw : todayISO(),
    shared: str(formData, "shared") ? 1 : 0,
  };
}

interface EmissionContext {
  patientRow: Patient | undefined;
  professional: { id: number; name: string; council: string } | undefined;
  /** O atendimento pedido, se for deste paciente; senão null. */
  encounterId: number | null;
  clinic: ClinicHeader;
}

/**
 * Tudo que a emissão lê do banco antes de montar o texto, numa rodada só (as
 * consultas não dependem umas das outras). Quem chama confere, nesta ordem,
 * paciente e profissional.
 */
async function loadEmission(patientId: number, professionalId: number, encounterId: number | null): Promise<EmissionContext> {
  const [patients, professionals, encounters, clinic] = await Promise.all([
    // SELECT * porque `social_name` (migração 2026-09-16) pode ainda não existir: nomeá-la derrubaria a consulta.
    sql<Patient>`SELECT * FROM patients WHERE id = ${patientId}`,
    sql<{ id: number; name: string; council: string }>`
      SELECT id, name, council FROM professionals WHERE id = ${professionalId}`,
    // Só um atendimento deste paciente pode ser vinculado; outro id qualquer é ignorado.
    encounterId
      ? sql<{ id: number }>`SELECT id FROM encounters WHERE id = ${encounterId} AND patient_id = ${patientId}`
      : Promise.resolve([]),
    getClinicHeader(),
  ]);
  return {
    patientRow: patients[0],
    professional: professionals[0],
    encounterId: encounters.length > 0 ? encounterId : null,
    clinic,
  };
}

export async function createDocumentAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const patientId = Number(str(formData, "patient_id"));
  if (!Number.isInteger(patientId) || patientId <= 0) redirect("/pacientes");

  const kindRaw = str(formData, "kind");
  const kind: DocumentKind = isDocumentKind(kindRaw) ? kindRaw : "atestado";
  const subkind = normalizeSubkind(kind, str(formData, "subkind"));
  // Profissional assina em nome próprio; o que o formulário mandou só vale para o admin.
  const professionalId = issuerProfessionalId(session, Number(str(formData, "professional_id")));
  const requestedEncounterId = Number(str(formData, "encounter_id")) || null;
  const templateId = Number(str(formData, "template_id")) || null;
  const { issuedAt, shared } = readIssue(formData);
  const fields = readFields(formData, kind, subkind);

  // Em caso de erro, voltar ao formulário com o mesmo tipo e o mesmo atendimento.
  const context = new URLSearchParams({ kind });
  if (subkind) context.set("sub", subkind);
  if (requestedEncounterId) context.set("encounter", String(requestedEncounterId));
  const retry = (erro: string) => `/pacientes/${patientId}/documentos/novo?${context.toString()}&erro=${erro}`;

  if (!canIssueDocuments(session)) redirect(retry("permissao"));
  if (!isDocumentKind(kindRaw) || !professionalId) redirect(retry("campos"));

  const [{ patientRow, professional, encounterId, clinic }, saved] = await Promise.all([
    loadEmission(patientId, professionalId, requestedEncounterId),
    templateId ? getTemplate(templateId) : Promise.resolve(null),
  ]);
  if (!patientRow) redirect("/pacientes");
  if (!professional) redirect(retry("campos"));
  const patient = { name: patientRow.name, cpf: patientRow.cpf, social_name: patientRow.social_name ?? null };

  const { template, templateId: storedTemplateId } = pickTemplate(saved, kind, subkind);
  const vars = buildTemplateVars({ patient, professional, clinicName: clinic.name, date: issuedAt, fields, kind });

  // Sem JS o formulário manda o texto que o servidor pré-renderizou e
  // `body_auto=1`: o texto é refeito aqui com os campos preenchidos. Com JS,
  // quem editou o texto à mão manda `body_auto=0` e o texto vale como está.
  const bodyAuto = str(formData, "body_auto") !== "0";
  let body = str(formData, "body");
  if (!body || bodyAuto) body = renderTemplate(template.body, vars);
  if (!body) redirect(retry("texto"));

  const title = str(formData, "title").slice(0, 120) || template.title || documentTitle(kind, subkind);

  const result = await insertDocument({
    patientId,
    professionalId,
    encounterId,
    kind,
    subkind,
    title,
    body,
    fields: serializeDocumentFields({ template_id: storedTemplateId, fields }),
    issuedAt,
    shared,
  });
  if ("error" in result) redirect(retry(result.error));

  revalidatePath("/", "layout");
  redirect(`/pacientes/${patientId}/documentos/${result.id}?ok=emitido`);
}

/**
 * "Emitir documentos": a pilha do compositor (`items`, JSON de ComposerItem)
 * vira vários documentos de uma vez, com a mesma data, o mesmo profissional
 * e um `batch_id` em comum. Cada texto marcado `body_auto` é refeito aqui
 * com a data e o profissional escolhidos na revisão; texto editado à mão vai
 * como veio. CPF e celular digitados na revisão só entram no cadastro quando
 * ele estava vazio. Sucesso → /emitir/pronto com os ids (e `wa=1` para abrir
 * o WhatsApp).
 */
export async function emitDocumentsAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const patientId = Number(str(formData, "patient_id"));
  if (!Number.isInteger(patientId) || patientId <= 0) redirect("/pacientes");

  // Profissional assina em nome próprio; o que o formulário mandou só vale para o admin.
  const professionalId = issuerProfessionalId(session, Number(str(formData, "professional_id")));
  // Reatribuído depois da checagem: o retry leva só um atendimento válido.
  let encounterId = Number(str(formData, "encounter_id")) || null;
  const { issuedAt, shared } = readIssue(formData);
  const openWhatsApp = str(formData, "open_whatsapp") !== "";
  const items = parseItems(str(formData, "items"));

  const retry = (erro: string) => {
    const query = new URLSearchParams();
    if (encounterId) query.set("encounter", String(encounterId));
    query.set("erro", erro);
    return `/pacientes/${patientId}/emitir?${query.toString()}`;
  };

  if (!canIssueDocuments(session)) redirect(retry("permissao"));
  if (items.length === 0) redirect(retry("itens"));
  if (!professionalId) redirect(retry("campos"));

  const [emission, savedTemplates] = await Promise.all([
    loadEmission(patientId, professionalId, encounterId),
    // Um SELECT para todos os modelos da pilha, em vez de um por item.
    getTemplatesByIds(items.map((item) => item.template_id)),
  ]);
  const { patientRow, professional, clinic } = emission;
  if (!patientRow) redirect("/pacientes");
  if (!professional) redirect(retry("campos"));
  encounterId = emission.encounterId;

  // "Informações faltantes" da revisão: só preenchem o que está vazio no cadastro
  // (o WHERE repete a regra, para o caso de outra tela ter preenchido antes).
  const cpf = str(formData, "patient_cpf").slice(0, 20) || null;
  const phone = str(formData, "patient_phone").slice(0, 30) || null;
  await Promise.all([
    cpf && !patientRow.cpf?.trim()
      ? sql`UPDATE patients SET cpf = ${cpf} WHERE id = ${patientId} AND COALESCE(cpf, '') = ''`
      : null,
    phone && !patientRow.phone?.trim()
      ? sql`UPDATE patients SET phone = ${phone} WHERE id = ${patientId} AND COALESCE(phone, '') = ''`
      : null,
  ]);
  const patient = {
    name: patientRow.name,
    cpf: patientRow.cpf?.trim() || cpf,
    social_name: patientRow.social_name ?? null,
  };

  const docs: NewDocument[] = [];
  for (const item of items) {
    const saved = item.template_id ? savedTemplates.get(item.template_id) : null;
    const { template, templateId } = pickTemplate(saved, item.kind, item.subkind);
    const vars = buildTemplateVars({
      patient,
      professional,
      clinicName: clinic.name,
      date: issuedAt,
      fields: item.fields,
      kind: item.kind,
    });
    let body = item.body;
    if (!body || item.body_auto !== "0") body = renderTemplate(template.body, vars);
    if (!body) redirect(retry("texto"));
    docs.push({
      patientId,
      professionalId,
      encounterId,
      kind: item.kind,
      subkind: item.subkind,
      title: item.title.slice(0, 120) || template.title || documentTitle(item.kind, item.subkind),
      body,
      fields: serializeDocumentFields({ template_id: templateId, fields: item.fields }),
      issuedAt,
      shared,
      code: item.code,
    });
  }

  const result = await insertDocuments(docs, generateDocumentCode());
  if ("error" in result) redirect(retry(result.error));
  // Emitido a partir de um rascunho: o rascunho virou documento e sai da lista.
  await deleteDraft(Number(str(formData, "draft_id")), patientId).catch(() => undefined);

  revalidatePath("/", "layout");
  redirect(`/pacientes/${patientId}/emitir/pronto?ids=${result.ids.join(",")}${openWhatsApp ? "&wa=1" : ""}`);
}

/** O documento do `id` do formulário, ou volta para /pacientes. */
async function documentFromForm(formData: FormData) {
  const doc = await getDocument(Number(str(formData, "id")));
  if (!doc) redirect("/pacientes");
  return doc;
}

function documentPage(doc: { id: number; patient_id: number }): string {
  return `/pacientes/${doc.patient_id}/documentos/${doc.id}`;
}

export async function revokeDocumentAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const doc = await documentFromForm(formData);
  const page = documentPage(doc);
  if (!canActOnDocument(session, doc.professional_id)) redirect(`${page}?erro=permissao`);
  if (doc.revoked_at) redirect(`${page}?erro=ja_revogado`);

  const reason = str(formData, "reason").slice(0, 300) || null;
  await sql`
    UPDATE documents SET revoked_at = ${todayISO()}, revoke_reason = ${reason}
    WHERE id = ${doc.id} AND revoked_at IS NULL`;
  revalidatePath("/", "layout");
  redirect(`${page}?ok=revogado`);
}

/**
 * Novo documento igual ao original, com a data de hoje. Se o original veio de
 * um modelo (campos gravados em `fields`), o texto é refeito com o {{data}} de
 * hoje — o modelo salvo se ainda existir, senão o padrão do tipo; senão o
 * texto é copiado como está.
 */
export async function duplicateDocumentAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const original = await documentFromForm(formData);
  const page = documentPage(original);
  if (!canActOnDocument(session, original.professional_id)) redirect(`${page}?erro=permissao`);

  const today = todayISO();
  const stored = parseDocumentFields(original.fields);
  let body = original.body;
  let fieldsJson = original.fields;
  if (stored) {
    const [clinic, saved] = await Promise.all([
      getClinicHeader(),
      stored.template_id ? getTemplate(stored.template_id) : Promise.resolve(null),
    ]);
    const { template, templateId } = pickTemplate(saved, original.kind, original.subkind);
    const vars = buildTemplateVars({
      patient: {
        name: original.patient_name,
        cpf: original.patient_cpf,
        social_name: original.patient_social_name ?? null,
      },
      professional: { name: original.professional_name, council: original.professional_council },
      clinicName: clinic.name,
      date: today,
      fields: stored.fields,
      kind: original.kind,
    });
    body = renderTemplate(template.body, vars) || original.body;
    fieldsJson = serializeDocumentFields({ template_id: templateId, fields: stored.fields });
  }

  const result = await insertDocument({
    patientId: original.patient_id,
    professionalId: original.professional_id,
    encounterId: original.encounter_id,
    kind: original.kind,
    subkind: original.subkind,
    title: original.title,
    body,
    fields: fieldsJson,
    issuedAt: today,
    shared: Number(original.shared_with_patient) === 1 ? 1 : 0,
  });
  if ("error" in result) redirect(`${page}?erro=${result.error}`);

  revalidatePath("/", "layout");
  redirect(`/pacientes/${original.patient_id}/documentos/${result.id}?ok=duplicado`);
}

export async function toggleShareDocumentAction(formData: FormData): Promise<void> {
  await requireSession();
  const doc = await documentFromForm(formData);
  const [updated] = await sql<{ shared_with_patient: number }>`
    UPDATE documents SET shared_with_patient = 1 - shared_with_patient
    WHERE id = ${doc.id} RETURNING shared_with_patient`;
  revalidatePath("/", "layout");
  redirect(`${documentPage(doc)}?ok=${Number(updated?.shared_with_patient) === 1 ? "compartilhado" : "oculto"}`);
}

/* ---------- Modelos ---------- */

const MODELOS = "/configuracoes/modelos";

/** Admin mexe em tudo; profissional só nos próprios. */
function ownsTemplate(template: DocumentTemplate, session: Session): boolean {
  if (session.role === "admin") return true;
  return session.professionalId !== null && template.professional_id === session.professionalId;
}

/**
 * Onde mora um modelo (ou protocolo) novo: `null` = da clínica, senão o
 * profissional da sessão ("Meus modelos"). Da clínica só o admin grava — por
 * pedido (`scope=clinica`) ou por não ter profissional vinculado.
 * `undefined` = esta sessão não pode criar modelo: um perfil sem profissional
 * que não é admin cairia no escopo da clínica inteira.
 */
function newTemplateScope(session: Session, formData: FormData): number | null | undefined {
  if (session.role === "admin" && str(formData, "scope") === "clinica") return null;
  if (session.professionalId) return session.professionalId;
  return session.role === "admin" ? null : undefined;
}

export async function saveTemplateAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = Number(str(formData, "id")) || null;
  const kindRaw = str(formData, "kind");
  const name = str(formData, "name").slice(0, 80);
  const title = str(formData, "title").slice(0, 120) || null;
  const body = str(formData, "body");
  const back = (query: string) => `${MODELOS}?${query}${id ? `&editar=${id}` : ""}`;

  if (!isDocumentKind(kindRaw) || !name || !body) redirect(back("erro=campos"));
  const kind = kindRaw;
  const subkind = normalizeSubkind(kind, str(formData, "subkind"));

  try {
    if (id) {
      const existing = await getTemplate(id);
      if (!existing || !ownsTemplate(existing, session)) redirect(back("erro=permissao"));
      await sql`
        UPDATE document_templates
        SET kind = ${kind}, subkind = ${subkind}, name = ${name}, title = ${title}, body = ${body}
        WHERE id = ${id}`;
    } else {
      const scope = newTemplateScope(session, formData);
      if (scope === undefined) redirect(back("erro=permissao"));
      await sql`
        INSERT INTO document_templates (professional_id, kind, subkind, name, title, body)
        VALUES (${scope}, ${kind}, ${subkind}, ${name}, ${title}, ${body})`;
    }
  } catch (error) {
    unstable_rethrow(error);
    if (isMigrationPending(error)) redirect(back("erro=migracao"));
    throw error;
  }

  revalidatePath("/", "layout");
  redirect(`${MODELOS}?ok=salvo`);
}

/**
 * Instala a biblioteca de modelos prontos como modelos **da clínica**.
 *
 * Idempotente pela chave `name`: reinstalar só acrescenta o que falta, então
 * quem editou o texto de um modelo não o perde na próxima instalação. Só
 * admin, porque escreve no escopo da clínica inteira.
 */
export async function installLibraryAction(): Promise<void> {
  const session = await requireSession();
  if (session.role !== "admin") redirect(`${MODELOS}?erro=permissao`);

  try {
    const existing = await sql<{ name: string }>`
      SELECT name FROM document_templates WHERE professional_id IS NULL`;
    const known = new Set(existing.map((row) => row.name));
    const missing = DOCUMENT_LIBRARY.filter((template) => !known.has(template.name));

    if (missing.length === 0) redirect(`${MODELOS}?ok=biblioteca_completa`);

    // Um INSERT só com todas as linhas: atômico como a transação de antes, sem
    // uma ida ao banco por modelo.
    await sql`
      INSERT INTO document_templates (professional_id, kind, subkind, name, title, body)
      SELECT NULL::bigint, kind, subkind, name, title, body
      FROM unnest(
        ${missing.map((t) => t.kind)}::text[],
        ${missing.map((t) => t.subkind ?? null)}::text[],
        ${missing.map((t) => t.name)}::text[],
        ${missing.map((t) => t.title)}::text[],
        ${missing.map((t) => t.body)}::text[]
      ) AS library(kind, subkind, name, title, body)`;

    revalidatePath("/", "layout");
    redirect(`${MODELOS}?ok=biblioteca&n=${missing.length}`);
  } catch (error) {
    unstable_rethrow(error);
    if (isMigrationPending(error)) redirect(`${MODELOS}?erro=migracao`);
    throw error;
  }
}

/**
 * Autocompletar de medicamentos para o compositor do receituário.
 *
 * É leitura, mas vai como Server Action porque quem pergunta é um componente
 * de cliente a cada tecla — e assim o catálogo (25 mil linhas) nunca é
 * enviado ao navegador. Devolve já com o documento exigido por tarja
 * calculado, para a tela não ter de reimplementar a regra.
 */
export async function searchMedicationsAction(
  query: string
): Promise<{ label: string; substance: string; concentration: string | null; tarja: Tarja; receipt: ReceiptKind; warning: string | null; brands: number }[]> {
  await requireSession();
  const hits = await searchMedications(query);
  return hits.map((hit) => ({
    label: [hit.substance, hit.concentration].filter(Boolean).join(" "),
    substance: hit.substance,
    concentration: hit.concentration,
    tarja: hit.tarja,
    receipt: receiptKindFor(hit.tarja),
    warning: receiptWarning(hit.tarja),
    brands: hit.brands,
  }));
}

/**
 * Autocompletar de CID-10 para os campos de documento. Leitura, mas vai como
 * Server Action porque quem pergunta é um componente de cliente a cada tecla —
 * e assim o catálogo (14 mil códigos) nunca vai para o navegador.
 */
export async function searchCidAction(
  query: string
): Promise<{ code: string; description: string; chapter: string | null; sexRestriction: "M" | "F" | null }[]> {
  await requireSession();
  const hits = await searchCid(query);
  return hits.map((hit) => ({
    code: hit.code,
    description: hit.description,
    chapter: hit.chapter,
    sexRestriction: hit.sexRestriction,
  }));
}

export type SaveProtocolResult = { ok: true; id: number } | { error: "campos" | "migracao" | "permissao" };

/** INSERT de um protocolo (de documentos ou de medicamentos) no escopo já decidido. */
async function insertProtocol(
  scope: number | null,
  kind: typeof PROTOCOL_KIND | "receituario",
  name: string,
  fields: string
): Promise<SaveProtocolResult> {
  try {
    const [row] = await sql<{ id: number }>`
      INSERT INTO document_templates (professional_id, kind, subkind, name, title, body, fields)
      VALUES (${scope}, ${kind}, ${null}, ${name}, ${null}, ${""}, ${fields})
      RETURNING id`;
    revalidatePath("/", "layout");
    return { ok: true, id: Number(row?.id) };
  } catch (error) {
    if (isMigrationPending(error)) return { error: "migracao" };
    throw error;
  }
}

/**
 * "Salvar como protocolo": a pilha atual vira um modelo `kind = 'protocolo'`
 * (itens em JSON no `fields`, `body = ''`). Chamada do compositor sem
 * recarregar a página — devolve o resultado em vez de redirecionar, para a
 * pilha não se perder. Antes da migração 2026-09-16 o CHECK antigo recusa o
 * tipo (23514) → "migracao".
 */
export async function saveProtocolAction(formData: FormData): Promise<SaveProtocolResult> {
  const session = await requireSession();
  const name = str(formData, "name").slice(0, 80);
  const items = itemsToProtocol(parseItems(str(formData, "items")));
  if (!name || items.length === 0) return { error: "campos" };

  const scope = newTemplateScope(session, formData);
  if (scope === undefined) return { error: "permissao" };
  return insertProtocol(scope, PROTOCOL_KIND, name, serializeProtocol(items));
}

/**
 * Salva a lista de medicamentos como **protocolo da clínica ou do médico**.
 *
 * O Renova não traz protocolos de medicamento prontos, e isso é deliberado:
 * um modelo de texto que saia imperfeito é lido e corrigido por quem assina,
 * mas uma dose padrão se repete calada em cada paciente que receber o
 * protocolo. Quem conhece a prática da clínica é o médico — o sistema só
 * guarda o que ele já decidiu.
 *
 * Vai como `document_templates` de kind `receituario`, com a lista em
 * `fields.medicamentos` (mesmo formato do documento emitido), então herda a
 * tela de Modelos, o escopo e a exclusão que já existem.
 */
export async function savePrescriptionProtocolAction(formData: FormData): Promise<SaveProtocolResult> {
  const session = await requireSession();
  const name = str(formData, "name").slice(0, 80);
  const items = parsePrescriptionItems(str(formData, "items"));
  if (!name || items.length === 0) return { error: "campos" };

  const scope = newTemplateScope(session, formData);
  if (scope === undefined) return { error: "permissao" };
  return insertProtocol(scope, "receituario", name, JSON.stringify({ medicamentos: serializePrescriptionItems(items) }));
}

export async function deleteTemplateAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = Number(str(formData, "id"));
  if (!id) redirect(MODELOS);
  const existing = await getTemplate(id);
  if (!existing) redirect(MODELOS);
  if (!ownsTemplate(existing, session)) redirect(`${MODELOS}?erro=permissao`);

  try {
    await sql`DELETE FROM document_templates WHERE id = ${id}`;
  } catch (error) {
    if (isMigrationPending(error)) redirect(`${MODELOS}?erro=migracao`);
    throw error;
  }
  revalidatePath("/", "layout");
  redirect(`${MODELOS}?ok=apagado`);
}
