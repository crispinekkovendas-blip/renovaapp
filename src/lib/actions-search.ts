"use server";

import { sql } from "./db";
import { requireSession } from "./auth";

export interface PatientSuggestion {
  id: number;
  name: string;
  social_name: string | null;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
}

/** Sem acento e em minúsculas, nos dois lados da comparação ("Joao" acha "João"). */
const FOLD_FROM = "áàâãäéèêëíìîïóòôõöúùûüçñ";
const FOLD_TO = "aaaaaeeeeiiiiooooouuuucn";

/**
 * Sugestões da busca de paciente da tela inicial, a cada tecla: nome ou nome
 * social (sem acento, quem começa com o termo primeiro) e CPF ou celular
 * (só os dígitos, ignorando pontuação).
 */
export async function suggestPatientsAction(query: string): Promise<PatientSuggestion[]> {
  await requireSession();
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const folded = q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const digits = q.replace(/\D/g, "");
  const byDigits = digits.length >= 3 && digits.length >= q.replace(/[\s.\-()/]/g, "").length;
  const like = `%${folded}%`;
  const prefix = `${folded}%`;
  const digitsLike = `%${digits}%`;
  return sql<PatientSuggestion>`
    SELECT id, name, social_name, cpf, birth_date, phone
    FROM patients
    WHERE (${!byDigits} AND (
            translate(lower(name), ${FOLD_FROM}, ${FOLD_TO}) LIKE ${like}
         OR translate(lower(COALESCE(social_name, '')), ${FOLD_FROM}, ${FOLD_TO}) LIKE ${like}))
       OR (${byDigits} AND (
            regexp_replace(COALESCE(cpf, ''), '\\D', '', 'g') LIKE ${digitsLike}
         OR regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE ${digitsLike}))
    ORDER BY CASE WHEN translate(lower(name), ${FOLD_FROM}, ${FOLD_TO}) LIKE ${prefix} THEN 0 ELSE 1 END, name
    LIMIT 8`;
}
