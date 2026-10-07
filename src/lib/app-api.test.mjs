import { test } from "node:test";
import assert from "node:assert/strict";
import { APP_TOKEN_TTL_MS, signAppToken, verifyAppToken } from "./app-token.ts";
import { loginFailed, loginLockedFor, loginSucceeded } from "./login-throttle.ts";
import { appBundle } from "./app-bundle.ts";
import { guideChunks } from "./emergency-guide/chunks.ts";
import { buildIndex, search } from "./smart-search.ts";

const SECRET = "segredo-de-teste";

test("token do app: vale 30 dias, só deste servidor, e não se confunde com o cookie do site", () => {
  const now = 1_000_000;
  const { token, expiresAt } = signAppToken(42, SECRET, now);
  assert.equal(expiresAt, now + APP_TOKEN_TTL_MS);
  assert.equal(verifyAppToken(token, SECRET, now + 1000), 42);
  assert.equal(verifyAppToken(token, SECRET, expiresAt), null, "vencido");
  assert.equal(verifyAppToken(token, "outro-segredo", now), null, "outro servidor");
  const [, body, sig] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ kind: "app", userId: 1, exp: now + 1e9 })).toString("base64url");
  assert.equal(verifyAppToken(`app.${forged}.${sig}`, SECRET, now), null, "corpo trocado");
  // Formato do cookie do site (payload.assinatura): nunca vale como token do app.
  assert.equal(verifyAppToken(`${body}.${sig}`, SECRET, now), null);
  assert.equal(verifyAppToken(`${token}.x`, SECRET, now), null);
  assert.equal(verifyAppToken("", SECRET, now), null);
});

test("login do app: 5 senhas erradas travam o e-mail por 15 minutos; acertar limpa", () => {
  const key = "medico@renova.test";
  const t0 = 5_000_000;
  for (let i = 0; i < 4; i++) loginFailed(key, t0 + i);
  assert.equal(loginLockedFor(key, t0 + 10), 0, "4 erros ainda deixam tentar");
  loginFailed(key, t0 + 20);
  assert.ok(loginLockedFor(key, t0 + 30) > 14 * 60_000, "5º erro trava");
  assert.equal(loginLockedFor(key, t0 + 20 + 15 * 60_000), 0, "destrava depois de 15 min");
  loginFailed("outro@renova.test", t0);
  loginSucceeded("outro@renova.test");
  assert.equal(loginLockedFor("outro@renova.test", t0), 0);
});

test("pacote do app: as três abas, ids únicos e iguais aos da busca e das citações", () => {
  const { bundle, json } = appBundle();
  assert.match(bundle.version, /^[0-9a-f]{16}$/);
  assert.equal(appBundle().bundle.version, bundle.version, "versão estável");
  assert.equal(bundle.receitas.items.length, 73);
  const topics = bundle.plantao.chapters.flatMap((c) => c.topics);
  const entries = bundle.drive.sections.flatMap((s) => s.entries);
  assert.equal(topics.length, 122);
  assert.equal(entries.length, 90);

  const ids = [...bundle.receitas.items.map((r) => r.id), ...topics.map((t) => t.id), ...entries.map((e) => e.id)];
  assert.equal(new Set(ids).size, ids.length, "id repetido");
  assert.deepEqual(new Set(bundle.search.docs.map((d) => d.id)), new Set(ids), "a busca indexa exatamente os itens do app");
  assert.deepEqual(new Set(bundle.search.items.map((d) => d.id)), new Set(ids));

  // Toda citação possível da Super Inteligência abre um item do app.
  const recipeSlugs = new Set(bundle.receitas.items.map((r) => r.slug));
  const topicSlugs = new Set(topics.map((t) => t.slug));
  const driveSlugs = new Set(entries.map((e) => e.slug));
  for (const chunk of guideChunks()) {
    const slug = chunk.id.split("#")[0];
    if (slug.startsWith("receita-")) assert.ok(recipeSlugs.has(slug.slice("receita-".length)), chunk.id);
    else if (slug.startsWith("drive-")) assert.ok(driveSlugs.has(slug.slice("drive-".length)), chunk.id);
    else assert.ok(topicSlugs.has(slug), chunk.id);
  }

  // Os grupos do aviso de revisão apontam para itens que existem.
  const all = new Set(ids);
  for (const r of bundle.changes) for (const t of r.tabs) for (const g of t.groups) if (g.target) assert.ok(all.has(g.target), g.target);
  assert.equal(bundle.changes[0].rev, bundle.revision.current, "a revisão atual vem primeiro");

  assert.ok(!/Licensed to|kevintuco/i.test(json), "o pacote nunca leva a marca d'água do e-book");
  assert.ok(json.length < 3_000_000, `pacote grande demais: ${json.length}`);
});

test("pacote do app: a busca montada com ele acha nas três fontes", () => {
  const { bundle } = appBundle();
  const index = buildIndex(bundle.search.docs);
  const top = search(index, "enxaqueca").hits.slice(0, 3).map((h) => h.id.split(":")[0]);
  assert.deepEqual(new Set(top), new Set(["receitas", "plantao", "drive"]));
  const drive = bundle.drive.sections.flatMap((s) => s.entries).find((e) => e.slug === "enxaqueca");
  assert.ok(drive.blocks.some((b) => b.k === "rx" && b.rx.length > 0), "receita do Drive item por item");
  assert.ok(drive.history.slides[0].kind === "original", "o histórico começa no card original");
});
