import type { Role } from "./db";

/**
 * Quem pode emitir, revogar e duplicar documento médico.
 *
 * Documento médico é ato do médico: o profissional emite **sempre em nome
 * próprio**, e o formulário não escolhe outro por ele; o administrador pode
 * emitir por qualquer profissional (é quem configura e cobre a clínica). A
 * recepção vê, imprime e envia, mas não assina nada.
 */

export interface IssuerSession {
  role: Role;
  professionalId: number | null;
}

/** Pode emitir documento? */
export function canIssueDocuments(session: IssuerSession): boolean {
  if (session.role === "admin") return true;
  return session.role === "profissional" && isId(session.professionalId);
}

/**
 * Em nome de quem o documento sai: o profissional logado, ignorando o que o
 * formulário mandou; o admin, o profissional escolhido. `null` = não pode
 * emitir, ou o admin não escolheu ninguém.
 */
export function issuerProfessionalId(session: IssuerSession, requested: number): number | null {
  if (session.role === "profissional") return isId(session.professionalId) ? session.professionalId : null;
  if (session.role === "admin") return isId(requested) ? requested : null;
  return null;
}

/** Pode revogar ou duplicar este documento? O profissional, só os próprios. */
export function canActOnDocument(session: IssuerSession, documentProfessionalId: number): boolean {
  if (session.role === "admin") return true;
  return session.role === "profissional" && isId(session.professionalId) && session.professionalId === documentProfessionalId;
}

function isId(value: number | null): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}
