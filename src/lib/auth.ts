import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "./db";

const COOKIE_NAME = "renova_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

export interface Session {
  userId: number;
  name: string;
  role: Role;
  professionalId: number | null;
}

let cachedSecret: string | null = null;

function getSecret(): string {
  if (cachedSecret) return cachedSecret;
  if (process.env.SESSION_SECRET) {
    cachedSecret = process.env.SESSION_SECRET;
    return cachedSecret;
  }
  // Fallback para dev local sem env: segredo persistido em data/secret.key.
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const secretFile = path.join(dataDir, "secret.key");
  if (!fs.existsSync(secretFile)) {
    fs.writeFileSync(secretFile, crypto.randomBytes(32).toString("hex"), "utf8");
  }
  cachedSecret = fs.readFileSync(secretFile, "utf8").trim();
  return cachedSecret;
}

/**
 * Mesmo segredo da sessão, para outros tokens assinados pelo servidor (ex.: o
 * link de confirmação que o paciente recebe pelo WhatsApp).
 */
export function getSessionSecret(): string {
  return getSecret();
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

/** Só o que a sessão guarda — quem chama não precisa buscar o usuário inteiro. */
export async function createSession(user: Pick<User, "id" | "name" | "role" | "professional_id">): Promise<void> {
  const session: Session = {
    userId: user.id,
    name: user.name,
    role: user.role,
    professionalId: user.professional_id,
  };
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  (await cookies()).set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/**
 * Lida uma vez por requisição: o layout, a página e as seções chamam de novo
 * sem refazer o HMAC.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const cookie = (await cookies()).get(COOKIE_NAME);
  if (!cookie?.value) return null;
  const [payload, signature] = cookie.value.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
});

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** Exige sessão válida. Sem sessão → /login. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Exige um dos perfis informados. Esconder o item do menu não é controle de
 * acesso — as rotas protegidas chamam isto no layout do segmento, então uma URL
 * digitada à mão cai no mesmo bloqueio.
 */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect("/dashboard");
  return session;
}
