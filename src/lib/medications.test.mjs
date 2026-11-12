import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeTarja,
  receiptKindFor,
  viasFor,
  receiptWarning,
  groupByReceiptKind,
  searchKey,
  concentrationFrom,
  normalizeConcentration,
  medicationLabel,
  allergyHits,
  strictestTarja,
  effectiveTarja,
} from "./medications.ts";

/** Os cinco valores que a CMED realmente usa (contados no arquivo de 2026-07). */
test("normaliza as tarjas que a CMED usa de verdade", () => {
  assert.equal(normalizeTarja("Tarja Vermelha"), "vermelha");
  assert.equal(normalizeTarja("Tarja Vermelha sob restrição"), "vermelha_retida");
  assert.equal(normalizeTarja("Tarja Preta"), "preta");
  assert.equal(normalizeTarja("Tarja Sem Tarja"), "livre");
  assert.equal(normalizeTarja("- (*) "), "desconhecida");
  assert.equal(normalizeTarja(""), "desconhecida");
  assert.equal(normalizeTarja(null), "desconhecida");
});

test("tarja preta exige Notificação de Receita, não receituário", () => {
  assert.equal(receiptKindFor("preta"), "notificacao");
  assert.match(receiptWarning("preta"), /Notificação de Receita/);
});

test("tarja vermelha com retenção vai em controle especial, duas vias", () => {
  assert.equal(receiptKindFor("vermelha_retida"), "controle_especial");
  assert.equal(viasFor("controle_especial"), 2);
  assert.equal(viasFor("simples"), 1);
});

test("vermelha comum e venda livre saem no receituário simples", () => {
  assert.equal(receiptKindFor("vermelha"), "simples");
  assert.equal(receiptKindFor("livre"), "simples");
  assert.equal(receiptWarning("vermelha"), null);
});

test("tarja não informada avisa, mas não impede", () => {
  assert.equal(receiptKindFor("desconhecida"), "simples");
  assert.match(receiptWarning("desconhecida"), /confira/i);
});

test("separa os itens por documento exigido, na ordem de impressão", () => {
  const items = [
    { nome: "Dipirona", tarja: "vermelha" },
    { nome: "Clonazepam", tarja: "preta" },
    { nome: "Amoxicilina", tarja: "vermelha_retida" },
    { nome: "Paracetamol", tarja: "livre" },
  ];
  const groups = groupByReceiptKind(items, (i) => i.tarja);
  assert.deepEqual(groups.map((g) => g.kind), ["simples", "controle_especial", "notificacao"]);
  assert.deepEqual(groups[0].items.map((i) => i.nome), ["Dipirona", "Paracetamol"]);
  assert.deepEqual(groups[1].items.map((i) => i.nome), ["Amoxicilina"]);
});

test("um receituário só não vira três quando tudo é simples", () => {
  const groups = groupByReceiptKind([{ t: "vermelha" }, { t: "livre" }], (i) => i.t);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, "simples");
});

test("chave de busca ignora acento, caixa e pontuação", () => {
  assert.equal(searchKey("DIPIRONA MONOIDRATADA"), "dipirona monoidratada");
  assert.equal(searchKey("Ácido acetilsalicílico"), "acido acetilsalicilico");
  assert.equal(searchKey("21-ACETATO DE DEXAMETASONA;CLOTRIMAZOL"), "21 acetato de dexametasona clotrimazol");
});

test("extrai a concentração da apresentação densa da CMED", () => {
  assert.equal(concentrationFrom("500 MG COM REV CT BL AL PLAS INC X 20"), "500 MG");
  assert.equal(concentrationFrom("10 MG/G + 0,443 MG/G CREM DERM CT BG AL X 40 G"), "10 MG/G + 0,443 MG/G");
  assert.equal(concentrationFrom("250 MG PO LIOF SOL INJ CT 1 FA"), "250 MG");
  assert.equal(concentrationFrom("CT BL AL PLAS X 20"), null);
});

/** A CMED também soma dentro de parênteses e põe a unidade fora. */
test("entende a associação entre parênteses", () => {
  assert.equal(concentrationFrom("(0,5 + 0,1) MG COM REV CT BL AL X 28"), "(0,5 + 0,1) MG");
  // Já sai normalizada: "3,00" e "3" são a mesma dose escrita de dois jeitos.
  assert.equal(concentrationFrom("(3,00+3,00) MG/ML SUS INJ CT 25 AMP VD AMB X 1ML"), "(3+3) MG/ML");
  assert.equal(concentrationFrom("(10 + 0,4) MG/G CREM DERM CT BG AL X 40G"), "(10 + 0,4) MG/G");
});

/** A CMED grafa a mesma dose de várias formas; o catálogo não pode duplicar por isso. */
test("normaliza a grafia da concentração", () => {
  assert.equal(concentrationFrom("1G COM CT X 10"), "1 G");
  assert.equal(concentrationFrom("1 G COM CT X 10"), "1 G");
  assert.equal(concentrationFrom("0,5MG COM CT X 30"), "0,5 MG");
  assert.equal(concentrationFrom("20MG CAP CT X 28"), "20 MG");
  // Casa decimal que é só zero some; a que significa algo fica.
  assert.equal(concentrationFrom("(1000,0 + 200,0) MG COM"), "(1000 + 200) MG");
  assert.equal(concentrationFrom("0,25 MG COM CT X 30"), "0,25 MG");
  assert.equal(concentrationFrom("50 MG / ML SOL"), "50 MG/ML");
});

/** "100.000 UI" entrava como "100 UI": o ponto de milhar era lido como decimal. */
test("ponto de milhar não é decimal (e some, como no resto da lista)", () => {
  assert.equal(concentrationFrom("100.000 UI/ML SUS CT FR VD AMB X 50 ML"), "100000 UI/ML");
  assert.equal(concentrationFrom("1.200.000 UI PO SUS INJ CT FA VD TRANS"), "1200000 UI");
  assert.equal(concentrationFrom("300.000 UI + 100.000 UI PO LIOF SUS INJ"), "300000 UI + 100000 UI");
  assert.equal(concentrationFrom("2.000UI PÓ LIOF INJ CT FA VD TRANS"), "2000 UI");
  assert.equal(concentrationFrom("62,5 MG/G + 25.000 UI/G + 1,25 MG/G CREM VAG"), "62,5 MG/G + 25000 UI/G + 1,25 MG/G");
  // Fora de UI, só o número redondo é milhar: carbonato de cálcio 1.250 mg, secnidazol 1.000 mg.
  assert.equal(concentrationFrom("1.250 MG COM CT BL AL PLAS PVDC TRANS X 60"), "1250 MG");
  assert.equal(concentrationFrom("1.000 MG COM REV CT ENV AL X 4"), "1000 MG");
  // Decimal escrito com ponto continua decimal.
  assert.equal(concentrationFrom("2.5 MG COM CT X 30"), "2,5 MG");
  assert.equal(concentrationFrom("20 MG/ML + 0.333 MG/ML + 1.0 MCG/ML SOL OR"), "20 MG/ML + 0,333 MG/ML + 1 MCG/ML");
  assert.equal(concentrationFrom("(9.532 + 1.049 + 3.039 + 12.5) MG COM REV"), "(9,532 + 1,049 + 3,039 + 12,5) MG");
  assert.equal(normalizeConcentration("17.602 G"), "17,602 G");
});

/**
 * A CMED tem linhas de clonazepam sem tarja. Isoladas, fariam um medicamento
 * de tarja preta sair num receituário simples — que a farmácia não aceita.
 */
test("a tarja da substância é a mais restritiva entre as apresentações", () => {
  assert.equal(strictestTarja(["desconhecida", "preta", "vermelha"]), "preta");
  assert.equal(strictestTarja(["vermelha", "vermelha_retida"]), "vermelha_retida");
  assert.equal(strictestTarja(["livre", "desconhecida"]), "livre");
  assert.equal(strictestTarja(["desconhecida"]), "desconhecida");
  assert.equal(strictestTarja([]), "desconhecida");
});

test("tarja ausente não rebaixa um controlado a receituário simples", () => {
  // Caso real: CLONAZEPAM tem apresentações "preta" e linhas sem tarja. A
  // Portaria 344/98 lista o princípio ativo, então vale para todas.
  assert.equal(effectiveTarja(["desconhecida"], ["preta", "desconhecida"]), "preta");
  assert.equal(receiptKindFor(effectiveTarja(["desconhecida"], ["preta"])), "notificacao");
});

/**
 * O outro lado, igualmente real: a dipirona injetável hospitalar é vermelha
 * com retenção e o comprimido é de venda livre. Se a mais restritiva subisse
 * para a substância, o medicamento mais prescrito do país passaria a exigir
 * Receituário de Controle Especial — em 675 substâncias, na lista de hoje.
 */
test("apresentação restrita não contamina as outras da mesma substância", () => {
  const substancia = ["livre", "vermelha_retida", "desconhecida", "vermelha"];
  assert.equal(effectiveTarja(["livre"], substancia), "livre");
  assert.equal(receiptKindFor(effectiveTarja(["livre"], substancia)), "simples");
  // A apresentação que é de fato restrita continua restrita.
  assert.equal(effectiveTarja(["vermelha_retida"], substancia), "vermelha_retida");
});

test("dentro da mesma apresentação, vale a mais restritiva", () => {
  assert.equal(effectiveTarja(["vermelha", "vermelha_retida"], ["vermelha", "vermelha_retida"]), "vermelha_retida");
  assert.equal(effectiveTarja(["desconhecida", "livre"], ["livre"]), "livre");
});

test("decimal com ponto e com vírgula são a mesma dose", () => {
  assert.equal(concentrationFrom("2.5 MG/ML SOL"), concentrationFrom("2,5 MG/ML SOL"));
});

test("rótulo do medicamento junta produto e concentração", () => {
  assert.equal(
    medicationLabel({ substance: "DIPIRONA", product: "NOVALGINA", presentation: "500 MG COM CT X 20" }),
    "NOVALGINA 500 MG"
  );
  // Genérico sem marca cai na substância.
  assert.equal(
    medicationLabel({ substance: "DIPIRONA MONOIDRATADA", product: "", presentation: "500 MG COM X 10" }),
    "DIPIRONA MONOIDRATADA 500 MG"
  );
});

test("alerta de alergia casa por palavra inteira, nos dois sentidos", () => {
  assert.deepEqual(allergyHits("DIPIRONA MONOIDRATADA", "Dipirona\nPoeira"), ["Dipirona"]);
  assert.deepEqual(allergyHits("AMOXICILINA", "Penicilina, amoxicilina"), ["amoxicilina"]);
  assert.deepEqual(allergyHits("PARACETAMOL", "Dipirona"), []);
});

test("alergia não dispara por pedaço de palavra", () => {
  // "sal" não pode casar com "salbutamol".
  assert.deepEqual(allergyHits("SALBUTAMOL", "sal"), []);
  assert.deepEqual(allergyHits("SALBUTAMOL", "Salbutamol"), ["Salbutamol"]);
});

test("sem alergias cadastradas não há alerta", () => {
  assert.deepEqual(allergyHits("DIPIRONA", null), []);
  assert.deepEqual(allergyHits("DIPIRONA", ""), []);
});

test("GLP-1 (canetas): receita sempre retida, em qualquer concentração", async () => {
  const { withRetentionRules, collapseMedicationRows } = await import("./medications.ts");
  assert.equal(withRetentionRules("TIRZEPATIDA", "vermelha"), "vermelha_retida");
  assert.equal(withRetentionRules("SEMAGLUTIDA", "desconhecida"), "vermelha_retida");
  assert.equal(withRetentionRules("LIRAGLUTIDA;INSULINA DEGLUDECA", "vermelha"), "vermelha_retida");
  assert.equal(withRetentionRules("DIPIRONA", "livre"), "livre");
  const [hit] = collapseMedicationRows([
    { substance: "TIRZEPATIDA", concentration: "5 MG/ML", tarja: "vermelha", product: "MOUNJARO", presentation: "5 MG/ML SOL INJ CT 4 CAN APLIC", therapeutic_class: null, marketed: true, rank: 0 },
  ]);
  assert.equal(hit.tarja, "vermelha_retida");
  assert.equal(hit.form, "injetavel");
});


test("nomes comerciais: sem genéricos, sem fora de linha, do mais comum ao menos", async () => {
  const { brandNames, isGenericName } = await import("./medications.ts");
  const row = (product, marketed = 1) => ({ product, marketed });
  const dipirona = [
    row("NOVALGINA"), row("NOVALGINA"), row("NOVALGINA"),
    row("DIPIRONA MONOIDRATADA"), row("DIPIRONA SÓDICA"), row("DIPIRONA SODICA"),
    row("ANADOR"), row("ANADOR"), row("DORFLEX UNO"), row("DUZOR", 0), row(""),
  ];
  assert.deepEqual(brandNames("DIPIRONA MONOIDRATADA", dipirona), ["Novalgina", "Anador", "Dorflex Uno"]);
  // Quem casa com a busca vem primeiro.
  assert.deepEqual(brandNames("DIPIRONA MONOIDRATADA", dipirona, "dorf"), ["Dorflex Uno", "Novalgina", "Anador"]);

  // Genérico na CMED tem o nome da substância — composta ou não.
  assert.equal(isGenericName("AMOXICILINA + CLAVULANATO DE POTÁSSIO", "AMOXICILINA TRIHIDRATADA;CLAVULANATO DE POTÁSSIO"), true);
  assert.equal(isGenericName("ÁCIDO CLAVULÂNICO + AMOXICILINA", "AMOXICILINA SÓDICA;CLAVULANATO DE POTÁSSIO"), true);
  assert.equal(isGenericName("LOSARTANA POTASSICA+HIDROCLOROTIAZIDA", "LOSARTANA POTÁSSICA;HIDROCLOROTIAZIDA"), true);
  assert.equal(isGenericName("AMOXIL", "AMOXICILINA TRIHIDRATADA"), false);
  assert.equal(isGenericName("ARADOIS H", "LOSARTANA POTÁSSICA;HIDROCLOROTIAZIDA"), false);
  // "cloridrato" no nome não faz da marca um genérico de outra substância.
  assert.equal(isGenericName("ZOLOFT", "CLORIDRATO DE SERTRALINA"), false);
  assert.equal(isGenericName("CLORIDRATO DE SERTRALINA", "CLORIDRATO DE SERTRALINA"), true);
});

test("nome comercial em caixa de título, siglas como estão", async () => {
  const { brandCase } = await import("./medications.ts");
  assert.equal(brandCase("DORFLEX UNO"), "Dorflex Uno");
  assert.equal(brandCase("VELAMOX BD"), "Velamox BD");
  assert.equal(brandCase("ARADOIS H"), "Aradois H");
  assert.equal(brandCase("ANA - FLEX"), "Ana-Flex");
  assert.equal(brandCase("PURAN T4"), "Puran T4");
  assert.equal(brandCase("LISADOR DIP"), "Lisador Dip");
});

test("cada resultado da busca leva os nomes comerciais do seu grupo", async () => {
  const { collapseMedicationRows } = await import("./medications.ts");
  const base = { substance: "DIPIRONA MONOIDRATADA", concentration: "500 MG/ML", tarja: "livre", therapeutic_class: null, marketed: 1, rank: 1 };
  const hits = collapseMedicationRows(
    [
      { ...base, product: "NOVALGINA", presentation: "500 MG/ML SOL OR CT FR GOT X 20 ML" },
      { ...base, product: "ANADOR", presentation: "500 MG/ML SOL OR CT FR GOT X 20 ML" },
      { ...base, product: "DIPIRONA MONOIDRATADA", presentation: "500 MG/ML SOL OR CT FR GOT X 10 ML" },
      { ...base, concentration: "500 MG", product: "NOVALGINA", presentation: "500 MG COM CT BL X 10" },
    ],
    20,
    "anador",
  );
  assert.equal(hits.length, 2);
  const gotas = hits.find((h) => h.form === "gotas");
  assert.deepEqual(gotas.products, ["Anador", "Novalgina"]);
  assert.deepEqual(hits.find((h) => h.form === "comprimido").products, ["Novalgina"]);
});

/** Gotas e ampola têm a mesma concentração; a tarja não pode ser a mesma por isso. */
test("a tarja é decidida por forma, não só por concentração", async () => {
  const { collapseMedicationRows, groupTarja } = await import("./medications.ts");
  const base = { substance: "DIPIRONA", concentration: "500 MG/ML", product: "DIPIRONA", therapeutic_class: null, marketed: 1, rank: 0, tarja_conc: "vermelha_retida" };
  const hits = collapseMedicationRows([
    { ...base, tarja: "livre", presentation: "500 MG/ML SOL OR CT FR GOT X 20 ML" },
    { ...base, tarja: "desconhecida", presentation: "500 MG/ML SOL OR CT FR GOT X 10 ML" },
    { ...base, tarja: "vermelha_retida", presentation: "500 MG/ML SOL INJ CX 100 AMP VD AMB X 2 ML" },
    // Nenhuma linha desta forma informa a tarja: vale a da concentração inteira.
    { ...base, tarja: "desconhecida", presentation: "500 MG/ML SUP CT STR X 5" },
  ]);
  const tarjaOf = (form) => hits.find((h) => h.form === form).tarja;
  assert.equal(tarjaOf("gotas"), "livre");
  assert.equal(tarjaOf("injetavel"), "vermelha_retida");
  assert.equal(tarjaOf("supositorio"), "vermelha_retida");

  // Dentro da mesma forma continua valendo a mais restritiva.
  assert.equal(groupTarja([{ tarja: "vermelha" }, { tarja: "vermelha_retida" }]), "vermelha_retida");
  // Tarja preta é da substância: a linha sem tarja não rebaixa.
  assert.equal(groupTarja([{ tarja: "desconhecida", tarja_conc: "preta" }, { tarja: "vermelha", tarja_conc: "preta" }]), "preta");
  assert.equal(groupTarja([]), "desconhecida");
});
