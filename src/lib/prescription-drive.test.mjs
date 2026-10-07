import { test } from "node:test";
import assert from "node:assert/strict";
import { PRESCRIPTION_DRIVE, driveDocs, driveRevisionLog, driveStats, findDriveEntry, revisionLines, rxLines } from "./prescription-drive/index.ts";

test("o Drive revisado tem as 90 entradas, cada uma com o que mudou e conteúdo", () => {
  const stats = driveStats();
  assert.equal(stats.entries, 90);
  assert.equal(stats.mantido + stats.ajustado + stats.refeito, 90);
  for (const s of PRESCRIPTION_DRIVE) {
    for (const e of s.entries) {
      assert.ok(e.changed, `sem "O que mudou": ${e.title}`);
      assert.ok(e.blocks.length > 0, e.title);
    }
  }
});

test("receita do .md vira itens com quantidade e posologia", () => {
  const items = rxLines(
    "USO ORAL (escolher 1)\n1. Nitrofurantoína 100 mg ..... 20 cápsulas\n   Tomar 1 cápsula de 6/6 h por 5 dias.\n   — ou —\n1. Fosfomicina 3 g ...... 1 envelope\n   Dissolver e tomar em dose única."
  );
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], {
    heading: "USO ORAL (escolher 1)",
    n: 1,
    name: "Nitrofurantoína 100 mg",
    quantity: "20 cápsulas",
    posology: ["Tomar 1 cápsula de 6/6 h por 5 dias.", "— ou —"],
  });
  assert.equal(items[1].heading, null);
  assert.equal(items[1].quantity, "1 envelope");
});

test("toda receita do Drive tem itens com nome", () => {
  for (const s of PRESCRIPTION_DRIVE) {
    for (const e of s.entries) {
      for (const b of e.blocks) {
        if (b.k !== "rx") continue;
        const items = rxLines(b.t);
        assert.ok(items.length > 0, e.title);
        for (const it of items) assert.ok(it.name || it.heading, `${e.title}: ${b.t.slice(0, 40)}`);
      }
    }
  }
});

test("busca e navegação: docs com remédios, vizinhos certos", () => {
  const docs = driveDocs();
  const amigdala = docs.find((d) => d.slug === "faringoamigdalite-bacteriana");
  assert.ok(amigdala.drugs.some((d) => d.startsWith("Amoxicilina")));
  assert.ok(amigdala.lines.some((l) => /Tonsilite/.test(l)));
  const loc = findDriveEntry("faringoamigdalite-bacteriana");
  assert.equal(loc.prev, null);
  assert.equal(loc.next.slug, "faringite-viral");
  assert.equal(findDriveEntry("nao-existe"), null);
});

test("revisões do Drive: antes e agora em linhas, sem quebrar o que está entre parênteses", () => {
  assert.deepEqual(revisionLines("Amoxicilina 500 mg — 21 cápsulas; 1 cápsula de 8/8 h por 7 dias"), [
    "Amoxicilina 500 mg — 21 cápsulas",
    "1 cápsula de 8/8 h por 7 dias",
  ]);
  assert.deepEqual(revisionLines("1–2 mg/kg (máx. 20 mg se < 2 anos; 30 mg se 2–5 anos) 1×/dia"), [
    "1–2 mg/kg (máx. 20 mg se < 2 anos; 30 mg se 2–5 anos) 1×/dia",
  ]);
  assert.equal(revisionLines(null), null);
  const log = driveRevisionLog();
  for (const r of log) {
    assert.ok(r.text && r.before && r.after, `${r.title}: revisão ${r.rev} sem motivo, antes ou agora`);
    assert.notEqual(r.before, r.after, `${r.title}: antes igual ao agora`);
  }
  assert.ok(log.some((r) => r.rev === 4));
});
