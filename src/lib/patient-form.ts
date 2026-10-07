import { lines, optional, str } from "./form-fields.ts";

/** O cadastro completo do paciente, como o formulário de /pacientes manda. */
export interface PatientForm {
  name: string;
  cpf: string | null;
  birthDate: string | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  insurance: string | null;
  insuranceNumber: string | null;
  city: string | null;
  notes: string | null;
  /** Uma por linha (ver `lines`). */
  allergies: string | null;
  medications: string | null;
  socialName: string | null;
}

/** Nome social: aparado, até 120 caracteres; null quando vazio. */
export function socialNameFrom(formData: FormData): string | null {
  return str(formData, "social_name").slice(0, 120) || null;
}

/** Lê o formulário de cadastro/edição; o mesmo para criar e para atualizar. */
export function readPatientForm(formData: FormData): PatientForm {
  return {
    name: str(formData, "name"),
    cpf: optional(formData, "cpf"),
    birthDate: optional(formData, "birth_date"),
    sex: optional(formData, "sex"),
    phone: optional(formData, "phone"),
    email: optional(formData, "email"),
    insurance: optional(formData, "insurance"),
    insuranceNumber: optional(formData, "insurance_number"),
    city: optional(formData, "city"),
    notes: optional(formData, "notes"),
    allergies: lines(formData, "allergies"),
    medications: lines(formData, "medications"),
    socialName: socialNameFrom(formData),
  };
}
