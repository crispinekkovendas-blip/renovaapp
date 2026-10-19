import { test } from "node:test";
import assert from "node:assert/strict";
import { PROTOCOL_VERSIONS, ToolError, handleBody } from "./protocol.ts";

const tools = [
  {
    name: "eco",
    title: "Eco",
    description: "Devolve o que recebeu",
    readOnly: true,
    inputSchema: { type: "object", properties: { x: { type: "string" } } },
    run: async (args) => ({ recebi: args.x }),
  },
  {
    name: "recusa",
    title: "Recusa",
    description: "Sempre recusa",
    inputSchema: { type: "object", properties: {} },
    run: async () => {
      throw new ToolError("CPF já cadastrado");
    },
  },
  {
    name: "quebra",
    title: "Quebra",
    description: "Erro inesperado",
    inputSchema: { type: "object", properties: {} },
    run: async () => {
      throw new Error("senha do banco no texto do erro");
    },
  },
];

const call = (message) => handleBody(tools, JSON.stringify(message));

test("initialize devolve a versão pedida, ou a mais nova se for desconhecida", async () => {
  const known = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
  assert.equal(known.result.protocolVersion, "2025-06-18");
  assert.ok(known.result.capabilities.tools);
  const unknown = await call({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } });
  assert.equal(unknown.result.protocolVersion, PROTOCOL_VERSIONS[0]);
});

test("notificação não tem resposta", async () => {
  assert.equal(await call({ jsonrpc: "2.0", method: "notifications/initialized" }), null);
});

test("tools/list descreve as ferramentas com a dica de só leitura", async () => {
  const reply = await call({ jsonrpc: "2.0", id: 3, method: "tools/list" });
  assert.deepEqual(reply.result.tools.map((t) => t.name), ["eco", "recusa", "quebra"]);
  assert.equal(reply.result.tools[0].annotations.readOnlyHint, true);
  assert.equal(reply.result.tools[1].annotations.readOnlyHint, false);
});

test("tools/call devolve texto e conteúdo estruturado", async () => {
  const reply = await call({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "eco", arguments: { x: "oi" } } });
  assert.deepEqual(reply.result.structuredContent, { recebi: "oi" });
  assert.match(reply.result.content[0].text, /"recebi": "oi"/);
});

test("erro previsto vai para o modelo; erro inesperado não vaza detalhes", async () => {
  const refused = await call({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "recusa" } });
  assert.equal(refused.result.isError, true);
  assert.equal(refused.result.content[0].text, "CPF já cadastrado");
  const original = console.error;
  console.error = () => {};
  try {
    const broken = await call({ jsonrpc: "2.0", id: 6, method: "tools/call", params: { name: "quebra" } });
    assert.equal(broken.result.isError, true);
    assert.doesNotMatch(broken.result.content[0].text, /senha/);
  } finally {
    console.error = original;
  }
});

test("ferramenta, método e JSON inválidos viram erros JSON-RPC", async () => {
  assert.equal((await call({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "nada" } })).error.code, -32602);
  assert.equal((await call({ jsonrpc: "2.0", id: 8, method: "resources/list" })).error.code, -32601);
  assert.equal((await handleBody(tools, "{")).error.code, -32700);
  assert.equal((await call({ id: 9, method: "ping" })).error.code, -32600);
});

test("lote responde só aos pedidos, na ordem", async () => {
  const replies = await call([
    { jsonrpc: "2.0", id: "a", method: "ping" },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: "b", method: "tools/list" },
  ]);
  assert.deepEqual(replies.map((r) => r.id), ["a", "b"]);
});
