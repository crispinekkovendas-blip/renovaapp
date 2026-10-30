import { sql } from "@/lib/db";
import type { Session } from "@/lib/auth";
import { parseDocumentFields } from "./documents";
import { parseItems } from "./prescription";
import type { PrescriptionItem } from "./prescription";
import type { IssuedRx } from "./receituario";

/**
 * Consultas das telas do Receituário. Tolerantes como documents-db.ts: sem a
 * migração dos documentos (ou dos rascunhos), devolvem [] e a tela mostra o
 * estado vazio.
 */

/**
 * De quem são as receitas que a sessão vê: o profissional, só as dele; o
 * admin, as da clínica toda (ou de um profissional, se filtrar). Profissional
 * sem cadastro vinculado não vê nenhuma (-1 não casa com nada).
 */
export function rxScope(session: Session, professionalFilter?: number | null): number | null {
  if (session.role === "admin") return professionalFilter && professionalFilter > 0 ? professionalFilter : null;
  return session.professionalId ?? -1;
}

export interface IssuedRxRow extends IssuedRx {
  code: string;
  revokedAt: string | null;
  professionalName: string;
  encounterId: number | null;
  patientPhone: string | null;
}

interface RawRx {
  id: number;
  patient_id: number;
  patient_name: string;
  social_name: string | null;
  issued_at: string;
  code: string;
  revoked_at: string | null;
  fields: string | null;
  professional_name: string;
  encounter_id: number | null;
  patient_phone: string | null;
}

function toRow(row: RawRx): IssuedRxRow {
  return {
    docId: Number(row.id),
    patientId: Number(row.patient_id),
    patientName: row.social_name?.trim() || row.patient_name,
    issuedAt: String(row.issued_at).slice(0, 10),
    items: parseItems(parseDocumentFields(row.fields)?.fields.medicamentos ?? null) as PrescriptionItem[],
    code: row.code,
    revokedAt: row.revoked_at,
    professionalName: row.professional_name,
    encounterId: row.encounter_id === null ? null : Number(row.encounter_id),
    patientPhone: row.patient_phone,
  };
}

/**
 * Receitas emitidas, a mais nova primeiro. `q` procura no paciente (nome,
 * nome social, CPF) e no código RNV; o filtro por medicamento é feito por quem
 * chama, sobre a lista já lida (o nome do remédio mora dentro do JSON).
 */
export async function listIssuedPrescriptions(opts: {
  professionalId: number | null;
  q?: string;
  from?: string | null;
  to?: string | null;
  includeRevoked?: boolean;
  limit?: number;
}): Promise<IssuedRxRow[]> {
  const like = opts.q?.trim() ? `%${opts.q.trim()}%` : null;
  const from = opts.from || null;
  const to = opts.to || null;
  try {
    // Nome social lido via to_jsonb: a coluna só existe depois da migração 2026-09-16.
    const rows = await sql<RawRx>`
      SELECT d.id, d.patient_id, p.name AS patient_name, to_jsonb(p) ->> 'social_name' AS social_name,
        d.issued_at, d.code, d.revoked_at, d.fields, pr.name AS professional_name, d.encounter_id, p.phone AS patient_phone
      FROM documents d
      JOIN patients p ON p.id = d.patient_id
      JOIN professionals pr ON pr.id = d.professional_id
      WHERE d.kind = 'receituario'
        AND (${opts.professionalId}::bigint IS NULL OR d.professional_id = ${opts.professionalId})
        AND (${opts.includeRevoked ?? false}::boolean OR d.revoked_at IS NULL)
        AND (${from}::text IS NULL OR d.issued_at >= ${from})
        AND (${to}::text IS NULL OR d.issued_at <= ${to})
        AND (${like}::text IS NULL OR p.name ILIKE ${like} OR COALESCE(to_jsonb(p) ->> 'social_name', '') ILIKE ${like}
             OR COALESCE(p.cpf, '') ILIKE ${like} OR d.code ILIKE ${like})
      ORDER BY d.issued_at DESC, d.id DESC
      LIMIT ${opts.limit ?? 1000}`;
    return rows.map(toRow);
  } catch {
    return [];
  }
}

export interface RecentDraft {
  id: number;
  patientId: number;
  patientName: string;
  title: string;
  updatedAt: string;
}

/** Os rascunhos que esta pessoa deixou montados, em qualquer paciente. */
export async function listMyDrafts(session: Session, limit = 12): Promise<RecentDraft[]> {
  try {
    const rows = await sql<{ id: number; patient_id: number; name: string; title: string; updated_at: string }>`
      SELECT d.id, d.patient_id, p.name, d.title, d.updated_at
      FROM document_drafts d
      JOIN patients p ON p.id = d.patient_id
      WHERE d.user_id = ${session.userId}
         OR (${session.professionalId}::bigint IS NOT NULL AND d.professional_id = ${session.professionalId})
      ORDER BY d.updated_at DESC, d.id DESC
      LIMIT ${limit}`;
    return rows.map((row) => ({
      id: Number(row.id),
      patientId: Number(row.patient_id),
      patientName: row.name,
      title: row.title,
      updatedAt: String(row.updated_at),
    }));
  } catch {
    return [];
  }
}

export interface PatientPick {
  id: number;
  name: string;
  cpf: string | null;
  birth_date: string | null;
  allergies: string | null;
  /** A última receita (de qualquer profissional): data YYYY-MM-DD e id, para o "Renovar". */
  last_rx: string | null;
  last_rx_id: number | null;
}

/**
 * Para quem é a receita: a busca por nome, nome social, CPF ou telefone; sem
 * termo, os pacientes atendidos ou receitados mais recentemente.
 */
export async function pickPatients(q: string, limit = 12): Promise<PatientPick[]> {
  const term = q.trim();
  try {
    if (term) {
      const like = `%${term}%`;
      return await sql<PatientPick>`
        SELECT p.id, COALESCE(NULLIF(btrim(to_jsonb(p) ->> 'social_name'), ''), p.name) AS name, p.cpf, p.birth_date, p.allergies,
          last.issued_at AS last_rx, last.id AS last_rx_id
        FROM patients p
        LEFT JOIN LATERAL (
          SELECT d.id, d.issued_at FROM documents d
          WHERE d.patient_id = p.id AND d.kind = 'receituario' AND d.revoked_at IS NULL
          ORDER BY d.issued_at DESC, d.id DESC LIMIT 1
        ) last ON true
        WHERE p.name ILIKE ${like} OR COALESCE(to_jsonb(p) ->> 'social_name', '') ILIKE ${like}
           OR COALESCE(p.cpf, '') ILIKE ${like} OR COALESCE(p.phone, '') ILIKE ${like}
        ORDER BY p.name
        LIMIT ${limit}`;
    }
    // Sem busca: quem passou por aqui por último (consulta ou documento).
    return await sql<PatientPick>`
      SELECT p.id, COALESCE(NULLIF(btrim(to_jsonb(p) ->> 'social_name'), ''), p.name) AS name, p.cpf, p.birth_date, p.allergies,
        last.issued_at AS last_rx, last.id AS last_rx_id
      FROM patients p
      LEFT JOIN LATERAL (
        SELECT d.id, d.issued_at FROM documents d
        WHERE d.patient_id = p.id AND d.kind = 'receituario' AND d.revoked_at IS NULL
        ORDER BY d.issued_at DESC, d.id DESC LIMIT 1
      ) last ON true
      JOIN (
        SELECT patient_id, MAX(date) AS seen FROM encounters GROUP BY patient_id
        UNION ALL
        SELECT patient_id, MAX(issued_at) AS seen FROM documents GROUP BY patient_id
      ) recent ON recent.patient_id = p.id
      GROUP BY p.id, last.id, last.issued_at
      ORDER BY MAX(recent.seen) DESC
      LIMIT ${limit}`;
  } catch {
    return [];
  }
}
