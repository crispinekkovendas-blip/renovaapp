import webpush from "web-push";
import type { ReminderPayload } from "./push";

/**
 * Envio de Web Push com `web-push` (VAPID). Separado de `push.ts` para a
 * parte pura continuar testável com `node --test` e importável no navegador.
 */

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type SendResult = { ok: true } | { ok: false; gone: boolean; error: string };

/** O aviso deixa de valer bem antes da consulta: 20 h de fila no serviço de push. */
const TTL_SECONDS = 60 * 60 * 20;

let configured = false;

/** VAPID configurado por ambiente; sem as chaves o envio é impossível. */
export function pushConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  const subject = process.env.VAPID_SUBJECT?.trim() || "https://renovaapp.vercel.app";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/**
 * Envia um lembrete a uma assinatura. Nunca lança: 404/410 significam que o
 * navegador cancelou a assinatura (`gone`), e o chamador a desativa.
 */
export async function sendReminder(target: PushTarget, payload: ReminderPayload): Promise<SendResult> {
  if (!pushConfigured()) return { ok: false, gone: false, error: "VAPID não configurado" };
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { TTL: TTL_SECONDS }
    );
    return { ok: true };
  } catch (error) {
    const status =
      error instanceof webpush.WebPushError
        ? error.statusCode
        : typeof (error as { statusCode?: unknown })?.statusCode === "number"
          ? ((error as { statusCode: number }).statusCode)
          : 0;
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      gone: status === 404 || status === 410,
      error: `${status ? `${status} ` : ""}${message}`.slice(0, 300),
    };
  }
}
