import { parsePaymentEvent, verifyWebhookToken } from "@/lib/whatsapp/asaas";
import { caseForPayment, markPaid, methodLabel, reversePayment } from "@/lib/whatsapp/engine";

/**
 * Webhook de cobranças da ASAAS. Só passa com o cabeçalho
 * asaas-access-token igual a ASAAS_WEBHOOK_TOKEN. Responde 200 também para
 * eventos que não interessam — senão a ASAAS pausa a fila de webhooks.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  if (!verifyWebhookToken(request.headers.get("asaas-access-token"), process.env.ASAAS_WEBHOOK_TOKEN)) {
    return new Response("forbidden", { status: 401 });
  }
  const event = parsePaymentEvent(await request.json().catch(() => null));
  if (!event) return Response.json({ ok: true, ignorado: "sem pagamento" });

  const caseId = await caseForPayment(event.paymentId, event.externalReference);
  if (!caseId) return Response.json({ ok: true, ignorado: "cobrança de fora do WhatsApp" });

  if (event.paid) {
    const changed = await markPaid(caseId, { method: methodLabel(event.billingType), cents: event.cents, source: event.event });
    return Response.json({ ok: true, caso: caseId, pago: changed });
  }
  if (event.reversed) {
    await reversePayment(caseId, event.event);
    return Response.json({ ok: true, caso: caseId, revertido: true });
  }
  return Response.json({ ok: true, caso: caseId, evento: event.event });
}
