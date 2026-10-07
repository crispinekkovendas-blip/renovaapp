import crypto from "node:crypto";

/**
 * Código de acesso do portal do paciente: com a configuração `portal_pin`
 * ligada, quem abre `/p/<token>` precisa digitar os 4 últimos dígitos do
 * celular cadastrado antes de ver qualquer coisa. Aprovado, o navegador
 * guarda um cookie `renova_pin_<id>` assinado por 30 dias.
 *
 * Cookie = `<validade>.<HMAC-SHA256(segredo, "pin.<id>.<validade>")>` — o
 * servidor recompõe a assinatura a partir do id do paciente (que vem do token
 * verificado, nunca do cookie) e da validade escrita no próprio cookie. Sem
 * banco e sem Next aqui: tudo puro e testável em hub-pin.test.mjs.
 */

export const PIN_LENGTH = 4;
export const PIN_COOKIE_PREFIX = "renova_pin_";
export const PIN_COOKIE_DAYS = 30;

const EXPIRY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function pinCookieName(patientId: number): string {
  return `${PIN_COOKIE_PREFIX}${patientId}`;
}

/** Os 4 últimos dígitos do celular cadastrado; null quando o telefone não tem 4 dígitos. */
export function expectedPin(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < PIN_LENGTH) return null;
  return digits.slice(-PIN_LENGTH);
}

/** O que o paciente digitou, só dígitos; null se não forem exatamente 4. */
export function normalizePinInput(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const digits = input.replace(/\D/g, "");
  return digits.length === PIN_LENGTH ? digits : null;
}

/** Comparação em tempo constante — o PIN é curto, mas não custa nada. */
export function pinMatches(input: unknown, phone: string | null | undefined): boolean {
  const expected = expectedPin(phone);
  const given = normalizePinInput(input);
  if (!expected || !given) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

function hmac(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function signPinCookie(patientId: number, expiresAt: string, secret: string): string {
  return `${expiresAt}.${hmac(`pin.${patientId}.${expiresAt}`, secret)}`;
}

/**
 * Cookie válido para este paciente: formato certo, validade ainda não passada
 * (vale até o fim do dia, inclusive) e assinatura conferindo.
 */
export function verifyPinCookie(
  value: string | null | undefined,
  patientId: number,
  secret: string,
  today: string
): boolean {
  if (typeof value !== "string") return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;
  const expiresAt = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!EXPIRY_RE.test(expiresAt) || !signature) return false;
  if (expiresAt < today) return false;
  const expected = Buffer.from(hmac(`pin.${patientId}.${expiresAt}`, secret));
  const given = Buffer.from(signature);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
