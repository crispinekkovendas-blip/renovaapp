"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { sql } from "./db";
import { requireSession } from "./auth";
import { MAX_TEMPLATES, checkLogo, normalizeSheetStyle, templatesFor } from "./sheet-style";
import type { SheetTemplate } from "./sheet-style";
import { TEMPLATES_KEY, loadSheetTemplates, logoKey } from "./sheet-templates-db";

/**
 * Modelos da folha (receituário e documentos): enviar logotipo, salvar e
 * apagar modelos. Recepção não mexe em modelo; o profissional salva os dele
 * e os da clínica só o administrador.
 */

type Result<T> = { ok: true } & T | { ok: false; error: string };

async function requireEditor() {
  const session = await requireSession();
  if (session.role === "recepcao") throw new Error("permissao");
  return session;
}

/** Logotipo (data URL) → guardado uma vez, devolve o hash que o estilo usa. */
export async function uploadSheetLogoAction(dataUrl: string): Promise<Result<{ hash: string }>> {
  try {
    await requireEditor();
  } catch {
    return { ok: false, error: "Sem permissão para mudar o modelo da folha." };
  }
  const check = checkLogo(String(dataUrl ?? ""));
  if (!check.ok) return { ok: false, error: check.reason };
  const hash = crypto.createHash("sha256").update(dataUrl).digest("hex").slice(0, 32);
  await sql`
    INSERT INTO settings (key, value) VALUES (${logoKey(hash)}, ${dataUrl})
    ON CONFLICT (key) DO NOTHING`;
  return { ok: true, hash };
}

async function writeTemplates(all: SheetTemplate[]) {
  await sql`
    INSERT INTO settings (key, value) VALUES (${TEMPLATES_KEY}, ${JSON.stringify(all)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  revalidatePath("/pacientes", "layout");
}

/**
 * Salva um modelo novo ou substitui um existente (mesmo `id`). "clinica"
 * fica para todos; "meu", só para o profissional da sessão (ou o escolhido,
 * quando quem salva é o administrador).
 */
export async function saveSheetTemplateAction(input: {
  id?: string | null;
  name: string;
  scope: "meu" | "clinica";
  professionalId?: number | null;
  style: unknown;
}): Promise<Result<{ templates: SheetTemplate[]; id: string }>> {
  let session;
  try {
    session = await requireEditor();
  } catch {
    return { ok: false, error: "Sem permissão para salvar modelo." };
  }
  const name = String(input.name ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!name) return { ok: false, error: "Dê um nome ao modelo." };
  if (input.scope === "clinica" && session.role !== "admin") {
    return { ok: false, error: "Só o administrador salva modelos para a clínica toda." };
  }
  const owner =
    input.scope === "clinica"
      ? null
      : session.role === "profissional"
        ? session.professionalId
        : Number.isInteger(input.professionalId) && (input.professionalId as number) > 0
          ? (input.professionalId as number)
          : null;
  if (input.scope === "meu" && owner === null) return { ok: false, error: "Escolha o profissional dono do modelo." };

  const all = await loadSheetTemplates();
  const existing = input.id ? all.find((t) => t.id === input.id) : undefined;
  if (existing && !(session.role === "admin" || existing.professional_id === session.professionalId)) {
    return { ok: false, error: "Esse modelo é de outro profissional." };
  }
  if (!existing && all.length >= MAX_TEMPLATES) return { ok: false, error: `Limite de ${MAX_TEMPLATES} modelos. Apague algum antes.` };

  const template: SheetTemplate = {
    id: existing?.id ?? crypto.randomUUID().slice(0, 12),
    name,
    professional_id: owner,
    style: normalizeSheetStyle(input.style),
  };
  const next = existing ? all.map((t) => (t.id === existing.id ? template : t)) : [...all, template];
  await writeTemplates(next);
  return { ok: true, id: template.id, templates: templatesFor(next, session.role === "profissional" ? session.professionalId : owner) };
}

export async function deleteSheetTemplateAction(id: string): Promise<Result<{ templates: SheetTemplate[] }>> {
  let session;
  try {
    session = await requireEditor();
  } catch {
    return { ok: false, error: "Sem permissão." };
  }
  const all = await loadSheetTemplates();
  const target = all.find((t) => t.id === id);
  if (!target) return { ok: false, error: "Modelo não encontrado." };
  if (!(session.role === "admin" || (target.professional_id !== null && target.professional_id === session.professionalId))) {
    return { ok: false, error: "Esse modelo não é seu." };
  }
  const next = all.filter((t) => t.id !== id);
  await writeTemplates(next);
  return { ok: true, templates: session.role === "admin" ? next : templatesFor(next, session.professionalId) };
}
