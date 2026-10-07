import type { Patient } from "../db";
import { memedPatientExternalId } from "./prescription.ts";

export interface MemedPatient {
  idExterno: string;
  nome: string;
  sexo: "Feminino" | "Masculino";
  cpf?: string;
  data_nascimento?: string;
  telefone?: string;
  email?: string;
  cidade?: string;
  historia_clinica?: string;
}

/**
 * `patients.sex` é texto livre no banco (sem CHECK), então normalizamos aqui.
 * Vocabulário desta rota é "Feminino"/"Masculino" — diferente do cadastro de
 * prescritor, que usa "M"/"F".
 */
export function normalizePatientSex(sex: string | null): "Feminino" | "Masculino" | undefined {
  const value = (sex ?? "").trim().toUpperCase();
  if (value === "F" || value === "FEMININO") return "Feminino";
  if (value === "M" || value === "MASCULINO") return "Masculino";
  return undefined;
}

function toBrDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

/**
 * O que a Memed exige do paciente e que falta na ficha. Vazio = pode prescrever.
 *
 * `sexo` é obrigatório e só aceita masculino/feminino — não dá para omitir nem
 * para chutar, então paciente sem sexo preenchido é barrado aqui, com o nome do
 * campo, em vez de falhar dentro do módulo da Memed sem explicação. `email` e
 * `telefone` não são obrigatórios na API, mas a Memed exige os dois para
 * liberar credenciais de produção (ver 2026-08-18-memed-capacidades).
 */
export function missingMemedPatientFields(patient: Patient): string[] {
  const missing: string[] = [];
  if (!normalizePatientSex(patient.sex)) missing.push("sexo");
  if (!(patient.cpf ?? "").replace(/\D/g, "")) missing.push("CPF");
  if (!(patient.email ?? "").trim()) missing.push("e-mail");
  if (!(patient.phone ?? "").trim()) missing.push("telefone");
  if (!patient.birth_date) missing.push("data de nascimento");
  return missing;
}

/** A Memed corta a história clínica em 2000 caracteres. */
export const CLINICAL_HISTORY_MAX = 2000;

/** "Dipirona\nPenicilina" → "Dipirona, Penicilina" — o cadastro guarda uma por linha. */
function inline(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * A história clínica que vai para a Memed: alergias primeiro (é o que o
 * prescritor precisa ver antes de qualquer coisa), depois os medicamentos em
 * uso e por fim as observações livres. Cortada no limite da Memed — e como as
 * alergias vêm primeiro, o corte nunca as leva.
 */
export function clinicalHistory(
  patient: Pick<Patient, "allergies" | "medications" | "notes">,
  max = CLINICAL_HISTORY_MAX
): string {
  const parts: string[] = [];
  const allergies = inline(patient.allergies);
  if (allergies) parts.push(`Alergias: ${allergies}`);
  const medications = inline(patient.medications);
  if (medications) parts.push(`Medicamentos em uso: ${medications}`);
  const notes = (patient.notes ?? "").trim();
  if (notes) parts.push(notes);
  return parts.join("\n").slice(0, max);
}

/**
 * Payload do comando `setPaciente`. Campos vazios são omitidos em vez de irem
 * como string vazia — a Memed valida formato e recusa o lote inteiro.
 */
export function toMemedPatient(patient: Patient): MemedPatient {
  const sexo = normalizePatientSex(patient.sex);
  if (!sexo) {
    throw new Error("Paciente sem sexo definido: a Memed exige masculino ou feminino.");
  }

  const result: MemedPatient = {
    // O mesmo helper que a reconciliação usa para ler de volta: se as duas
    // pontas divergirem, a receita deixa de encontrar o paciente.
    idExterno: memedPatientExternalId(patient.id),
    nome: patient.name,
    sexo,
  };

  const cpf = (patient.cpf ?? "").replace(/\D/g, "");
  if (cpf) result.cpf = cpf;
  if (patient.birth_date) result.data_nascimento = toBrDate(patient.birth_date);

  const telefone = (patient.phone ?? "").replace(/\D/g, "");
  if (telefone) result.telefone = telefone;

  const email = (patient.email ?? "").trim();
  if (email) result.email = email;

  const cidade = (patient.city ?? "").trim();
  if (cidade) result.cidade = cidade;

  // Alergias + medicamentos em uso + observações, já no limite da Memed.
  const historia = clinicalHistory(patient);
  if (historia) result.historia_clinica = historia;

  return result;
}
