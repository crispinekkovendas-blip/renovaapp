import { test } from "node:test";
import assert from "node:assert/strict";
import { CURRENT_ORTHO_REVISION, ORTHO_CHANGES, ORTHO_REVISIONS, orthoRevisionItems, orthoRevisionStats, orthoTopicRevised } from "./revisions.ts";
import { ORTHO_GUIDE, findOrthoTopic, orthoSlugs } from "./index.ts";

const topicText = (slug) => JSON.stringify(findOrthoTopic(slug).topic);

/** "Nome — posologia" quando o nome é de uma receita do tópico (ou, com `any`, de qualquer formato nome — posologia). */
function rxOf(slug, text, any = false) {
  const i = text.indexOf(" — ");
  if (i < 0) return null;
  const name = text.slice(0, i);
  if (!any && !findOrthoTopic(slug).topic.rx.some((r) => r.name === name)) return null;
  return [name, text.slice(i + 3)];
}

test("toda mudança aponta para um tópico real, numa revisão registrada, com antes, agora e motivo", () => {
  const slugs = new Set(orthoSlugs());
  const revs = new Set(ORTHO_REVISIONS.map((r) => r.n));
  assert.ok(ORTHO_CHANGES.length >= 1);
  for (const c of ORTHO_CHANGES) {
    assert.ok(slugs.has(c.slug), c.slug);
    assert.ok(revs.has(c.rev), `${c.slug}: revisão ${c.rev}`);
    assert.ok(c.before && c.after && c.before !== c.after, `${c.slug}: antes/agora`);
    assert.ok(c.why.length > 40, `${c.slug}: motivo curto`);
    for (const s of c.alsoIn ?? []) assert.ok(slugs.has(s), `${c.slug} também em ${s}`);
  }
});

test("o guia mostra o texto de agora e não guarda mais o de antes", () => {
  for (const c of ORTHO_CHANGES) {
    for (const slug of [c.slug, ...(c.alsoIn ?? [])]) {
      const text = topicText(slug);
      if (c.section === "CID") {
        assert.equal(findOrthoTopic(slug).topic.cid, c.after);
      } else if (c.section.startsWith("Receita") && rxOf(slug, c.after)) {
        // Nome e posologia da receita, separados por " — ".
        const [name, posology] = rxOf(slug, c.after);
        assert.ok(findOrthoTopic(slug).topic.rx.some((r) => r.name === name && r.posology === posology), `${slug}: receita de agora`);
        const old = rxOf(slug, c.before, true);
        if (old) assert.ok(!findOrthoTopic(slug).topic.rx.some((r) => r.name === old[0] && r.posology === old[1]), `${slug}: receita de antes ainda está lá`);
      } else {
        assert.ok(text.includes(JSON.stringify(c.after).slice(1, -1)), `${slug}: texto de agora não está no tópico (${c.section})`);
        assert.ok(!text.includes(JSON.stringify(c.before).slice(1, -1)), `${slug}: texto de antes ainda está no tópico (${c.section})`);
      }
    }
  }
});

test("os itens da lista de Revisões têm id estável e único, e o resumo marca o que mudou", () => {
  const items = [...orthoRevisionItems(2), ...orthoRevisionItems()];
  assert.equal(items.length, ORTHO_CHANGES.filter((c) => c.rev === 2 || c.rev === CURRENT_ORTHO_REVISION).length);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  assert.deepEqual(items.map((i) => i.id), [...orthoRevisionItems(2), ...orthoRevisionItems()].map((i) => i.id));
  assert.ok(orthoRevisionItems().some((i) => i.where === "Encaminhar → Cirurgia e regulação" && i.after[0].startsWith("Sai da sua mão")));
  for (const i of items) {
    assert.match(i.id, /^ortopedia-\d+-[0-9a-f]{8}$/);
    assert.match(i.href, /^\/guia\/ortopedia\//);
    assert.ok(i.concise[0].parts.some((p) => p.k !== "eq"), `${i.title}: diff sem mudança`);
  }
  const tramadol = items.find((i) => i.where.includes("Tramadol"));
  assert.match(tramadol.text, /Vale também em: Lombalgia aguda/);
});

test("o tópico sabe quantas mudanças o tocam, inclusive por trecho compartilhado", () => {
  assert.ok(orthoTopicRevised("analgesia-em-escada", 2) >= 2);
  assert.ok(orthoTopicRevised("lombalgia-aguda", 2) >= 2, "lombalgia herda tramadol e AINE");
  assert.equal(orthoTopicRevised("como-pedir-o-raio-x", 2), 0);
  assert.ok(orthoTopicRevised("como-pedir-o-raio-x") >= 1, "na 3ª revisão todo tópico antigo mudou");
  assert.equal(orthoTopicRevised("fratura-exposta"), 0, "tópico novo não tem 'antes'");
  const { changes, topics } = orthoRevisionStats();
  assert.ok(changes >= 80 && topics >= 36, `${changes} mudanças em ${topics} tópicos`);
  // A 2ª revisão continua inteira e conferível.
  const r2 = orthoRevisionStats(2);
  assert.ok(r2.changes >= 8 && r2.topics >= 25);
  assert.equal(CURRENT_ORTHO_REVISION, 3);
  assert.ok(ORTHO_GUIDE.length >= 8);
});
