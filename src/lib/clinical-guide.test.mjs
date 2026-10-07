import { test } from "node:test";
import assert from "node:assert/strict";
import { GUIDE_ORIENTATION, guideEntries, orientationText } from "./clinical-guide.ts";
import { RX_PROTOCOLS } from "./rx-library/protocols.ts";
import { ORIENTACOES } from "./document-library/orientacoes.ts";

test("o guia mostra todas as receitas prontas, cada uma com seus medicamentos", () => {
  const entries = guideEntries();
  assert.equal(entries.length, RX_PROTOCOLS.length);
  for (const entry of entries) assert.ok(entry.items.length > 0, entry.name);
});

test("toda ligação receita → orientação aponta para as duas que existem", () => {
  const protocols = new Set(RX_PROTOCOLS.map((p) => p.name));
  const orientations = new Set(ORIENTACOES.map((t) => t.name));
  for (const [protocol, orientation] of Object.entries(GUIDE_ORIENTATION)) {
    assert.ok(protocols.has(protocol), `receita pronta inexistente: ${protocol}`);
    assert.ok(orientations.has(orientation), `orientação inexistente: ${orientation}`);
  }
});

test("a orientação sai sem campos sobrando", () => {
  const text = orientationText("Orientações para {{paciente}}\n\nBeba água.\n\nEm caso de dúvida, fale com a {{clinica}}.");
  assert.equal(text, "Beba água.\n\nEm caso de dúvida, fale com a clínica.");
  for (const entry of guideEntries()) {
    if (entry.orientation) assert.doesNotMatch(entry.orientation.text, /\{\{/, entry.name);
  }
});

test("o histórico de revisão só fala de receitas que existem, e cada mudança mostra o antes e o depois", async () => {
  const { RX_CHANGES } = await import("./rx-library/review.ts");
  const { CURRENT_REVISION, GUIDE_REVISIONS } = await import("./guide-revisions.ts");
  const protocols = new Set(RX_PROTOCOLS.map((p) => p.name));
  const revs = new Set(GUIDE_REVISIONS.map((r) => r.n));
  for (const [name, changes] of Object.entries(RX_CHANGES)) {
    assert.ok(protocols.has(name), `revisão de receita inexistente: ${name}`);
    for (const c of changes) {
      assert.ok(revs.has(c.rev), `${name}: revisão ${c.rev} não existe`);
      assert.ok(c.text.length > 20, name);
    }
  }
  for (const entry of guideEntries()) {
    for (const c of entry.changes) {
      if (c.kind === "receita") assert.ok(c.after.length > 0, entry.name);
      // Receita que já existia antes da revisão tem foto do "antes", e a mudança aparece nela.
      if (c.rev > 1 && c.kind === "receita" && !c.text.startsWith("Nova")) {
        assert.ok(c.before, `${entry.name}: sem foto antes da revisão ${c.rev}`);
        assert.notDeepEqual(c.before, c.after, `${entry.name}: revisão ${c.rev} sem mudança na receita`);
      }
    }
  }
  assert.ok(guideEntries().some((e) => e.changes.some((c) => c.rev === CURRENT_REVISION)));
  // Mudança registrada numa orientação compartilhada aponta para um modelo que existe e chega às receitas dele.
  const { ORIENTATION_CHANGES } = await import("./rx-library/review.ts");
  const { ORIENTACOES } = await import("./document-library/orientacoes.ts");
  for (const [name, changes] of Object.entries(ORIENTATION_CHANGES)) {
    assert.ok(ORIENTACOES.some((t) => t.name === name), `orientação inexistente: ${name}`);
    for (const c of changes) assert.ok(revs.has(c.rev), name);
    assert.ok(guideEntries().some((e) => e.changes.some((c) => c.template === name)), `${name}: nenhuma receita ligada`);
  }
});

test("receita que muda sem registro é pega: a de agora só difere da última foto se houver mudança registrada depois dela", async () => {
  const { readFileSync } = await import("node:fs");
  const { RX_CHANGES } = await import("./rx-library/review.ts");
  const history = JSON.parse(readFileSync(new URL("./rx-library/history.json", import.meta.url), "utf8"));
  const last = Math.max(...Object.keys(history).map(Number));
  for (const entry of guideEntries()) {
    const photo = history[last][entry.name];
    if (!photo) continue;
    const now = entry.items.map((i) => `${i.name} · ${i.quantity} — ${i.posology}`);
    const logged = (RX_CHANGES[entry.name] ?? []).some((c) => c.rev > last && (c.kind ?? "receita") === "receita");
    assert.equal(JSON.stringify(now) !== JSON.stringify(photo), logged, `${entry.name}: receita e registro não batem`);
  }
});

test("anemia por falta de ferro sai com a dose de tratamento (80 mg de ferro por dia)", () => {
  const anemia = guideEntries().find((e) => e.name === "Anemia por falta de ferro");
  assert.match(anemia.items[0].posology, /2 comprimidos juntos \(80 mg de ferro\) 1 vez ao dia/);
  assert.equal(anemia.items[0].quantity, "180 comprimidos");
});
