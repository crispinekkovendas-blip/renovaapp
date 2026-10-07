import { sql } from "@/lib/db";
import type { MemedPrescription } from "./db";

/**
 * Leitura de `memed_prescriptions`, usada pelo prontuário e pelo portal.
 *
 * `SELECT *` de propósito: `access_code`, `signed` e `issued_at` chegaram na
 * migração 2026-09-17 e nomeá-las derrubaria a consulta inteira antes dela
 * (42703). Com `*`, as colunas novas simplesmente não vêm e os campos ficam
 * indefinidos — mesma tolerância que `documents-db` usa com `row_to_json`.
 */

/** As colunas novas podem não existir ainda; por isso opcionais. */
export type PrescriptionRow = Omit<MemedPrescription, "access_code" | "signed" | "issued_at"> & {
  access_code?: string | null;
  signed?: number | null;
  issued_at?: string | null;
};

export async function prescriptionsForPatient(patientId: number): Promise<PrescriptionRow[]> {
  // Sem a tabela (instalação sem Memed), a seção só não aparece.
  return sql<PrescriptionRow>`
    SELECT * FROM memed_prescriptions
    WHERE patient_id = ${patientId} AND status = 'emitida'
    ORDER BY id DESC`.catch(() => [] as PrescriptionRow[]);
}

/**
 * A data a mostrar: a que a Memed carimbou na receita quando existe, senão a
 * da linha daqui. Importa na reconciliação, que traz receitas de semanas atrás
 * — nelas o `created_at` local é hoje, e mostrar hoje seria mentira.
 */
export function prescriptionDate(row: PrescriptionRow): string {
  return (row.issued_at || row.created_at).slice(0, 10);
}

/**
 * Só afirma "assinada digitalmente" quando a Memed confirmou. Antes da
 * migração o campo não existe: aí o app não sabe, e não sabendo não afirma.
 */
export function isSigned(row: PrescriptionRow): boolean {
  return row.signed === 1;
}
