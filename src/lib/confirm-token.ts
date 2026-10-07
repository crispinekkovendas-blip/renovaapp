import crypto from "node:crypto";

/**
 * Token do link de confirmação que o paciente recebe pelo WhatsApp.
 *
 * Formato: base64url("<id>.<validade>") + "." + base64url(HMAC-SHA256).
 * A validade vai no próprio token para não precisar de tabela nova; o segredo
 * e a data de hoje chegam por parâmetro para as funções serem puras e testáveis.
 */

const PAYLOAD = /^(\d{1,15})\.(\d{4}-\d{2}-\d{2})$/;

function hmac(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signConfirmToken(appointmentId: number, expiresAt: string, secret: string): string {
  const payload = Buffer.from(`${appointmentId}.${expiresAt}`, "utf8").toString("base64url");
  return `${payload}.${hmac(payload, secret)}`;
}

/**
 * Retorna o id do agendamento, ou null se o token for malformado, tiver
 * assinatura inválida ou já estiver vencido (`expiresAt < today`). O token
 * vale até o fim do dia de validade, inclusive.
 */
export function verifyConfirmToken(
  token: string,
  secret: string,
  today: string
): { appointmentId: number } | null {
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

  const appointmentId = Number(id);
  if (!Number.isSafeInteger(appointmentId) || appointmentId <= 0) return null;
  return { appointmentId };
}
