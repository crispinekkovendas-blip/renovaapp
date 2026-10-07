"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { requireRole, requireSession } from "./auth";

const MIN_LENGTH = 6;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

/**
 * Troca de senha pelo próprio usuário. Exige a senha atual — sem isso, uma
 * sessão roubada bastaria para tomar a conta em definitivo.
 */
export async function changeOwnPasswordAction(formData: FormData): Promise<void> {
  const session = await requireSession();

  const current = str(formData, "current_password");
  const next = str(formData, "password");
  const confirm = str(formData, "password_confirm");

  if (next.length < MIN_LENGTH) redirect("/conta?erro=curta");
  if (next !== confirm) redirect("/conta?erro=confirmacao");

  const [user] = await sql<{ password_hash: string }>`
    SELECT password_hash FROM users WHERE id = ${session.userId} AND active = 1`;
  if (!user) redirect("/login");
  if (!bcrypt.compareSync(current, user.password_hash)) redirect("/conta?erro=atual");
  if (bcrypt.compareSync(next, user.password_hash)) redirect("/conta?erro=igual");

  await sql`UPDATE users SET password_hash = ${bcrypt.hashSync(next, 10)} WHERE id = ${session.userId}`;
  revalidatePath("/", "layout");
  redirect("/conta?ok=senha");
}

/**
 * Reset administrativo: define a senha de qualquer usuário sem conhecer a
 * anterior. É o caminho para quem esqueceu a senha, já que não há e-mail
 * transacional configurado no projeto.
 */
export async function adminSetPasswordAction(formData: FormData): Promise<void> {
  await requireRole("admin");

  const id = Number(str(formData, "id"));
  const next = str(formData, "password");
  if (!id) redirect("/configuracoes");
  if (next.length < MIN_LENGTH) redirect("/configuracoes?erro=senha_curta");

  const [user] = await sql<{ id: number }>`SELECT id FROM users WHERE id = ${id}`;
  if (!user) redirect("/configuracoes");

  await sql`UPDATE users SET password_hash = ${bcrypt.hashSync(next, 10)} WHERE id = ${id}`;
  revalidatePath("/", "layout");
  redirect("/configuracoes?ok=senha");
}
