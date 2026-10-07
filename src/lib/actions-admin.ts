"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { getSession } from "./auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/dashboard");
  return session;
}

export async function createApiKeyAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) redirect("/configuracoes/api?erro=label");

  const token = `rnv_${crypto.randomBytes(16).toString("hex")}`;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  await sql`INSERT INTO api_keys (label, key_hash, key_prefix)
    VALUES (${label}, ${hash}, ${token.slice(0, 12)})`;
  revalidatePath("/", "layout");
  redirect(`/configuracoes/api?nova=${token}`);
}

export async function toggleApiKeyAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = Number(String(formData.get("id") ?? ""));
  if (id) await sql`UPDATE api_keys SET active = 1 - active WHERE id = ${id}`;
  revalidatePath("/", "layout");
  redirect("/configuracoes/api");
}

/**
 * Apaga TODOS os dados clínicos — o caminho para entregar o sistema a uma
 * clínica real sem os pacientes de demonstração.
 *
 * Remove: pagamentos, prontuários, agendamentos, lista de espera e pacientes.
 * Preserva: usuários, profissionais, horários, chaves de API e dados da clínica
 * — é a equipe e a configuração, não dado de paciente.
 *
 * Não há como distinguir retroativamente linha semeada de linha real (o seed
 * não marca nada), então isto é um reset completo e não uma limpeza seletiva.
 * Irreversível: só roda com a palavra APAGAR digitada.
 */
export async function wipeClinicalDataAction(formData: FormData): Promise<void> {
  await requireAdmin();

  if (String(formData.get("confirmacao") ?? "").trim() !== "APAGAR") {
    redirect("/configuracoes?erro=confirmacao_limpeza");
  }

  // Ordem obrigatória: as filhas primeiro, senão as FKs recusam o DELETE.
  await sql`DELETE FROM payments`;
  await sql`DELETE FROM encounters`;
  await sql`DELETE FROM appointments`;
  await sql`DELETE FROM waitlist`;
  await sql`DELETE FROM patients`;

  revalidatePath("/", "layout");
  redirect("/configuracoes?ok=limpeza");
}
