import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import type { Role } from "@/lib/db";
import { getSessionSecret } from "@/lib/auth";
import { signAppToken } from "@/lib/app-token";
import { loginFailed, loginLockedFor, loginSucceeded } from "@/lib/login-throttle";

/**
 * Login do app Android (Guia clínico): a mesma conta e a mesma conferência do
 * login do site (conta ativa, senha), mas devolve um token em vez do cookie.
 * Só administrador e profissional — o guia é para quem atende.
 */

// Conta inexistente também passa pelo bcrypt: a resposta não denuncia quais e-mails existem.
const DUMMY_HASH = bcrypt.hashSync("renova-guia-conta-inexistente", 10);

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Pedido inválido." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password || email.length > 200 || password.length > 200) {
    return Response.json({ error: "Informe o e-mail e a senha." }, { status: 400 });
  }

  const locked = loginLockedFor(email);
  if (locked > 0) {
    return Response.json(
      { error: `Muitas tentativas com este e-mail. Tente de novo em ${Math.ceil(locked / 60_000)} min.` },
      { status: 429 }
    );
  }

  const [user] = await sql<{ id: number; name: string; role: Role; password_hash: string }>`
    SELECT id, name, role, password_hash FROM users WHERE email = ${email} AND active = 1`;
  const ok = bcrypt.compareSync(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    loginFailed(email);
    return Response.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }
  if (user.role !== "admin" && user.role !== "profissional") {
    return Response.json({ error: "O Guia clínico é para profissionais de saúde." }, { status: 403 });
  }

  loginSucceeded(email);
  const { token, expiresAt } = signAppToken(user.id, getSessionSecret());
  return Response.json({ token, expiresAt, user: { name: user.name, role: user.role } }, { headers: { "cache-control": "no-store" } });
}
