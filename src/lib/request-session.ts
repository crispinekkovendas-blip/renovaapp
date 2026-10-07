import { sql } from "./db.ts";
import type { Role } from "./db.ts";
import { getSession, getSessionSecret } from "./auth.ts";
import type { Session } from "./auth.ts";
import { verifyAppToken } from "./app-token.ts";

/**
 * Quem está chamando uma rota de API: o app Android (token no cabeçalho
 * `Authorization: Bearer`) ou o site (cookie da sessão).
 *
 * Pelo token, a conta é conferida no banco a cada chamada: desativada, o app
 * perde o acesso na próxima sincronização; nome e perfil vêm sempre atuais.
 */

export async function appSession(request: Request): Promise<Session | null> {
  const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) return null;
  const userId = verifyAppToken(match[1], getSessionSecret());
  if (userId === null) return null;
  const [user] = await sql<{ id: number; name: string; role: Role; professional_id: number | null }>`
    SELECT id, name, role, professional_id FROM users WHERE id = ${userId} AND active = 1`;
  if (!user) return null;
  return { userId: user.id, name: user.name, role: user.role, professionalId: user.professional_id };
}

/** A sessão da requisição: com Authorization vale só o token do app; sem ele, o cookie do site. */
export async function requestSession(request: Request): Promise<Session | null> {
  if (request.headers.has("authorization")) return appSession(request);
  return getSession();
}

/** O guia é para quem atende: administrador e profissional. */
export function canUseGuide(session: Session): boolean {
  return session.role === "admin" || session.role === "profissional";
}
