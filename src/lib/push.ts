/**
 * Lembretes por Web Push e portal instalável — a parte pura, sem `web-push`
 * e sem banco. Roda no servidor (cron) e no navegador (portal do paciente),
 * e é testada com `node --test`. O envio em si fica em `push-send.ts`.
 */

/** Chave do localStorage onde o portal guarda o último link aberto. */
export const HUB_TOKEN_KEY = "renova_hub_token";

export const APP_TZ = "America/Sao_Paulo";

/** Limites do aviso: o Android corta o título perto de 60 e o corpo perto de 120 caracteres. */
export const TITLE_MAX = 60;
export const BODY_MAX = 120;

export interface ReminderInput {
  appointmentId: number;
  firstName: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:MM */
  start_time: string;
  professional: string;
  clinic: string;
  url: string;
  /** agendado | confirmado */
  status: string;
  /** Data de hoje (São Paulo). Com ela o texto diz "amanhã" só quando é amanhã mesmo. */
  today?: string;
}

/** Exatamente o JSON que `public/sw.js` lê no evento `push`. */
export interface ReminderPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** Dia seguinte a uma data YYYY-MM-DD, sem depender do fuso do processo. */
export function targetDateFor(todayISO: string): string {
  const [y, m, d] = todayISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

/** Agora em São Paulo, no formato texto que o banco usa (`YYYY-MM-DD HH:MM:SS`). */
export function stampSaoPaulo(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/** Corta no limite com reticências; nunca devolve mais que `max` caracteres. */
export function clampText(text: string, max: number): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/**
 * O aviso que chega no celular na véspera. Título curto com o nome, corpo
 * com hora e profissional; a clínica entra só se couber. Confirmada, o texto
 * tranquiliza; agendada, chama para confirmar (o clique abre o portal).
 */
export function reminderPayload(input: ReminderInput): ReminderPayload {
  const day = `${input.date.slice(8, 10)}/${input.date.slice(5, 7)}`;
  const isTomorrow = input.today ? targetDateFor(input.today) === input.date : true;
  const firstName = clampText(input.firstName || "Olá", 20);
  const professional = clampText(input.professional, 40);

  const title = clampText(
    isTomorrow ? `${firstName}, sua consulta é amanhã` : `${firstName}, consulta dia ${day}`,
    TITLE_MAX
  );

  const when = isTomorrow ? "Amanhã" : `Dia ${day}`;
  const lead = `${when} às ${input.start_time} com ${professional}`;
  const tail =
    input.status === "confirmado" ? "Presença confirmada — até lá!" : "Toque para confirmar sua presença.";
  const withClinic = input.clinic ? `${lead}, na ${clampText(input.clinic, 40)}. ${tail}` : "";
  const body = withClinic && withClinic.length <= BODY_MAX ? withClinic : clampText(`${lead}. ${tail}`, BODY_MAX);

  return { title, body, url: input.url, tag: `lembrete-${input.appointmentId}` };
}

export interface RecallInput {
  encounterId: number;
  firstName: string;
  professional: string;
  /** YYYY-MM-DD — a data recomendada do retorno. */
  dueDate: string;
  url: string;
}

/**
 * O aviso de retorno, três dias antes da data recomendada. Mesmo formato do
 * lembrete (o `sw.js` só conhece um): título com o nome, corpo com a data e
 * o profissional, e o clique abre o portal, onde "Agendar retorno" espera.
 */
export function recallPayload(input: RecallInput): ReminderPayload {
  const day = `${input.dueDate.slice(8, 10)}/${input.dueDate.slice(5, 7)}`;
  const firstName = clampText(input.firstName || "Olá", 20);
  const professional = clampText(input.professional, 40);
  const title = clampText(`${firstName}, hora de marcar seu retorno`, TITLE_MAX);
  const body = clampText(`Retorno com ${professional} recomendado para ${day}. Toque para agendar.`, BODY_MAX);
  return { title, body, url: input.url, tag: `retorno-${input.encounterId}` };
}

function base64urlToBase64(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return base64 + "=".repeat((4 - (base64.length % 4)) % 4);
}

/** Decodifica base64url em bytes (funciona no navegador e no Node). */
export function decodeBase64url(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64urlToBase64(value));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** A chave pública VAPID (base64url) no formato que `pushManager.subscribe` aceita. */
export function applicationServerKey(publicKey: string): Uint8Array<ArrayBuffer> {
  return decodeBase64url(publicKey.trim());
}

const TOKEN_PAYLOAD = /^pac\.(\d{1,15})\.(\d{4}-\d{2}-\d{2})$/;

/**
 * Lê o conteúdo de um token do portal SEM verificar a assinatura (o cliente
 * não tem o segredo). Serve só para o navegador saber se o link já venceu
 * antes de guardá-lo ou de abri-lo; quem autoriza de verdade é o servidor.
 */
export function readTokenExpiry(token: string): { patientId: number; expiresAt: string } | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  let decoded: string;
  try {
    decoded = new TextDecoder().decode(decodeBase64url(parts[0]));
  } catch {
    return null;
  }
  const match = decoded.match(TOKEN_PAYLOAD);
  if (!match) return null;
  const patientId = Number(match[1]);
  if (!Number.isSafeInteger(patientId) || patientId <= 0) return null;
  return { patientId, expiresAt: match[2] };
}

/**
 * iPhone/iPad (inclusive iPadOS se apresentando como Mac). No iOS o push só
 * funciona depois de adicionar o portal à Tela de Início.
 */
export function isIos(userAgent: string, platform = "", maxTouchPoints = 0): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return platform === "MacIntel" && maxTouchPoints > 1;
}
