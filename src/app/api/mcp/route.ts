import { requireApiKey } from "@/lib/api-auth";
import { handleBody } from "@/lib/mcp/protocol";
import { TOOLS } from "@/lib/mcp/tools";

/**
 * Servidor MCP do Renova (Streamable HTTP, sem sessão): o Claude conecta com
 * uma chave de API criada em Configurações › Integrações.
 *   claude mcp add --transport http renova https://<site>/api/mcp --header "Authorization: Bearer rnv_..."
 */

export const dynamic = "force-dynamic";

function unauthorized(): Response {
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Chave de API ausente ou inválida." } },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="renova"' } },
  );
}

export async function POST(request: Request) {
  if (!(await requireApiKey(request))) return unauthorized();
  const reply = await handleBody(TOOLS, await request.text());
  if (reply === null) return new Response(null, { status: 202 });
  return Response.json(reply);
}

/** Sem fluxo de eventos do servidor: o cliente usa só POST. */
export async function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
