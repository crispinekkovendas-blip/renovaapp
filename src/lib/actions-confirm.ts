"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";
import { getSession, getSessionSecret } from "./auth";
import { signConfirmToken, verifyConfirmToken } from "./confirm-token.ts";
import { signPatientToken } from "./patient-token.ts";
import { addDaysISO, todayISO } from "./format";

/**
 * Confirmação pelo paciente: ações públicas, sem sessão. A autorização é o
 * próprio token assinado que veio no link do WhatsApp — quem tem o link pode
 * confirmar ou cancelar aquela consulta, e só ela, até o dia seguinte.
 */

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/**
 * Só um caminho do portal do paciente (`/p/<token>`) pode substituir a página
 * de confirmação como destino: relativo, sem `//`, sem query — o que evita
 * redirecionamento aberto a partir de um campo de formulário.
 */
const PORTAL_PATH = /^\/p\/[A-Za-z0-9_.-]+$/;

function pageFor(token: string, query = "", redirectTo = ""): string {
  if (PORTAL_PATH.test(redirectTo)) return `${redirectTo}${query}`;
  return `/confirmar/${encodeURIComponent(token || "invalido")}${query}`;
}

/**
 * Transições permitidas pelo paciente. Tudo o que já passou pela recepção
 * (em atendimento, concluído, faltou) ou já foi cancelado fica como está.
 */
const PATIENT_TRANSITIONS: Record<"confirmado" | "cancelado", string[]> = {
  confirmado: ["agendado"],
  cancelado: ["agendado", "confirmado"],
};

async function transitionByToken(formData: FormData, to: "confirmado" | "cancelado"): Promise<void> {
  const token = str(formData, "token");
  // Opcional: o portal do paciente envia `redirect_to=/p/<token>` para voltar
  // a ele em vez de cair na página de confirmação.
  const redirectTo = str(formData, "redirect_to");
  const verified = verifyConfirmToken(token, getSessionSecret(), todayISO());
  if (!verified) redirect(pageFor(token, redirectTo ? "?erro=estado" : "", redirectTo));

  const [appointment] = await sql<{ status: string }>`
    SELECT status FROM appointments WHERE id = ${verified.appointmentId}`;
  if (!appointment || !PATIENT_TRANSITIONS[to].includes(appointment.status)) {
    redirect(pageFor(token, "?erro=estado", redirectTo));
  }

  // Condicionado ao status lido: se a recepção mudou no meio, ninguém sobrescreve.
  const updated = await sql<{ id: number }>`
    UPDATE appointments SET status = ${to}
    WHERE id = ${verified.appointmentId} AND status = ${appointment.status}
    RETURNING id`;
  if (updated.length === 0) redirect(pageFor(token, "?erro=estado", redirectTo));

  revalidatePath("/", "layout");
  redirect(pageFor(token, `?ok=${to}`, redirectTo));
}

export async function confirmByTokenAction(formData: FormData): Promise<void> {
  await transitionByToken(formData, "confirmado");
}

export async function cancelByTokenAction(formData: FormData): Promise<void> {
  await transitionByToken(formData, "cancelado");
}

/**
 * Link absoluto de confirmação para um agendamento, válido até o dia seguinte
 * à consulta. Só para uso nas páginas autenticadas: como todo export de um
 * arquivo "use server" vira endpoint, exige sessão para ninguém de fora
 * conseguir gerar links assinados.
 */
export async function confirmLinkFor(appointmentId: number, date: string): Promise<string> {
  if (!(await getSession())) throw new Error("Sessão necessária para gerar link de confirmação.");

  const token = signConfirmToken(appointmentId, addDaysISO(date, 1), getSessionSecret());
  return `${await origin()}/confirmar/${token}`;
}

/**
 * Link absoluto do portal do paciente (`/p/<token>`), válido por 30 dias.
 * Mesma regra do link de confirmação: só com sessão, para ninguém de fora
 * gerar links assinados a partir do endpoint.
 */
export async function patientPortalLink(patientId: number): Promise<string> {
  if (!(await getSession())) throw new Error("Sessão necessária para gerar link do portal.");

  const token = signPatientToken(patientId, addDaysISO(todayISO(), 30), getSessionSecret());
  return `${await origin()}/p/${token}`;
}

/** Origem absoluta da requisição atual, respeitando o proxy (Vercel). */
async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const forwardedProto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
