import crypto from "node:crypto";

/**
 * O acesso do app Android ao Guia clínico: um token assinado com o mesmo
 * segredo da sessão do site, que vai no cabeçalho `Authorization: Bearer` e
 * vence sozinho — 30 dias, renovado a cada sincronização. Guarda só o id da
 * conta: nome e perfil vêm do banco a cada uso, e conta desativada perde o
 * acesso na hora (request-session.ts).
 *
 * A assinatura leva o prefixo "app:", então um token do app nunca vale como
 * cookie da sessão, nem o contrário.
 */

export const APP_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface AppTokenPayload {
  kind: "app";
  userId: number;
  /** Quando vence (epoch em ms). */
  exp: number;
}

function hmac(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`app:${body}`).digest("base64url");
}

export function signAppToken(userId: number, secret: string, now = Date.now()): { token: string; expiresAt: number } {
  const payload: AppTokenPayload = { kind: "app", userId, exp: now + APP_TOKEN_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return { token: `app.${body}.${hmac(body, secret)}`, expiresAt: payload.exp };
}

/** O id da conta, se o token é deste servidor e ainda vale. */
export function verifyAppToken(token: string, secret: string, now = Date.now()): number | null {
  const [prefix, body, signature, extra] = token.split(".");
  if (prefix !== "app" || !body || !signature || extra !== undefined) return null;
  const a = Buffer.from(signature);
  const b = Buffer.from(hmac(body, secret));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<AppTokenPayload>;
    if (p.kind !== "app" || !Number.isInteger(p.userId) || typeof p.exp !== "number" || p.exp <= now) return null;
    return p.userId as number;
  } catch {
    return null;
  }
}
