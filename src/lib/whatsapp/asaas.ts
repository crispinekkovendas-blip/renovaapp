import crypto from "node:crypto";
import { digits } from "./br.ts";

/**
 * ASAAS (cobrança): uma cobrança por teleconsulta, com o paciente escolhendo
 * Pix, boleto ou cartão na página da própria ASAAS (billingType UNDEFINED).
 * Variáveis na Vercel:
 *   ASAAS_API_KEY        chave da API ($aact_…)
 *   ASAAS_ENV            "sandbox" (padrão) ou "producao"
 *   ASAAS_WEBHOOK_TOKEN  o token que a ASAAS manda no cabeçalho asaas-access-token
 */

export function asaasBase(): string {
  // ASAAS_BASE_URL troca o endereço, se a ASAAS mudar o do sandbox outra vez.
  if (process.env.ASAAS_BASE_URL) return process.env.ASAAS_BASE_URL.replace(/\/$/, "");
  return process.env.ASAAS_ENV === "producao" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";
}

export function missingAsaasEnv(): string[] {
  return ["ASAAS_API_KEY", "ASAAS_WEBHOOK_TOKEN"].filter((name) => !process.env[name]);
}

export function asaasReady(): boolean {
  return Boolean(process.env.ASAAS_API_KEY);
}

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === "object" ? (v as Json) : {});
const text = (v: unknown): string => (typeof v === "string" ? v : "");

async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<Json> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  const res = await fetch(`${asaasBase()}${path}`, {
    method,
    headers: { "content-type": "application/json", access_token: key, "user-agent": "Renova/1.0" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = obj(await res.json().catch(() => ({})));
  if (!res.ok) {
    const errors = Array.isArray(data.errors) ? data.errors.map((e) => text(obj(e).description)).filter(Boolean) : [];
    throw new Error(`ASAAS ${res.status}: ${errors.join("; ") || "erro"}`);
  }
  return data;
}

/** O cliente da ASAAS para este CPF: reaproveita se já existe, senão cria. */
export async function ensureCustomer(input: { name: string; cpf: string; phone?: string | null; email?: string | null; ref: string }): Promise<string> {
  const cpf = digits(input.cpf);
  const found = await call("GET", `/customers?cpfCnpj=${cpf}&limit=1`);
  const existing = Array.isArray(found.data) ? text(obj(found.data[0]).id) : "";
  if (existing) return existing;
  const phone = digits(input.phone);
  const created = await call("POST", "/customers", {
    name: input.name.slice(0, 100),
    cpfCnpj: cpf,
    ...(phone.length >= 10 ? { mobilePhone: phone.startsWith("55") && phone.length > 11 ? phone.slice(2) : phone } : {}),
    ...(input.email ? { email: input.email } : {}),
    externalReference: input.ref,
    notificationDisabled: true,
  });
  const id = text(created.id);
  if (!id) throw new Error("ASAAS não devolveu o id do cliente");
  return id;
}

export interface Charge {
  id: string;
  url: string;
}

/** Cobrança com vencimento em `dueDate` (AAAA-MM-DD); o paciente escolhe a forma de pagamento. */
export async function createCharge(input: {
  customer: string;
  cents: number;
  dueDate: string;
  description: string;
  ref: string;
}): Promise<Charge> {
  const data = await call("POST", "/payments", {
    customer: input.customer,
    billingType: "UNDEFINED",
    value: Math.round(input.cents) / 100,
    dueDate: input.dueDate,
    description: input.description.slice(0, 500),
    externalReference: input.ref,
  });
  const id = text(data.id);
  const url = text(data.invoiceUrl);
  if (!id || !url) throw new Error("ASAAS não devolveu o link da cobrança");
  return { id, url };
}

/** O token do webhook confere (comparação em tempo constante). */
export function verifyWebhookToken(header: string | null, expected: string | undefined): boolean {
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export interface PaymentEvent {
  event: string;
  paymentId: string;
  externalReference: string | null;
  billingType: string | null;
  cents: number;
  /** O pagamento entrou (Pix/boleto compensado ou cartão confirmado). */
  paid: boolean;
  /** Estornado, apagado ou chargeback: a consulta volta a "aguardando pagamento". */
  reversed: boolean;
}

const PAID = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);
const REVERSED = new Set(["PAYMENT_REFUNDED", "PAYMENT_DELETED", "PAYMENT_CHARGEBACK_REQUESTED", "PAYMENT_REFUND_IN_PROGRESS"]);

export function parsePaymentEvent(body: unknown): PaymentEvent | null {
  const data = obj(body);
  const payment = obj(data.payment);
  const event = text(data.event);
  const paymentId = text(payment.id);
  if (!event || !paymentId) return null;
  return {
    event,
    paymentId,
    externalReference: text(payment.externalReference) || null,
    billingType: text(payment.billingType) || null,
    cents: Math.round(Number(payment.value || 0) * 100),
    paid: PAID.has(event),
    reversed: REVERSED.has(event),
  };
}

/** "PIX" → "pix", "CREDIT_CARD" → "cartão de crédito"…, como aparece no Financeiro. */
export function methodLabel(billingType: string | null): string {
  switch (billingType) {
    case "PIX":
      return "pix";
    case "CREDIT_CARD":
      return "cartão de crédito";
    case "DEBIT_CARD":
      return "cartão de débito";
    case "BOLETO":
      return "boleto";
    default:
      return "asaas";
  }
}
