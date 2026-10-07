import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ATESTADO_MOTIVOS,
  ATESTADO_SUBKINDS,
  CODE_ALPHABET,
  DEFAULT_TEMPLATES,
  DOCUMENT_CODE_RE,
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABEL,
  MAX_PROTOCOL_ITEMS,
  PLACEHOLDERS,
  PROTOCOL_KIND,
  buildTemplateVars,
  canPatientSeeDocument,
  dateExtenso,
  defaultFieldValues,
  defaultTemplate,
  documentTitle,
  documentWhatsAppMessage,
  documentsBatchWhatsAppMessage,
  fieldsFor,
  generateDocumentCode,
  isCheckboxField,
  isDocumentKind,
  normalizeDocumentCode,
  normalizeFieldValues,
  ALL_FIELD_KEYS,
  normalizeSubkind,
  parseDocumentFields,
  parseProtocol,
  parseProtocolItem,
  patientDisplayName,
  patientFirstName,
  patientInitials,
  printableCid,
  protocolSummary,
  renderTemplate,
  serializeDocumentFields,
  serializeProtocol,
  templateKey,
  validationHost,
  validationUrlFor,
  pickTemplate,
} from "./documents.ts";
import { CFM_MEDICAL_SPECIALTIES, CFM_SPECIALTIES } from "./specialties.ts";

// ---------- campos ----------

/**
 * `FieldKey` é tipo; `FIELD_KEYS` é a lista que roda. O tipo não protege a
 * lista — um subconjunto continua sendo um array válido de FieldKey. Foi
 * assim que `medicamentos` foi gravado vazio no banco: a chave existia no
 * tipo e faltava na lista, e nem tsc nem o build reclamaram.
 */
test("FIELD_KEYS cobre todo FieldKey usado pelos documentos", () => {
  const usadas = ["dias", "motivo", "cid", "cid_consent", "entrada", "saida",
    "acompanhante", "destino", "historia", "conduta", "medicamentos"];
  assert.deepEqual([...ALL_FIELD_KEYS].sort(), [...usadas].sort());
  // E a normalização precisa mesmo deixar a chave passar.
  assert.equal(normalizeFieldValues({ medicamentos: '[{"name":"X"}]' }).medicamentos, '[{"name":"X"}]');
});

// ---------- kinds ----------

test("the four kinds carry the labels the brief asks for", () => {
  assert.deepEqual(
    DOCUMENT_KINDS.map((k) => [k.kind, k.label]),
    [
      ["atestado", "Atestado"],
      ["encaminhamento", "Encaminhamento"],
      ["laudo", "Laudo / relatório"],
      ["orientacoes", "Orientações"],
    ]
  );
  assert.deepEqual(
    ATESTADO_SUBKINDS.map((s) => [s.subkind, s.label]),
    [
      ["medico", "Atestado médico"],
      ["comparecimento", "Declaração de comparecimento"],
      ["acompanhante", "Declaração de acompanhante"],
    ]
  );
  assert.equal(isDocumentKind("laudo"), true);
  assert.equal(isDocumentKind("receita"), false);
  assert.equal(isDocumentKind(null), false);
  assert.equal(isDocumentKind("toString"), false);
});

test("subkind only exists for atestado and falls back to medico", () => {
  assert.equal(normalizeSubkind("atestado", "comparecimento"), "comparecimento");
  assert.equal(normalizeSubkind("atestado", "qualquer"), "medico");
  assert.equal(normalizeSubkind("atestado", undefined), "medico");
  assert.equal(normalizeSubkind("laudo", "medico"), null);
});

test("documentTitle picks the printed heading", () => {
  assert.equal(documentTitle("atestado", "medico"), "Atestado médico");
  assert.equal(documentTitle("atestado", "acompanhante"), "Declaração de acompanhante");
  assert.equal(documentTitle("atestado", null), "Atestado médico");
  assert.equal(documentTitle("encaminhamento", null), "Encaminhamento");
  assert.equal(documentTitle("laudo", null), "Relatório médico");
  assert.equal(documentTitle("orientacoes", null), "Orientações");
});

// ---------- code ----------

function stubRandom(bytes) {
  return {
    getRandomValues(array) {
      for (let i = 0; i < array.length; i += 1) array[i] = bytes[i % bytes.length];
      return array;
    },
  };
}

test("generateDocumentCode has the RNV-XXXX-XXXX shape", () => {
  const code = generateDocumentCode();
  assert.match(code, DOCUMENT_CODE_RE);
  assert.equal(code.length, 13);
});

test("the alphabet has no 0/O nor 1/I and every byte maps into it", () => {
  assert.equal(CODE_ALPHABET.length, 32);
  for (const forbidden of ["0", "O", "1", "I"]) assert.equal(CODE_ALPHABET.includes(forbidden), false);
  // Todos os 256 bytes possíveis, em blocos de 8: nunca sai um símbolo de fora do alfabeto.
  for (let start = 0; start < 256; start += 8) {
    const bytes = Array.from({ length: 8 }, (_, i) => start + i);
    const code = generateDocumentCode(stubRandom(bytes));
    assert.match(code, DOCUMENT_CODE_RE);
    for (const ch of code.replace(/^RNV-/, "").replace("-", "")) assert.ok(CODE_ALPHABET.includes(ch), ch);
  }
});

test("generateDocumentCode is deterministic for a given source and random otherwise", () => {
  assert.equal(generateDocumentCode(stubRandom([0, 1, 2, 3, 4, 5, 6, 7])), "RNV-ABCD-EFGH");
  assert.equal(generateDocumentCode(stubRandom([32, 33, 34, 35, 36, 37, 38, 39])), "RNV-ABCD-EFGH");
  const a = generateDocumentCode();
  const b = generateDocumentCode();
  assert.notEqual(a, b);
});

test("normalizeDocumentCode accepts what a person would type", () => {
  assert.equal(normalizeDocumentCode("rnv-abcd-efgh"), "RNV-ABCD-EFGH");
  assert.equal(normalizeDocumentCode("  abcd efgh "), "RNV-ABCD-EFGH");
  assert.equal(normalizeDocumentCode("RNVABCDEFGH"), "RNV-ABCD-EFGH");
  assert.equal(normalizeDocumentCode("RNV-ABC0-EFGH"), null);
  assert.equal(normalizeDocumentCode("RNV-ABCD-EFG"), null);
  assert.equal(normalizeDocumentCode(""), null);
  assert.equal(normalizeDocumentCode(42), null);
});

// ---------- template engine ----------

test("renderTemplate replaces known placeholders and tolerates spaces inside the braces", () => {
  assert.equal(
    renderTemplate("Olá {{paciente}}, hoje é {{ data }}.", { paciente: "Ana", data: "09/09/2026" }),
    "Olá Ana, hoje é 09/09/2026."
  );
});

test("renderTemplate leaves unknown placeholders visible so the doctor notices", () => {
  assert.equal(renderTemplate("{{paciente}} — {{convenio}}", { paciente: "Ana" }), "Ana — {{convenio}}");
});

test("a line whose known placeholders are all empty disappears", () => {
  const body = "Atesto que {{paciente}} precisa de {{dias}} dia(s).\n\nCID: {{cid}}";
  assert.equal(
    renderTemplate(body, { paciente: "Ana", dias: "2", cid: "" }),
    "Atesto que Ana precisa de 2 dia(s)."
  );
  assert.equal(
    renderTemplate(body, { paciente: "Ana", dias: "2", cid: "J03.9" }),
    "Atesto que Ana precisa de 2 dia(s).\n\nCID: J03.9"
  );
});

test("a line with one filled and one empty placeholder stays", () => {
  assert.equal(renderTemplate("{{paciente}} ({{cpf}})", { paciente: "Ana", cpf: null }), "Ana ()");
});

test("a line mixing an empty known placeholder with an unknown one stays visible", () => {
  assert.equal(renderTemplate("CID: {{cid}} {{outro}}", { cid: "" }), "CID:  {{outro}}");
});

test("renderTemplate normalizes CRLF, collapses runs of blank lines and trims the ends", () => {
  assert.equal(renderTemplate("A\r\n\r\n\r\n\r\nB\n\n", {}), "A\n\nB");
});

test("every kind and subkind has a default template and the atestado sentence is the one from the brief", () => {
  for (const key of [
    "atestado.medico",
    "atestado.comparecimento",
    "atestado.acompanhante",
    "encaminhamento",
    "laudo",
    "orientacoes",
  ]) {
    assert.ok(DEFAULT_TEMPLATES[key]?.body.length > 0, key);
    assert.ok(DEFAULT_TEMPLATES[key]?.title.length > 0, key);
  }
  assert.equal(templateKey("atestado", "medico"), "atestado.medico");
  assert.equal(templateKey("laudo", "medico"), "laudo");
  assert.equal(defaultTemplate("atestado", "nada").title, "Atestado médico");

  const vars = buildTemplateVars({
    patient: { name: "Ana Beatriz Souza", cpf: "412.658.790-01" },
    professional: { name: "Dra. Marina Costa", council: "CRM 123456-SP" },
    clinicName: "Clínica Renova",
    date: "2026-09-09",
    fields: { dias: "3" },
  });
  // Sem motivo a linha dele some inteira — nada de ponto perdido.
  assert.equal(
    renderTemplate(DEFAULT_TEMPLATES["atestado.medico"].body, vars),
    "Atesto, para os devidos fins, que Ana Beatriz Souza esteve sob meus cuidados nesta data.\n\n" +
      "Necessita de 3 dia(s) de afastamento de suas atividades a partir de 09/09/2026."
  );
  assert.equal(
    renderTemplate(DEFAULT_TEMPLATES["atestado.medico"].body, { ...vars, motivo: ATESTADO_MOTIVOS[0] }),
    "Atesto, para os devidos fins, que Ana Beatriz Souza esteve sob meus cuidados nesta data.\n" +
      "Foi orientado(a) a permanecer em repouso.\n\n" +
      "Necessita de 3 dia(s) de afastamento de suas atividades a partir de 09/09/2026."
  );
  assert.match(
    renderTemplate(DEFAULT_TEMPLATES["atestado.medico"].body, { ...vars, cid: "J03.9" }),
    /\n\nCID: J03\.9$/
  );
  assert.match(
    renderTemplate(DEFAULT_TEMPLATES["atestado.comparecimento"].body, { ...vars, entrada: "08:00", saida: "09:30" }),
    /das 08:00 às 09:30/
  );
  assert.match(
    renderTemplate(DEFAULT_TEMPLATES["atestado.acompanhante"].body, {
      ...vars,
      acompanhante: "Carlos Souza",
      entrada: "08:00",
      saida: "09:30",
    }),
    /que Carlos Souza esteve .* acompanhando o\(a\) paciente Ana Beatriz Souza/
  );
  const enc = renderTemplate(DEFAULT_TEMPLATES.encaminhamento.body, {
    ...vars,
    destino: "Cardiologia",
    motivo: "Avaliação de sopro",
  });
  assert.match(enc, /para avaliação em Cardiologia\./);
  assert.match(enc, /Motivo: Avaliação de sopro/);
  // Nenhum modelo padrão usa uma chave que o motor não conhece.
  const knownKeys = new Set(PLACEHOLDERS.map((p) => p.key));
  for (const [key, tpl] of Object.entries(DEFAULT_TEMPLATES)) {
    for (const match of tpl.body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) assert.ok(knownKeys.has(match[1]), `${key}: ${match[1]}`);
  }
});

test("buildTemplateVars exposes exactly the documented placeholders", () => {
  const vars = buildTemplateVars({
    patient: { name: " Ana ", cpf: null },
    professional: null,
    clinicName: "Clínica",
    date: "2026-01-05",
  });
  assert.deepEqual(Object.keys(vars).sort(), PLACEHOLDERS.map((p) => p.key).sort());
  assert.equal(vars.paciente, "Ana");
  assert.equal(vars.cpf, "");
  assert.equal(vars.data, "05/01/2026");
  assert.equal(vars.data_extenso, "5 de janeiro de 2026");
  assert.equal(vars.profissional, "");
});

test("dateExtenso spells the date in pt-BR and leaves garbage alone", () => {
  assert.equal(dateExtenso("2026-09-09"), "9 de setembro de 2026");
  assert.equal(dateExtenso("2025-12-25"), "25 de dezembro de 2025");
  assert.equal(dateExtenso("hoje"), "hoje");
});

// ---------- structured fields ----------

test("fieldsFor shows the right structured fields per kind", () => {
  const keys = (kind, sub) => fieldsFor(kind, sub).map((f) => f.key);
  assert.deepEqual(keys("atestado", "medico"), ["dias", "motivo", "cid", "cid_consent"]);
  assert.deepEqual(keys("atestado", "comparecimento"), ["entrada", "saida"]);
  assert.deepEqual(keys("atestado", "acompanhante"), ["acompanhante", "entrada", "saida"]);
  assert.deepEqual(keys("atestado", null), ["dias", "motivo", "cid", "cid_consent"]);
  assert.deepEqual(keys("encaminhamento", null), ["destino", "cid", "motivo", "historia", "conduta"]);
  assert.deepEqual(fieldsFor("laudo", null), []);
  assert.deepEqual(fieldsFor("orientacoes", null), []);
  assert.equal(fieldsFor("atestado", "medico")[0].defaultValue, "1");
  // Cada chamada devolve um array novo: quem edita a lista não mexe na definição.
  assert.notEqual(fieldsFor("atestado", "medico"), fieldsFor("atestado", "medico"));
});

test("the atestado fields carry the Mevo-like controls: motivo select and CID consent checkbox", () => {
  const byKey = Object.fromEntries(fieldsFor("atestado", "medico").map((f) => [f.key, f]));
  assert.equal(byKey.motivo.type, "select");
  assert.equal(byKey.motivo.wide, true);
  assert.deepEqual([...byKey.motivo.options], [...ATESTADO_MOTIVOS]);
  assert.equal(byKey.motivo.defaultValue, ATESTADO_MOTIVOS[0]);
  assert.equal(byKey.cid.type, "text");
  assert.equal(byKey.cid.label, "CID (opcional)");
  assert.equal(byKey.cid_consent.type, "checkbox");
  assert.equal(byKey.cid_consent.wide, true);
  assert.match(byKey.cid_consent.label, /CFM 1\.658\/02/);
  assert.match(byKey.cid_consent.hint, /prontuário/);
  assert.equal(isCheckboxField("cid_consent"), true);
  assert.equal(isCheckboxField("cid"), false);
});

test("the encaminhamento fields: destino with CFM suggestions, textareas for história and conduta", () => {
  const byKey = Object.fromEntries(fieldsFor("encaminhamento", null).map((f) => [f.key, f]));
  assert.equal(byKey.destino.type, "text");
  assert.equal(byKey.destino.wide, true);
  assert.equal(byKey.destino.label, "Especialidade ou serviço");
  assert.equal(byKey.destino.suggestions, CFM_SPECIALTIES);
  assert.equal(byKey.cid.label, "CID (opcional)");
  assert.equal(byKey.motivo.type, "text");
  assert.equal(byKey.motivo.label, "Motivo do encaminhamento");
  assert.equal(byKey.historia.type, "textarea");
  assert.equal(byKey.historia.rows, 3);
  assert.equal(byKey.conduta.type, "textarea");
  assert.equal(byKey.conduta.rows, 2);
});

test("ATESTADO_MOTIVOS ends with Outro, which the form turns into free text", () => {
  assert.equal(ATESTADO_MOTIVOS[ATESTADO_MOTIVOS.length - 1], "Outro");
  assert.ok(ATESTADO_MOTIVOS.length >= 5);
  assert.equal(new Set(ATESTADO_MOTIVOS).size, ATESTADO_MOTIVOS.length);
});

test("CFM_SPECIALTIES: the 55 CFM specialties plus the usual services, sorted, no duplicates", () => {
  assert.equal(CFM_MEDICAL_SPECIALTIES.length, 55);
  assert.ok(CFM_SPECIALTIES.length > 50);
  assert.ok(CFM_SPECIALTIES.includes("Cardiologia"));
  assert.ok(CFM_SPECIALTIES.includes("Fisioterapia"));
  assert.equal(new Set(CFM_SPECIALTIES).size, CFM_SPECIALTIES.length);
  assert.deepEqual([...CFM_SPECIALTIES], [...CFM_SPECIALTIES].sort((a, b) => a.localeCompare(b, "pt-BR")));
});

test("defaultFieldValues seeds every field with its default or an empty string", () => {
  assert.deepEqual(defaultFieldValues(fieldsFor("atestado", "medico")), {
    dias: "1",
    motivo: ATESTADO_MOTIVOS[0],
    cid: "",
    cid_consent: "",
  });
  assert.deepEqual(defaultFieldValues([]), {});
});

test("normalizeFieldValues: a checkbox becomes \"1\" when truthy and disappears otherwise", () => {
  assert.deepEqual(normalizeFieldValues({ cid_consent: "1" }), { cid_consent: "1" });
  assert.deepEqual(normalizeFieldValues({ cid_consent: "on" }), { cid_consent: "1" });
  assert.deepEqual(normalizeFieldValues({ cid_consent: "true" }), { cid_consent: "1" });
  assert.deepEqual(normalizeFieldValues({ cid_consent: true }), { cid_consent: "1" });
  assert.deepEqual(normalizeFieldValues({ cid_consent: "" }), {});
  assert.deepEqual(normalizeFieldValues({ cid_consent: "0" }), {});
  assert.deepEqual(normalizeFieldValues({ cid_consent: "false" }), {});
  assert.deepEqual(normalizeFieldValues({ cid_consent: "sim" }), {});
  // As chaves novas entram aparadas; lixo e vazios não.
  assert.deepEqual(
    normalizeFieldValues({ historia: " HAS há 5 anos ", conduta: "Losartana", motivo: "", bogus: "x" }),
    { historia: "HAS há 5 anos", conduta: "Losartana" }
  );
  assert.deepEqual(normalizeFieldValues(null), {});
  // E o JSON gravado no documento carrega o consentimento.
  assert.deepEqual(parseDocumentFields(serializeDocumentFields({ template_id: null, fields: { cid: "J03.9", cid_consent: "on" } })), {
    template_id: null,
    fields: { cid: "J03.9", cid_consent: "1" },
  });
});

test("the CID only prints on an atestado with the patient's consent; other kinds print it when filled", () => {
  const base = { patient: { name: "Ana Souza" }, clinicName: "Clínica", date: "2026-09-16" };
  const atestadoSem = buildTemplateVars({ ...base, kind: "atestado", fields: { dias: "2", cid: "J03.9" } });
  assert.equal(atestadoSem.cid, "");
  assert.doesNotMatch(renderTemplate(DEFAULT_TEMPLATES["atestado.medico"].body, atestadoSem), /CID/);

  const atestadoCom = buildTemplateVars({
    ...base,
    kind: "atestado",
    fields: { dias: "2", cid: "J03.9", cid_consent: "1" },
  });
  assert.equal(atestadoCom.cid, "J03.9");
  assert.match(renderTemplate(DEFAULT_TEMPLATES["atestado.medico"].body, atestadoCom), /\n\nCID: J03\.9$/);

  const enc = buildTemplateVars({ ...base, kind: "encaminhamento", fields: { destino: "Cardiologia", cid: "I10" } });
  assert.equal(enc.cid, "I10");
  assert.match(renderTemplate(DEFAULT_TEMPLATES.encaminhamento.body, enc), /CID: I10/);

  // Sem `kind` (chamadas antigas) o CID sai quando preenchido; o consentimento sozinho não inventa CID.
  assert.equal(buildTemplateVars({ ...base, fields: { cid: "I10" } }).cid, "I10");
  assert.equal(printableCid("atestado", { cid_consent: "1" }), "");
  assert.equal(printableCid("atestado", { cid: "J03.9" }), "");
  assert.equal(printableCid("atestado", { cid: "J03.9", cid_consent: "1" }), "J03.9");
  assert.equal(printableCid("laudo", { cid: "J03.9" }), "J03.9");
  assert.equal(printableCid(undefined, null), "");
});

test("paciente prefers the social name; nome_civil keeps the civil one", () => {
  const base = { clinicName: "Clínica", date: "2026-09-16" };
  const social = buildTemplateVars({ ...base, patient: { name: "João Carlos Silva", social_name: " Joana Silva " } });
  assert.equal(social.paciente, "Joana Silva");
  assert.equal(social.nome_civil, "João Carlos Silva");
  const civil = buildTemplateVars({ ...base, patient: { name: "Ana Souza", social_name: "  " } });
  assert.equal(civil.paciente, "Ana Souza");
  assert.equal(civil.nome_civil, "Ana Souza");
  assert.equal(buildTemplateVars({ ...base, patient: { name: "Ana Souza", social_name: null } }).paciente, "Ana Souza");
  assert.match(
    renderTemplate(DEFAULT_TEMPLATES["atestado.comparecimento"].body, { ...social, entrada: "08:00", saida: "09:00" }),
    /que Joana Silva compareceu/
  );
});

test("the encaminhamento template prints história and conduta only when filled", () => {
  const vars = buildTemplateVars({
    patient: { name: "Ana Souza" },
    clinicName: "Clínica",
    date: "2026-09-16",
    kind: "encaminhamento",
    fields: { destino: "Cardiologia", motivo: "Sopro", historia: "HAS há 5 anos", conduta: "Losartana 50 mg" },
  });
  const text = renderTemplate(DEFAULT_TEMPLATES.encaminhamento.body, vars);
  assert.match(text, /^Encaminho Ana Souza para avaliação em Cardiologia\./);
  assert.match(text, /Motivo: Sopro\nHistória clínica: HAS há 5 anos\nConduta até o momento: Losartana 50 mg/);
  assert.doesNotMatch(text, /CID/);
  const bare = renderTemplate(DEFAULT_TEMPLATES.encaminhamento.body, { ...vars, historia: "", conduta: "" });
  assert.doesNotMatch(bare, /História|Conduta/);
});

test("PLACEHOLDERS documents the new keys and the CID consent warning", () => {
  const keys = PLACEHOLDERS.map((p) => p.key);
  for (const key of ["historia", "conduta", "nome_civil", "motivo", "cid"]) assert.ok(keys.includes(key), key);
  assert.equal(new Set(keys).size, keys.length);
  assert.match(PLACEHOLDERS.find((p) => p.key === "cid").label, /consentimento/);
  assert.match(PLACEHOLDERS.find((p) => p.key === "motivo").label, /atestado ou encaminhamento/);
});

test("patientDisplayName / patientFirstName prefer the social name", () => {
  assert.equal(patientDisplayName({ name: "João Carlos Silva", social_name: "Joana Silva" }), "Joana Silva");
  assert.equal(patientDisplayName({ name: " Ana Souza ", social_name: null }), "Ana Souza");
  assert.equal(patientDisplayName({ name: "Ana Souza" }), "Ana Souza");
  assert.equal(patientFirstName({ name: "João Carlos Silva", social_name: "Joana Silva" }), "Joana");
  assert.equal(patientFirstName({ name: "Ana Beatriz Souza", social_name: "" }), "Ana");
  assert.equal(patientFirstName({ name: "Ana" }), "Ana");
});

test("document fields JSON round-trips and ignores junk", () => {
  const json = serializeDocumentFields({ template_id: 7, fields: { dias: " 2 ", cid: "", bogus: "x" } });
  assert.deepEqual(JSON.parse(json), { template_id: 7, fields: { dias: "2" } });
  assert.deepEqual(parseDocumentFields(json), { template_id: 7, fields: { dias: "2" } });
  assert.deepEqual(parseDocumentFields('{"template_id":"7","fields":{"dias":3}}'), { template_id: null, fields: {} });
  assert.equal(parseDocumentFields("não é json"), null);
  assert.equal(parseDocumentFields("[]"), null);
  assert.equal(parseDocumentFields(null), null);
});

// ---------- public validation / portal ----------

test("patientInitials keeps only the initials, skipping particles", () => {
  assert.equal(patientInitials("Ana Beatriz Souza"), "A. B. S.");
  assert.equal(patientInitials("maria da silva"), "M. S.");
  assert.equal(patientInitials("  José   dos Santos "), "J. S.");
  assert.equal(patientInitials("Ana"), "A.");
  assert.equal(patientInitials("de"), "D.");
  assert.equal(patientInitials(""), "");
});

test("canPatientSeeDocument requires ownership, sharing and no revocation", () => {
  const doc = { patient_id: 5, shared_with_patient: 1, revoked_at: null };
  assert.equal(canPatientSeeDocument(doc, 5), true);
  assert.equal(canPatientSeeDocument(doc, 6), false);
  assert.equal(canPatientSeeDocument({ ...doc, shared_with_patient: 0 }, 5), false);
  assert.equal(canPatientSeeDocument({ ...doc, revoked_at: "2026-09-09" }, 5), false);
  // O driver pode devolver o inteiro como string.
  assert.equal(canPatientSeeDocument({ ...doc, shared_with_patient: "1" }, 5), true);
});

test("validation URL and printed host", () => {
  assert.equal(validationUrlFor("https://clinica.com.br/", "RNV-ABCD-EFGH"), "https://clinica.com.br/validar/RNV-ABCD-EFGH");
  assert.equal(validationHost("https://clinica.com.br/validar/RNV-ABCD-EFGH"), "clinica.com.br/validar");
  assert.equal(validationHost("http://localhost:3000/validar/RNV-ABCD-EFGH"), "localhost:3000/validar");
});

test("the WhatsApp message carries the portal link and the code", () => {
  const msg = documentWhatsAppMessage({
    firstName: "Ana",
    clinicName: "Clínica Renova",
    title: "Atestado médico",
    portalUrl: "https://clinica.com.br/p/abc.def",
    code: "RNV-ABCD-EFGH",
  });
  assert.match(msg, /^Olá Ana! Aqui é da Clínica Renova\./);
  assert.match(msg, /"Atestado médico"/);
  assert.match(msg, /https:\/\/clinica\.com\.br\/p\/abc\.def/);
  assert.match(msg, /RNV-ABCD-EFGH$/);
});

test("DOCUMENT_KIND_LABEL matches DOCUMENT_KINDS", () => {
  for (const { kind, label } of DOCUMENT_KINDS) assert.equal(DOCUMENT_KIND_LABEL[kind], label);
});

// ---------- protocolos ----------

test("serializeProtocol/parseProtocol round-trip the items and tolerate garbage", () => {
  assert.equal(PROTOCOL_KIND, "protocolo");
  const items = [
    { kind: "atestado", subkind: "medico", template_id: 3, title: null, fields: { dias: "2", cid_consent: "on" } },
    { kind: "encaminhamento", subkind: null, template_id: null, title: " Para o cardio ", fields: { destino: "Cardiologia" } },
  ];
  const json = serializeProtocol(items);
  assert.deepEqual(JSON.parse(json), {
    items: [
      { kind: "atestado", subkind: "medico", template_id: 3, title: null, fields: { dias: "2", cid_consent: "1" } },
      { kind: "encaminhamento", subkind: null, template_id: null, title: "Para o cardio", fields: { destino: "Cardiologia" } },
    ],
  });
  assert.deepEqual(parseProtocol(json), JSON.parse(json).items);

  assert.deepEqual(parseProtocol(null), []);
  assert.deepEqual(parseProtocol(""), []);
  assert.deepEqual(parseProtocol("{oops"), []);
  assert.deepEqual(parseProtocol("[]"), []);
  assert.deepEqual(parseProtocol(JSON.stringify({ template_id: 1, fields: { dias: "1" } })), []);
  // Lista solta também vale; item sem tipo válido é pulado; subtipo estranho vira "medico"; id inválido vira null.
  assert.deepEqual(
    parseProtocol(JSON.stringify([{ kind: "receita" }, { kind: "atestado", subkind: "zzz", template_id: -4, title: "", fields: null }, 7])),
    [{ kind: "atestado", subkind: "medico", template_id: null, title: null, fields: {} }]
  );
  // Subtipo só existe no atestado.
  assert.equal(parseProtocolItem({ kind: "laudo", subkind: "medico" }).subkind, null);
  assert.equal(parseProtocolItem({ kind: "laudo", title: "x".repeat(200) }).title.length, 120);
  assert.equal(parseProtocolItem(null), null);
  assert.equal(parseProtocolItem([]), null);
  const tooMany = Array.from({ length: MAX_PROTOCOL_ITEMS + 4 }, () => ({ kind: "laudo" }));
  assert.equal(parseProtocol(JSON.stringify(tooMany)).length, MAX_PROTOCOL_ITEMS);
  assert.equal(JSON.parse(serializeProtocol(tooMany)).items.length, MAX_PROTOCOL_ITEMS);
});

test("protocolSummary joins the printed titles with +", () => {
  assert.equal(
    protocolSummary([
      { kind: "atestado", subkind: "medico", title: null },
      { kind: "encaminhamento", subkind: null, title: null },
      { kind: "orientacoes", subkind: null, title: null },
    ]),
    "Atestado médico + Encaminhamento + Orientações"
  );
  assert.equal(
    protocolSummary([{ kind: "atestado", subkind: "comparecimento", title: " Comparecimento — manhã " }]),
    "Comparecimento — manhã"
  );
  assert.equal(protocolSummary([]), "Protocolo vazio");
});

// ---------- WhatsApp da emissão ----------

test("documentsBatchWhatsAppMessage lists every document with its code and where to check", () => {
  const message = documentsBatchWhatsAppMessage({
    firstName: "Ana",
    clinicName: "Clínica Renova",
    portalUrl: "https://clinica.com.br/p/abc",
    documents: [
      { title: "Atestado médico", code: "RNV-ABCD-EFGH" },
      { title: "Encaminhamento", code: "RNV-JKLM-NPQR" },
    ],
    validationHost: validationHost(validationUrlFor("https://clinica.com.br", "RNV-ABCD-EFGH")),
  });
  assert.equal(
    message,
    "Olá Ana! Aqui é da Clínica Renova. Seus documentos de hoje já estão no seu portal: https://clinica.com.br/p/abc\n" +
      "• Atestado médico — código RNV-ABCD-EFGH\n" +
      "• Encaminhamento — código RNV-JKLM-NPQR\n" +
      "Quem precisar conferir pode validar os códigos em clinica.com.br/validar."
  );
  const single = documentsBatchWhatsAppMessage({
    firstName: "Ana",
    clinicName: "Clínica",
    portalUrl: "https://x.y/p/1",
    documents: [{ title: "Orientações", code: "RNV-ABCD-EFGH" }],
    validationHost: "x.y/validar",
  });
  assert.match(single, /Seu documento de hoje já está no seu portal: https:\/\/x\.y\/p\/1\n• Orientações — código RNV-ABCD-EFGH\n/);
  assert.match(single, /validar o código em x\.y\/validar\.$/);
});

// ---------- pickTemplate ----------

test("pickTemplate: sem modelo salvo, o padrão do tipo e templateId null", () => {
  const picked = pickTemplate(null, "atestado", "comparecimento");
  assert.equal(picked.templateId, null);
  assert.equal(picked.template.title, "Declaração de comparecimento");
  assert.match(picked.template.body, /\{\{entrada\}\}/);
});

test("pickTemplate: modelo de outro tipo é ignorado", () => {
  const saved = { id: 9, kind: "laudo", title: "Laudo X", body: "corpo" };
  const picked = pickTemplate(saved, "encaminhamento", null);
  assert.equal(picked.templateId, null);
  assert.equal(picked.template.title, "Encaminhamento");
});

test("pickTemplate: modelo do tipo vale, e título vazio herda o padrão", () => {
  assert.deepEqual(pickTemplate({ id: 4, kind: "laudo", title: " Laudo X ", body: "corpo" }, "laudo", null), {
    template: { title: "Laudo X", body: "corpo" },
    templateId: 4,
  });
  assert.deepEqual(pickTemplate({ id: 5, kind: "laudo", title: "  ", body: "b" }, "laudo", null), {
    template: { title: "Relatório médico", body: "b" },
    templateId: 5,
  });
});
