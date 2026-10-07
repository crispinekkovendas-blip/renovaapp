import { sql } from "@/lib/db";
import { parseDocumentFields } from "./documents";
import { countTemplateUses } from "./composer-tabs";
import type { Document, DocumentKind, DocumentTemplate } from "./documents";

/**
 * Consultas de `documents` e `document_templates` (migração
 * 2026-09-09-documentos). Tudo aqui é tolerante: a migração pode ainda não
 * ter rodado em produção quando este código subir, e nesse caso as funções
 * devolvem [] / null e as seções simplesmente não aparecem. Os helpers puros
 * (tipos, modelos, placeholders, código) ficam em documents.ts.
 */

/** Documento com o que a folha e o portal precisam mostrar de paciente e profissional. */
export interface DocumentWithPeople extends Document {
  patient_name: string;
  patient_cpf: string | null;
  patient_phone: string | null;
  /** Nome social (migração 2026-09-16); null antes dela ou quando não há. */
  patient_social_name?: string | null;
  professional_name: string;
  professional_council: string;
  professional_specialty: string;
  /** RQE e assinatura digitalizada (migração 2026-09-16); null antes dela ou quando não há. */
  professional_rqe?: string | null;
  professional_signature_image?: string | null;
}

/** Linha da lista do prontuário. */
export interface DocumentListRow extends Document {
  professional_name: string;
}

/**
 * A linha crua de getDocument/getDocumentByCode: além das colunas nomeadas,
 * o paciente e o profissional inteiros em JSON. É assim que `social_name`,
 * `rqe` e `signature_image` chegam sem aparecer no SQL — antes da migração
 * 2026-09-16 essas colunas não existem, e nomeá-las derrubaria a consulta.
 */
interface DocumentPeopleRow extends DocumentWithPeople {
  patient_json: string | null;
  professional_json: string | null;
}

function parseJsonObject(json: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed: unknown = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function withPeople(row: DocumentPeopleRow): DocumentWithPeople {
  const { patient_json, professional_json, ...doc } = row;
  const patient = parseJsonObject(patient_json);
  const professional = parseJsonObject(professional_json);
  return {
    ...doc,
    patient_social_name: optionalText(patient.social_name),
    professional_rqe: optionalText(professional.rqe),
    professional_signature_image: optionalText(professional.signature_image),
  };
}

/** As duas tabelas existem? Sem elas, o prontuário esconde "Novo atestado" e Modelos avisa. */
export async function documentsReady(): Promise<boolean> {
  try {
    await sql`SELECT (SELECT 1 FROM documents LIMIT 1), (SELECT 1 FROM document_templates LIMIT 1)`;
    return true;
  } catch {
    return false;
  }
}

export async function listDocumentsForPatient(patientId: number): Promise<DocumentListRow[]> {
  try {
    return await sql<DocumentListRow>`
      SELECT d.*, pr.name AS professional_name
      FROM documents d
      JOIN professionals pr ON pr.id = d.professional_id
      WHERE d.patient_id = ${patientId}
      ORDER BY d.issued_at DESC, d.id DESC`;
  } catch {
    return [];
  }
}

/**
 * Vários documentos de uma vez (a tela "pronto" e "imprimir todos" da
 * emissão), na ordem dos ids pedidos. Ids que não existem simplesmente não
 * voltam — quem chama confere o tamanho e o paciente. `[]` sem a tabela.
 */
export async function getDocumentsByIds(ids: ReadonlyArray<number>): Promise<DocumentWithPeople[]> {
  const wanted = ids.filter((id) => Number.isInteger(id) && id > 0);
  if (wanted.length === 0) return [];
  try {
    const rows = await sql<DocumentPeopleRow>`
      SELECT d.*, p.name AS patient_name, p.cpf AS patient_cpf, p.phone AS patient_phone,
        pr.name AS professional_name, pr.council AS professional_council, pr.specialty AS professional_specialty,
        row_to_json(p)::text AS patient_json, row_to_json(pr)::text AS professional_json
      FROM documents d
      JOIN patients p ON p.id = d.patient_id
      JOIN professionals pr ON pr.id = d.professional_id
      WHERE d.id = ANY(${wanted.map(String)}::bigint[])`;
    const byId = new Map(rows.map((row) => [Number(row.id), withPeople(row)]));
    return wanted.map((id) => byId.get(id)).filter((doc): doc is DocumentWithPeople => doc !== undefined);
  } catch {
    return [];
  }
}

export async function getDocument(id: number): Promise<DocumentWithPeople | null> {
  // Mesma consulta do lote: um id só é um lote de um.
  const [doc] = await getDocumentsByIds([id]);
  return doc ?? null;
}

/** Para /validar/[code]. Passe o código já normalizado (`normalizeDocumentCode`). */
export async function getDocumentByCode(code: string): Promise<DocumentWithPeople | null> {
  if (!code) return null;
  try {
    const [row] = await sql<DocumentPeopleRow>`
      SELECT d.*, p.name AS patient_name, p.cpf AS patient_cpf, p.phone AS patient_phone,
        pr.name AS professional_name, pr.council AS professional_council, pr.specialty AS professional_specialty,
        row_to_json(p)::text AS patient_json, row_to_json(pr)::text AS professional_json
      FROM documents d
      JOIN patients p ON p.id = d.patient_id
      JOIN professionals pr ON pr.id = d.professional_id
      WHERE d.code = ${code}`;
    return row ? withPeople(row) : null;
  } catch {
    return null;
  }
}

/**
 * Modelos que este profissional pode usar: os da clínica (professional_id
 * NULL) mais os dele. Com `professionalId` null, só os da clínica.
 */
export async function listTemplates(professionalId: number | null, kind?: DocumentKind): Promise<DocumentTemplate[]> {
  try {
    return await sql<DocumentTemplate>`
      SELECT t.*, pr.name AS professional_name
      FROM document_templates t
      LEFT JOIN professionals pr ON pr.id = t.professional_id
      WHERE (t.professional_id IS NULL OR t.professional_id = ${professionalId})
        AND (${kind ?? null}::text IS NULL OR t.kind = ${kind ?? null})
      ORDER BY t.kind, t.subkind NULLS FIRST, t.professional_id NULLS FIRST, t.name`;
  } catch {
    return [];
  }
}

/** Todos os modelos, para a página de Modelos do admin. */
export async function listAllTemplates(): Promise<DocumentTemplate[]> {
  try {
    return await sql<DocumentTemplate>`
      SELECT t.*, pr.name AS professional_name
      FROM document_templates t
      LEFT JOIN professionals pr ON pr.id = t.professional_id
      ORDER BY t.kind, t.subkind NULLS FIRST, t.professional_id NULLS FIRST, t.name`;
  } catch {
    return [];
  }
}

export async function getTemplate(id: number): Promise<DocumentTemplate | null> {
  if (!Number.isInteger(id) || id <= 0) return null;
  try {
    const [row] = await sql<DocumentTemplate>`SELECT * FROM document_templates WHERE id = ${id}`;
    return row ?? null;
  } catch {
    return null;
  }
}

/**
 * Vários modelos numa consulta só (a emissão em lote pede um por item).
 * Ids que não existem ficam fora do mapa; sem a tabela, mapa vazio — o mesmo
 * que `getTemplate` devolvendo null para cada um.
 */
export async function getTemplatesByIds(ids: ReadonlyArray<number | null | undefined>): Promise<Map<number, DocumentTemplate>> {
  const wanted = [...new Set(ids.filter((id): id is number => typeof id === "number" && Number.isInteger(id) && id > 0))];
  if (wanted.length === 0) return new Map();
  try {
    const rows = await sql<DocumentTemplate>`
      SELECT * FROM document_templates WHERE id = ANY(${wanted.map(String)}::bigint[])`;
    return new Map(rows.map((row) => [Number(row.id), row]));
  } catch {
    return new Map();
  }
}

/**
 * Papelômetro: documentos emitidos (não revogados) + receitas digitais da
 * Memed. Cada contagem falha sozinha; null só quando nenhuma das duas existe.
 * Calculado sempre, nunca guardado.
 */
export async function countDigitalDocuments(): Promise<number | null> {
  const [docs, rx] = await Promise.all([
    sql<{ n: number }>`SELECT COUNT(*)::int AS n FROM documents WHERE revoked_at IS NULL`
      .then(([row]) => row?.n ?? 0)
      .catch(() => null),
    sql<{ n: number }>`SELECT COUNT(*)::int AS n FROM memed_prescriptions WHERE status = 'emitida'`
      .then(([row]) => row?.n ?? 0)
      .catch(() => null),
  ]);
  if (docs === null && rx === null) return null;
  return (docs ?? 0) + (rx ?? 0);
}

/**
 * As listas de medicamentos das últimas receitas emitidas (a mais nova
 * primeiro), para o "Seus mais receitados" do compositor. Por profissional
 * quando há um; sem ele (admin sem cadastro de profissional), a clínica toda.
 * Revogada não conta: se foi revogada, provavelmente estava errada.
 */
export async function recentPrescriptionFields(professionalId: number | null, limit = 200): Promise<(string | null)[]> {
  try {
    // `fields` fica como texto: um JSON torto numa linha antiga não derruba a consulta toda.
    const rows = professionalId
      ? await sql<{ fields: string | null }>`
          SELECT fields FROM documents
          WHERE kind = 'receituario' AND revoked_at IS NULL AND professional_id = ${professionalId}
          ORDER BY id DESC LIMIT ${limit}`
      : await sql<{ fields: string | null }>`
          SELECT fields FROM documents
          WHERE kind = 'receituario' AND revoked_at IS NULL
          ORDER BY id DESC LIMIT ${limit}`;
    return rows.map((row) => parseDocumentFields(row.fields)?.fields.medicamentos ?? null);
  } catch {
    // Sem a migração do receituário: o compositor segue sem a lista.
    return [];
  }
}

/**
 * Quantas vezes cada modelo foi usado nos documentos deste médico (a clínica
 * toda, para o admin) — a aba "Mais usados" dos modelos. Os 1000 mais
 * recentes bastam; sem a tabela, nada conta.
 */
export async function templateUsage(professionalId: number | null): Promise<Record<number, number>> {
  try {
    const rows = professionalId
      ? await sql<{ fields: string | null }>`
          SELECT fields FROM documents
          WHERE revoked_at IS NULL AND professional_id = ${professionalId}
          ORDER BY id DESC LIMIT 1000`
      : await sql<{ fields: string | null }>`
          SELECT fields FROM documents WHERE revoked_at IS NULL ORDER BY id DESC LIMIT 1000`;
    return countTemplateUses(rows.map((row) => parseDocumentFields(row.fields)?.template_id));
  } catch {
    return {};
  }
}

export interface ClinicHeader {
  name: string;
  /** "Endereço · Telefone · CNPJ" — vazio quando nada foi configurado. */
  line: string;
  /** Código CNES do estabelecimento; impresso no receituário. */
  cnes: string;
}

/** Cabeçalho da folha (e da validação pública). Sem `settings`, o nome genérico. */
export async function getClinicHeader(): Promise<ClinicHeader> {
  try {
    const rows = await sql<{ key: string; value: string }>`
      SELECT key, value FROM settings
      WHERE key IN ('clinic_name', 'clinic_address', 'clinic_phone', 'clinic_document', 'clinic_cnes')`;
    const settings = Object.fromEntries(rows.map((row) => [row.key, row.value?.trim() ?? ""]));
    return {
      name: settings.clinic_name || "Clínica Renova",
      line: [settings.clinic_address, settings.clinic_phone, settings.clinic_document].filter(Boolean).join(" · "),
      cnes: settings.clinic_cnes ?? "",
    };
  } catch {
    return { name: "Clínica Renova", line: "", cnes: "" };
  }
}
