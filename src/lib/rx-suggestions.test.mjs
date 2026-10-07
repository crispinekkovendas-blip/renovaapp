import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DOSES,
  RX_PROTOCOLS,
  RX_PROTOCOL_GROUPS,
  concKey,
  doseEntryFor,
  suggestionsForItem,
  applyDose,
  protocolItems,
  searchProtocols,
  frequentItems,
  previousFor,
} from "./rx-suggestions.ts";
import { ROUTES, emptyItem } from "./prescription.ts";

test("concKey junta as grafias que a CMED usa para a mesma concentração", () => {
  assert.equal(concKey("1 G"), concKey("1000 MG"));
  assert.equal(concKey("(50 + 12,5) MG"), concKey("50 MG + 12,5 MG"));
  assert.equal(concKey("(50+12,5) MG"), "12.5+50mg");
  assert.equal(concKey("500 MG / ML"), "500mg/ml");
  assert.equal(concKey("1.200.000 UI"), "1200000ui");
  assert.equal(concKey("6,67 MG/ML + 333,4 MG/ML"), "6.67+333.4mg/ml");
  assert.equal(concKey("250 MG/5 ML"), "250mg/5ml");
  assert.notEqual(concKey("20 MG/G"), concKey("20 MG/ML"));
  assert.equal(concKey(null), "");
});

test("casa pela substância sem sal e pela concentração", () => {
  assert.equal(doseEntryFor("AMOXICILINA TRI-HIDRATADA", "500 MG")?.name, "Amoxicilina 500 mg");
  assert.equal(doseEntryFor("AMOXICILINA TRIHIDRATADA", "500 MG")?.name, "Amoxicilina 500 mg");
  assert.equal(doseEntryFor("DIPIRONA MONOIDRATADA", "1 G")?.name, "Dipirona 1 g");
  assert.equal(doseEntryFor("LOSARTANA POTÁSSICA", "50 MG")?.name, "Losartana 50 mg");
});

test("associação só casa com a entrada da associação", () => {
  assert.equal(
    doseEntryFor("AMOXICILINA TRIHIDRATADA;CLAVULANATO DE POTÁSSIO", "875 MG + 125 MG")?.name,
    "Amoxicilina + clavulanato 875 mg + 125 mg"
  );
  // 500 mg de amoxicilina sozinha não pode puxar a posologia da associação, nem o contrário.
  assert.equal(doseEntryFor("AMOXICILINA TRIHIDRATADA;CLAVULANATO DE POTÁSSIO", "500 MG"), null);
  assert.equal(
    doseEntryFor("DIPIRONA MONOIDRATADA;BUTILBROMETO DE ESCOPOLAMINA", "(10 + 250) MG")?.name,
    "Escopolamina + dipirona 10 mg + 250 mg"
  );
});

test("palavra inteira: prednisolona não recebe a dose de prednisona", () => {
  assert.equal(doseEntryFor("PREDNISOLONA", "20 MG"), null);
  assert.equal(doseEntryFor("PREDNISONA", "20 MG")?.name, "Prednisona 20 mg");
});

test("concentração desconhecida não inventa dose", () => {
  assert.equal(doseEntryFor("AMOXICILINA", "250 MG"), null);
  assert.equal(doseEntryFor("AMOXICILINA", null), null);
});

test("sugestões a partir do item que a busca pôs na receita", () => {
  const options = suggestionsForItem({ name: "AMOXICILINA TRI-HIDRATADA 500 MG", concentration: "500 MG" });
  assert.ok(options.length >= 1);
  assert.match(options[0].posology, /8 em 8 horas/);
  // Item da receita pronta: pelo nome da biblioteca.
  assert.ok(suggestionsForItem({ name: "Losartana 50 mg", concentration: null }).length >= 1);
  // Texto livre sem concentração: nada.
  assert.deepEqual(suggestionsForItem({ name: "Fórmula manipulada", concentration: null }), []);
});

test("aplicar a sugestão preenche posologia e via, e não apaga a quantidade escrita", () => {
  const item = { ...emptyItem(), name: "LOSARTANA POTÁSSICA 50 MG", concentration: "50 MG", quantity: "2 caixas" };
  const applied = applyDose(item, {
    posology: "Tomar 1 comprimido ao dia, uso contínuo",
    quantity: "1 caixa",
    route: "Via oral",
    continuous: true,
  });
  assert.equal(applied.posology, "Tomar 1 comprimido ao dia, uso contínuo");
  assert.equal(applied.quantity, "2 caixas");
  assert.equal(applied.continuous, true);
  const blank = applyDose({ ...item, quantity: "" }, { posology: "x", quantity: "1 caixa", route: "Via oral" });
  assert.equal(blank.quantity, "1 caixa");
  assert.equal(blank.continuous, false);
});

test("trocar de sugestão leva a quantidade da sugestão anterior junto", () => {
  const seven = { posology: "7 dias", quantity: "21 cápsulas", route: "Via oral" };
  const ten = { posology: "10 dias", quantity: "30 cápsulas", route: "Via oral" };
  const item = applyDose({ ...emptyItem(), name: "AMOXICILINA 500 MG" }, seven);
  assert.equal(item.quantity, "21 cápsulas");
  assert.equal(applyDose(item, ten, seven).quantity, "30 cápsulas");
  // Quantidade digitada pelo médico não é da sugestão: fica.
  assert.equal(applyDose({ ...item, quantity: "2 caixas" }, ten, seven).quantity, "2 caixas");
});

test("a biblioteca é coerente: nomes únicos, vias válidas, texto sem marcador", () => {
  const names = new Set();
  for (const entry of DOSES) {
    assert.ok(!names.has(entry.name), `nome repetido: ${entry.name}`);
    names.add(entry.name);
    assert.ok(entry.options.length > 0, entry.name);
    assert.ok(concKey(typeof entry.conc === "string" ? entry.conc : entry.conc[0]), entry.name);
    for (const option of entry.options) {
      assert.ok(ROUTES.includes(option.route), `${entry.name}: via ${option.route}`);
      assert.ok(option.posology.trim() && option.quantity.trim(), entry.name);
      assert.doesNotMatch(option.posology, /\{|\}|___/, entry.name);
    }
  }
});

test("toda apresentação oferece escolha: ao menos 2 posologias, sem repetir", () => {
  for (const entry of DOSES) {
    assert.ok(entry.options.length >= 2, `${entry.name} tem ${entry.options.length} posologia`);
    const phrases = entry.options.map((o) => o.posology);
    assert.equal(new Set(phrases).size, phrases.length, `${entry.name}: posologia repetida`);
  }
});

test("toda receita pronta aponta para apresentações que existem", () => {
  const names = new Set(DOSES.map((d) => d.name));
  for (const protocol of RX_PROTOCOLS) {
    assert.ok(RX_PROTOCOL_GROUPS.includes(protocol.group), protocol.name);
    assert.ok(protocol.items.length > 0, protocol.name);
    for (const { dose, option } of protocol.items) {
      assert.ok(names.has(dose), `${protocol.name}: ${dose}`);
      const entry = DOSES.find((d) => d.name === dose);
      assert.ok((option ?? 0) < entry.options.length, `${protocol.name}: opção ${option} de ${dose}`);
    }
    assert.equal(protocolItems(protocol).length, protocol.items.length);
  }
});

test("receita pronta sai com a tarja do catálogo e completa", () => {
  const cistite = RX_PROTOCOLS.find((p) => p.name.startsWith("Cistite ("));
  const items = protocolItems(cistite);
  assert.equal(items[0].name, "Nitrofurantoína 100 mg");
  assert.equal(items[0].tarja, "vermelha_retida");
  assert.match(items[0].posology, /5 dias/);
  assert.ok(items.every((i) => i.posology && i.quantity));
});

test("busca de receitas prontas por nome, sem acento, e por CID", () => {
  assert.ok(searchProtocols("otite").some((p) => p.cid === "H66.9"));
  assert.ok(searchProtocols("GASTROENTERITE").length >= 1);
  assert.ok(searchProtocols("n30").every((p) => p.cid.startsWith("N30")));
  assert.equal(searchProtocols("").length, RX_PROTOCOLS.length);
});

test("mais receitados: conta medicamento + posologia, o mais frequente primeiro", () => {
  const a = { ...emptyItem(), name: "Dipirona 500 mg", posology: "Tomar 1 comprimido de 6 em 6 horas" };
  const b = { ...emptyItem(), name: "Amoxicilina 500 mg", posology: "Tomar 1 cápsula de 8 em 8 horas por 7 dias" };
  const b2 = { ...b, posology: "Tomar 1 cápsula de 8 em 8 horas por 10 dias" };
  const noPos = { ...emptyItem(), name: "Sem posologia" };
  const frequent = frequentItems([[b], [a, b], [a, noPos], [a, b2]]);
  assert.equal(frequent[0].item.name, "Dipirona 500 mg");
  assert.equal(frequent[0].count, 3);
  assert.equal(frequent[1].count, 2);
  assert.equal(frequent.length, 3);
  assert.equal(previousFor(frequent, "amoxicilina 500 MG").length, 2);
  assert.equal(frequentItems([[a], [b]], 1).length, 1);
});
