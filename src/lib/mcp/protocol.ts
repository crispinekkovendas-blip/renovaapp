/**
 * MCP (Model Context Protocol) por HTTP, sem SDK: o Claude (Code ou claude.ai)
 * conversa com o Renova em JSON-RPC 2.0 num único POST /api/mcp. Sem sessão e
 * sem streaming — cada pedido é respondido em JSON, o que basta para
 * ferramentas que leem e escrevem no banco.
 */

export const SERVER_INFO = { name: "renova", version: "1.0.0" };

/** Da mais nova para a mais antiga; responde com a que o cliente pediu se a conhecermos. */
export const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

export interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** true quando a ferramenta só lê (o cliente pode chamar sem pedir confirmação). */
  readOnly?: boolean;
  run(args: Record<string, unknown>): Promise<unknown>;
}

/** Erro que vira resposta legível para o modelo (isError), não falha do protocolo. */
export class ToolError extends Error {}

type Id = string | number | null;
interface RpcRequest {
  jsonrpc?: unknown;
  id?: Id;
  method?: unknown;
  params?: Record<string, unknown>;
}

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

function ok(id: Id, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function fail(id: Id, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function describe(tool: Tool) {
  return {
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: { title: tool.title, readOnlyHint: Boolean(tool.readOnly), destructiveHint: false },
  };
}

async function callTool(tools: Tool[], params: Record<string, unknown> | undefined) {
  const tool = tools.find((t) => t.name === params?.name);
  if (!tool) return null;
  const args = (params?.arguments ?? {}) as Record<string, unknown>;
  try {
    const result = await tool.run(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: Array.isArray(result) ? { items: result } : result,
    };
  } catch (error) {
    if (!(error instanceof ToolError)) console.error(`[mcp] ${tool.name}`, error);
    const message = error instanceof ToolError ? error.message : "Erro interno ao executar a ferramenta.";
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

/** Uma mensagem JSON-RPC → resposta (ou null para notificações, que não têm resposta). */
export async function handleMessage(tools: Tool[], message: RpcRequest): Promise<unknown | null> {
  if (!message || typeof message !== "object" || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return fail(message?.id ?? null, INVALID_REQUEST, "Pedido JSON-RPC inválido.");
  }
  const isNotification = !("id" in message) || message.id === undefined;
  if (isNotification) return null;
  const id = message.id ?? null;

  switch (message.method) {
    case "initialize": {
      const asked = message.params?.protocolVersion;
      const version = typeof asked === "string" && PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0];
      return ok(id, {
        protocolVersion: version,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Renova: prontuário da clínica. Dados de pacientes são sensíveis (LGPD): leia só o que a tarefa pede. " +
          "Antes de criar um paciente, procure por nome, CPF e celular para não duplicar. " +
          "Escritas vão direto para o banco de produção.",
      });
    }
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: tools.map(describe) });
    case "tools/call": {
      const result = await callTool(tools, message.params);
      return result ? ok(id, result) : fail(id, INVALID_PARAMS, `Ferramenta desconhecida: ${String(message.params?.name)}`);
    }
    default:
      return fail(id, METHOD_NOT_FOUND, `Método não suportado: ${message.method}`);
  }
}

/** Corpo do POST (uma mensagem ou um lote) → corpo da resposta, ou null quando só havia notificações. */
export async function handleBody(tools: Tool[], raw: string): Promise<unknown | null> {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail(null, PARSE_ERROR, "JSON inválido.");
  }
  if (Array.isArray(body)) {
    if (body.length === 0) return fail(null, INVALID_REQUEST, "Lote vazio.");
    const replies = (await Promise.all(body.map((m) => handleMessage(tools, m as RpcRequest)))).filter((r) => r !== null);
    return replies.length ? replies : null;
  }
  return handleMessage(tools, body as RpcRequest);
}
