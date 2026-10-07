"use server";

import { sql } from "./db";
import { getSessionSecret } from "./auth";
import { verifyPatientToken } from "./patient-token";
import { todayISO } from "./format";

/**
 * Assinaturas de Web Push do portal do paciente. Ações públicas, sem sessão:
 * a autorização é o token assinado do link (`/p/<token>`), e o id do paciente
 * sai sempre dele — nunca do cliente. Uma assinatura pertence a um aparelho;
 * o mesmo endpoint reaberto por outro link passa a ser do paciente novo.
 */

/** O `PushSubscription.toJSON()` do navegador, sem confiar em nada dele. */
export interface PushSubscriptionInput {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: Record<string, string>;
}

export type PushActionResult =
  | { ok: true }
  | { ok: false; error: "token" | "assinatura" | "indisponivel" | "erro"; detail?: string };

const KEY_CHARS = /^[A-Za-z0-9_=+/-]{8,512}$/;

/** Tabela ainda não migrada (42P01) ou coluna ausente (42703). */
function migrationPending(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === "42P01" || code === "42703";
}

/** Código e começo da mensagem do Postgres — o que o card mostra em "Detalhe". */
function describeDbError(error: unknown): string {
  const e = error as { code?: string; message?: string } | null;
  return `${e?.code ?? "?"} ${String(e?.message ?? "").slice(0, 120)}`.trim();
}

function validSubscription(sub: PushSubscriptionInput): { endpoint: string; p256dh: string; auth: string } | null {
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint.trim() : "";
  const p256dh = typeof sub?.keys?.p256dh === "string" ? sub.keys.p256dh.trim() : "";
  const auth = typeof sub?.keys?.auth === "string" ? sub.keys.auth.trim() : "";
  if (!/^https:\/\/[^\s]{8,2048}$/.test(endpoint)) return null;
  if (!KEY_CHARS.test(p256dh) || !KEY_CHARS.test(auth)) return null;
  return { endpoint, p256dh, auth };
}

export async function subscribePushAction(
  token: string,
  sub: PushSubscriptionInput,
  userAgent?: string | null
): Promise<PushActionResult> {
  const verified = verifyPatientToken(String(token ?? ""), getSessionSecret(), todayISO());
  if (!verified) return { ok: false, error: "token" };

  const valid = validSubscription(sub);
  if (!valid) return { ok: false, error: "assinatura" };
  const ua = typeof userAgent === "string" && userAgent.trim() ? userAgent.trim().slice(0, 300) : null;

  try {
    await sql`
      INSERT INTO push_subscriptions (patient_id, endpoint, p256dh, auth, user_agent)
      VALUES (${verified.patientId}, ${valid.endpoint}, ${valid.p256dh}, ${valid.auth}, ${ua})
      ON CONFLICT (endpoint) DO UPDATE SET
        patient_id = EXCLUDED.patient_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        disabled = 0,
        last_error = NULL`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: migrationPending(error) ? "indisponivel" : "erro", detail: describeDbError(error) };
  }
}

/** Remove só assinaturas do próprio paciente do token; endpoint alheio não é tocado. */
export async function unsubscribePushAction(token: string, endpoint: string): Promise<PushActionResult> {
  const verified = verifyPatientToken(String(token ?? ""), getSessionSecret(), todayISO());
  if (!verified) return { ok: false, error: "token" };
  const clean = typeof endpoint === "string" ? endpoint.trim() : "";
  if (!clean) return { ok: false, error: "assinatura" };

  try {
    await sql`
      DELETE FROM push_subscriptions
      WHERE patient_id = ${verified.patientId} AND endpoint = ${clean}`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error: migrationPending(error) ? "indisponivel" : "erro" };
  }
}
