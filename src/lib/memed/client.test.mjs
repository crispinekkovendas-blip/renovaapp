import { test } from "node:test";
import assert from "node:assert/strict";
import { getOrCreatePrescriberToken, getPrescriptionLinks } from "./client.ts";

const professional = {
  id: 7, name: "Marina Costa", specialty: "Clínica Geral", council: "CRM-SP 123456",
  cpf: "39053344705", board_code: "CRM", board_number: "123456", board_state: "SP",
  birth_date: "1985-05-15",
};

const env = {
  apiUrl: "https://api.test/v1", scriptUrl: "https://script.test/x.js",
  apiKey: "AK", secretKey: "SK",
};

function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET" });
    for (const [pattern, response] of routes) {
      if (String(url).includes(pattern) && (init.method ?? "GET") === response.method) {
        return { ok: response.status < 400, status: response.status, json: async () => response.body };
      }
    }
    throw new Error(`fake fetch: no route for ${init.method ?? "GET"} ${url}`);
  };
  return { fn, calls };
}

test("returns the token of an existing prescriber without creating one", async () => {
  const { fn, calls } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 200, body: { data: { attributes: { token: "TOK-EXIST" } } } }],
  ]);
  const token = await getOrCreatePrescriberToken(professional, { fetch: fn, config: env });
  assert.equal(token, "TOK-EXIST");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].method, "GET");
});

test("registers the prescriber when not found, then uses that token", async () => {
  const { fn, calls } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 404, body: {} }],
    ["/sinapse-prescricao/usuarios?", { method: "POST", status: 200, body: { data: { attributes: { token: "TOK-NEW" } } } }],
  ]);
  const token = await getOrCreatePrescriberToken(professional, { fetch: fn, config: env });
  assert.equal(token, "TOK-NEW");
  assert.equal(calls.length, 2);
  assert.equal(calls[1].method, "POST");
});

test("sends credentials as query params, never as a body or header", async () => {
  const { fn, calls } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 200, body: { data: { attributes: { token: "T" } } } }],
  ]);
  await getOrCreatePrescriberToken(professional, { fetch: fn, config: env });
  assert.match(calls[0].url, /api-key=AK/);
  assert.match(calls[0].url, /secret-key=SK/);
});

test("throws a clear error when Memed fails, so the UI can say something useful", async () => {
  const { fn } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 500, body: {} }],
  ]);
  await assert.rejects(
    () => getOrCreatePrescriberToken(professional, { fetch: fn, config: env }),
    /Memed/
  );
});

test("collects pdf and patient link, tolerating one of them failing", async () => {
  const { fn } = fakeFetch([
    ["/url-document/full", { method: "GET", status: 200, body: { data: [{ attributes: { link: "https://pdf", signed: 1 } }] } }],
    ["/get-digital-prescription-link", { method: "GET", status: 500, body: {} }],
  ]);
  const links = await getPrescriptionLinks("999", "TOK", { fetch: fn, config: env });
  assert.equal(links.pdfUrl, "https://pdf");
  assert.equal(links.patientLink, null);
  assert.equal(links.accessCode, null);
  assert.equal(links.signed, true);
});

/**
 * O formato real da homologação (2026-09-17): `data` é **array** e o campo é
 * `link`. O teste antigo usava `data.attributes.url`, um formato que a Memed
 * nunca devolveu — por isso o bug de link sempre nulo passou despercebido.
 */
test("reads the real Memed shape: data as an array, field named link", async () => {
  const { fn } = fakeFetch([
    ["/url-document/full", { method: "GET", status: 200,
      body: { data: [{ type: "prescricoes", attributes: { link: "https://memed/pdf", signed: 0 } }], meta: { total: 1 } } }],
    ["/get-digital-prescription-link", { method: "GET", status: 200,
      body: { data: [{ type: "prescricoes", attributes: { link: "https://assistant.memed.com.br/p/bR3mYj", digits: "3047" } }] } }],
  ]);
  const links = await getPrescriptionLinks("180568", "TOK", { fetch: fn, config: env });
  assert.equal(links.pdfUrl, "https://memed/pdf");
  assert.equal(links.patientLink, "https://assistant.memed.com.br/p/bR3mYj");
  assert.equal(links.accessCode, "3047");
  assert.equal(links.signed, false);
});

/**
 * O caso que travava tudo: o médico já tem conta na Memed com outro id externo,
 * então o GET pelo nosso id dá 404 e o POST dá 400. O id externo dele vem no
 * texto do erro — e o GET por ele devolve o token.
 */
test("recovers the token when the CPF already has a Memed account", async () => {
  const { fn, calls } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 404, body: {} }],
    ["/sinapse-prescricao/usuarios?", { method: "POST", status: 400, body: { errors: [{ code: "Cpf", title: "Erro",
      detail: "Medico ja cadastrado para o parceiro com esse cpf. Id externo (e7b8a2d1-5f42)" }] } }],
    ["/sinapse-prescricao/usuarios/e7b8a2d1-5f42", { method: "GET", status: 200,
      body: { data: { attributes: { token: "TOK-RECOVERED" } } } }],
  ]);
  const token = await getOrCreatePrescriberToken(professional, { fetch: fn, config: env });
  assert.equal(token, "TOK-RECOVERED");
  assert.equal(calls.length, 3);
});

test("falls back to the CPF when the error carries no external id", async () => {
  const { fn } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 404, body: {} }],
    ["/sinapse-prescricao/usuarios?", { method: "POST", status: 400, body: { errors: [{ detail: "Medico ja cadastrado." }] } }],
    ["/sinapse-prescricao/usuarios/39053344705", { method: "GET", status: 200,
      body: { data: { attributes: { token: "TOK-BY-CPF" } } } }],
  ]);
  assert.equal(await getOrCreatePrescriberToken(professional, { fetch: fn, config: env }), "TOK-BY-CPF");
});

test("surfaces what Memed actually complained about, not just the status", async () => {
  const { fn } = fakeFetch([
    ["/sinapse-prescricao/usuarios/renova-prof-7", { method: "GET", status: 404, body: {} }],
    ["/sinapse-prescricao/usuarios?", { method: "POST", status: 400, body: { errors: [{ detail: "CPF inválido." }] } }],
    ["/sinapse-prescricao/usuarios/39053344705", { method: "GET", status: 404, body: {} }],
  ]);
  await assert.rejects(
    () => getOrCreatePrescriberToken(professional, { fetch: fn, config: env }),
    /CPF inválido/
  );
});
