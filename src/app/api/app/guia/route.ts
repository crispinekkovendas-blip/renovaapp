import { getSessionSecret } from "@/lib/auth";
import { appBundle } from "@/lib/app-bundle";
import { signAppToken } from "@/lib/app-token";
import { appSession, canUseGuide } from "@/lib/request-session";

/**
 * O Guia clínico inteiro para o app Android (app-bundle.ts). Com
 * `If-None-Match` igual à versão do aparelho, responde 304 sem corpo — a
 * sincronização de todo dia não baixa nada. Cada chamada devolve o token
 * renovado (mais 30 dias) no cabeçalho `X-Renova-Token`.
 */

export async function GET(request: Request) {
  const session = await appSession(request);
  if (!session) return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  if (!canUseGuide(session)) return Response.json({ error: "O Guia clínico é para profissionais de saúde." }, { status: 403 });

  const { bundle, json } = appBundle();
  const etag = `"${bundle.version}"`;
  const renewed = signAppToken(session.userId, getSessionSecret());
  const headers = {
    etag,
    "cache-control": "private, no-cache",
    "x-renova-token": renewed.token,
    "x-renova-token-expires": String(renewed.expiresAt),
    "x-renova-user": encodeURIComponent(session.name),
  };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(json, { headers: { ...headers, "content-type": "application/json; charset=utf-8" } });
}
