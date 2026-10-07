import crypto from "node:crypto";

/**
 * Token do portal do paciente (`/p/[token]`): a página pessoal, sem login,
 * onde o paciente vê a próxima consulta, as receitas digitais e o histórico.
 *
 * Mesma construção do token de confirmação — base64url("pac.<id>.<validade>")
 * + "." + base64url(HMAC-SHA256) — mas com o prefixo `pac.` no payload: um
 * token de confirmação nunca verifica como token de portal, nem o contrário,
 * mesmo assinados pelo mesmo segredo. Segredo e data chegam por parâmetro
 * para as funções serem puras e testáveis.
 */

const PAYLOAD = /^pac\.(\d{1,15})\.(\d{4}-\d{2}-\d{2})$/;

function hmac(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signPatientToken(patientId: number, expiresAt: string, secret: string): string {
  const payload = Buffer.from(`pac.${patientId}.${expiresAt}`, "utf8").toString("base64url");
  return `${payload}.${hmac(payload, secret)}`;
}

/**
 * Retorna o id do paciente, ou null se o token for malformado, tiver
 * assinatura inválida, for de outro tipo (confirmação) ou já estiver vencido
 * (`expiresAt < today`). Vale até o fim do dia de validade, inclusive.
 */
export function verifyPatientToken(
  token: string,
  secret: string,
  today: string
): { patientId: number } | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!payload || !signature) return null;

  const expected = Buffer.from(hmac(payload, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;

  const match = Buffer.from(payload, "base64url").toString("utf8").match(PAYLOAD);
  if (!match) return null;
  const [, id, expiresAt] = match;
  if (expiresAt < today) return null;

  const patientId = Number(id);
  if (!Number.isSafeInteger(patientId) || patientId <= 0) return null;
  return { patientId };
}
