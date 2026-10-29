import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { graphMessage, parseWebhook, verifyChallenge, verifySignature } from "./cloud.ts";
import { parsePaymentEvent, verifyWebhookToken, methodLabel } from "./asaas.ts";
import { formatPhone, isoDate, phoneVariants, validCpf } from "./br.ts";
import {
  isNo,
  isYes,
  mergeDraft,
  missingRequired,
  normalizeDraft,
  parseTriageTurn,
  redFlags,
  summaryForPatient,
  wantsHuman,
} from "./triage.ts";
import { decide, geminiContents, noteCorrection, questionnaireStep, windowOpen } from "./flow.ts";
import { DEFAULT_WA_CONFIG, botCanTriage, fillClinic, normalizeWaConfig } from "./config.ts";
import { parseConsultSummary, summaryFromDraft } from "./summary.ts";

const CPF = "529.982.247-25";

test("assinatura da Meta: só o corpo exato com o segredo certo passa", () => {
  const body = '{"entry":[]}';
  const sig = "sha256=" + crypto.createHmac("sha256", "segredo").update(body).digest("hex");
  assert.equal(verifySignature(body, sig, "segredo"), true);
  assert.equal(verifySignature(body + " ", sig, "segredo"), false);
  assert.equal(verifySignature(body, sig, "outro"), false);
  assert.equal(verifySignature(body, sig, undefined), false);
  assert.equal(verifySignature(body, null, "segredo"), false);
});

test("verificação do webhook devolve o challenge só com o token certo", () => {
  const ok = new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "frase", "hub.challenge": "123" });
  assert.equal(verifyChallenge(ok, "frase"), "123");
  assert.equal(verifyChallenge(ok, "outra"), null);
  assert.equal(verifyChallenge(ok, undefined), null);
});

test("webhook: texto, botão, áudio e status", () => {
  const body = {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ wa_id: "5511987654321", profile: { name: "Maria" } }],
              messages: [
                { from: "5511987654321", id: "w1", timestamp: "1700000000", type: "text", text: { body: "Oi" } },
                {
                  from: "5511987654321",
                  id: "w2",
                  type: "interactive",
                  interactive: { type: "button_reply", button_reply: { id: "consentir", title: "Concordo" } },
                },
                { from: "5511987654321", id: "w3", type: "audio", audio: { id: "999", mime_type: "audio/ogg; codecs=opus" } },
                { from: "5511987654321", id: "w4", type: "location", location: {} },
              ],
              statuses: [{ id: "out1", status: "read" }, { id: "out2", status: "failed", errors: [{ title: "Re-engagement" }] }],
            },
          },
        ],
      },
    ],
  };
  const { messages, statuses } = parseWebhook(body);
  assert.equal(messages.length, 4);
  assert.equal(messages[0].text, "Oi");
  assert.equal(messages[0].contactName, "Maria");
  assert.equal(messages[1].buttonId, "consentir");
  assert.equal(messages[2].kind, "audio");
  assert.equal(messages[2].mediaId, "999");
  assert.equal(messages[3].kind, "other");
  assert.deepEqual(statuses[1], { waId: "out2", status: "failed", error: "Re-engagement" });
  assert.deepEqual(parseWebhook(null), { messages: [], statuses: [] });
});

test("mensagem de saída respeita os limites da Meta", () => {
  const m = graphMessage("55119", {
    type: "buttons",
    body: "x".repeat(2000),
    buttons: [1, 2, 3, 4].map((i) => ({ id: `b${i}`, title: "um título comprido demais aqui" })),
  });
  assert.equal(m.interactive.body.text.length, 1024);
  assert.equal(m.interactive.action.buttons.length, 3);
  assert.equal(m.interactive.action.buttons[0].reply.title.length, 20);
});

test("ASAAS: evento de pagamento e token do webhook", () => {
  const e = parsePaymentEvent({
    event: "PAYMENT_RECEIVED",
    payment: { id: "pay_1", externalReference: "wa-case-7", billingType: "PIX", value: 150.5 },
  });
  assert.equal(e.paid, true);
  assert.equal(e.cents, 15050);
  assert.equal(e.externalReference, "wa-case-7");
  assert.equal(parsePaymentEvent({ event: "PAYMENT_REFUNDED", payment: { id: "p" } }).reversed, true);
  assert.equal(parsePaymentEvent({ event: "PAYMENT_CREATED", payment: { id: "p" } }).paid, false);
  assert.equal(parsePaymentEvent({}), null);
  assert.equal(verifyWebhookToken("abc", "abc"), true);
  assert.equal(verifyWebhookToken("abd", "abc"), false);
  assert.equal(verifyWebhookToken(null, "abc"), false);
  assert.equal(verifyWebhookToken("abc", undefined), false);
  assert.equal(methodLabel("CREDIT_CARD"), "cartão de crédito");
});

test("dados brasileiros", () => {
  assert.equal(validCpf(CPF), true);
  assert.equal(validCpf("111.111.111-11"), false);
  assert.equal(isoDate("31/12/1980"), "1980-12-31");
  assert.equal(isoDate("31/02/1980"), null);
  assert.equal(isoDate("01/01/2999"), null);
  assert.equal(formatPhone("5511987654321"), "(11) 98765-4321");
  assert.deepEqual(phoneVariants("551187654321").sort(), ["1187654321", "11987654321"].sort());
  assert.deepEqual(phoneVariants("5511987654321").sort(), ["11987654321", "1187654321"].sort());
});

test("ficha: normaliza, soma sem apagar e diz o que falta", () => {
  const a = normalizeDraft({ nome: "  Ana  Souza ", cpf: "52998224725", nascimento: "02/03/1990", lixo: "x" });
  assert.equal(a.nome, "Ana Souza");
  assert.equal(a.cpf, CPF);
  assert.equal(a.nascimento, "1990-03-02");
  assert.ok(!("lixo" in a));
  const b = mergeDraft(a, { nome: "", queixa: "dor de garganta", sintomas: ["febre"] });
  assert.equal(b.nome, "Ana Souza");
  const c = mergeDraft(b, { sintomas: ["febre", "tosse"] });
  assert.deepEqual(c.sintomas, ["febre", "tosse"]);
  assert.deepEqual(
    missingRequired(c).map((m) => m.field),
    ["historia", "medicamentos", "alergias", "doencas"],
  );
  assert.ok(missingRequired({ ...c, cpf: "123" }).some((m) => m.field === "cpf"));
  const text = summaryForPatient({ ...c, nascimento: "1990-03-02" });
  assert.match(text, /\*Nascimento:\* 02\/03\/1990/);
});

test("sinais de alarme e respostas curtas", () => {
  assert.deepEqual(redFlags("Estou com uma dor forte no peito desde cedo"), ["dor no peito"]);
  assert.deepEqual(redFlags("dor de garganta"), []);
  assert.ok(redFlags("não quero mais viver").includes("risco de suicídio"));
  assert.equal(isYes("Sim"), true);
  assert.equal(isYes("está correto!"), true);
  assert.equal(isYes("sim, mas o CPF está errado"), false);
  assert.equal(isYes("qualquer", "consentir"), true);
  assert.equal(isNo("Não"), true);
  assert.equal(isNo("não concordo"), true);
  assert.equal(wantsHuman("quero falar com um atendente"), true);
  assert.equal(wantsHuman("dor no braço"), false);
});

test("resposta do Gemini lida com tolerância", () => {
  const t = parseTriageTurn('```json\n{"resposta":"Desde quando?","ficha":{"queixa":"tosse"},"completa":false,"urgencia":false}\n```');
  assert.equal(t.resposta, "Desde quando?");
  assert.equal(t.ficha.queixa, "tosse");
  assert.equal(parseTriageTurn("sem json"), null);
  assert.equal(parseTriageTurn('{"ficha":{}}'), null);
});

test("decisões do robô por etapa", () => {
  const base = { mode: "gemini", botPaused: false, buttonId: null, botHasSpoken: true, minutesSinceBot: 30 };
  assert.equal(decide({ ...base, stage: "consentimento", text: "oi", botHasSpoken: false }).kind, "send_consent");
  assert.equal(decide({ ...base, stage: "consentimento", text: "x", buttonId: "consentir" }).kind, "consent_yes");
  assert.equal(decide({ ...base, stage: "consentimento", text: "não" }).kind, "consent_no");
  assert.deepEqual(decide({ ...base, stage: "consentimento", text: "talvez" }), { kind: "send_consent", again: true });
  assert.equal(decide({ ...base, stage: "triagem", text: "dor forte no peito" }).kind, "urgent");
  assert.equal(decide({ ...base, stage: "triagem", text: "atendente" }).kind, "handoff");
  assert.equal(decide({ ...base, stage: "revisao", text: "x", buttonId: "confirmar" }).kind, "confirm_review");
  assert.equal(decide({ ...base, stage: "revisao", text: "x", buttonId: "corrigir" }).kind, "ask_correction");
  assert.deepEqual(decide({ ...base, stage: "revisao", text: "meu CPF está errado" }), { kind: "triage", correcting: true });
  assert.equal(decide({ ...base, stage: "pagamento", text: "paguei", minutesSinceBot: 3 }).kind, "silent");
  assert.equal(decide({ ...base, stage: "pagamento", text: "paguei" }).kind, "payment_reminder");
  assert.equal(decide({ ...base, stage: "consulta", text: "doutor?" }).kind, "silent");
  assert.equal(decide({ ...base, stage: "triagem", text: "oi", botPaused: true }).kind, "silent");
  assert.equal(decide({ ...base, stage: "triagem", text: "oi", mode: "off" }).kind, "silent");
});

test("questionário sem Gemini: pergunta por pergunta, valida CPF e data", () => {
  let s = questionnaireStep({}, null, "estou com dor de cabeça");
  assert.equal(s.draft.queixa, "estou com dor de cabeça");
  assert.equal(s.asking, "nome");
  s = questionnaireStep(s.draft, s.asking, "Ana Souza");
  assert.equal(s.asking, "cpf");
  s = questionnaireStep(s.draft, s.asking, "123");
  assert.equal(s.asking, "cpf");
  assert.match(s.reply, /CPF/);
  s = questionnaireStep(s.draft, s.asking, CPF);
  s = questionnaireStep(s.draft, s.asking, "02/03/1990");
  assert.equal(s.draft.nascimento, "1990-03-02");
  for (const answer of ["há 2 dias", "nenhum", "nenhuma", "nenhuma"]) s = questionnaireStep(s.draft, s.asking, answer);
  assert.equal(s.done, true);
  assert.equal(questionnaireStep({}, null, "Oi").draft.queixa, undefined);
  assert.match(noteCorrection({}, "o nome é Ana Lima").alertas[0], /Correção do paciente/);
});

test("histórico para o Gemini: papéis alternados, começando pelo paciente", () => {
  const c = geminiContents([
    { direction: "out", body: "Olá" },
    { direction: "in", body: "Oi" },
    { direction: "in", body: "tudo bem?" },
    { direction: "out", body: "Qual a queixa?" },
    { direction: "in", body: "" },
  ]);
  assert.deepEqual(c.map((x) => x.role), ["user", "model", "user", "model"]);
  assert.equal(c[2].parts[0].text, "Oi\ntudo bem?");
});

test("janela de 24 h", () => {
  const now = Date.parse("2026-10-29T12:00:00Z");
  assert.equal(windowOpen("2026-10-29T00:00:00Z", now), true);
  assert.equal(windowOpen("2026-10-28T11:00:00Z", now), false);
  assert.equal(windowOpen(null, now), false);
});

test("configuração: valores fora do lugar voltam ao padrão; Gemini só pago", () => {
  const c = normalizeWaConfig({ ativo: true, precoCentavos: -5, vencimentoDias: 99, profissionalId: "3", boasVindas: "" });
  assert.equal(c.precoCentavos, 0);
  assert.equal(c.vencimentoDias, 1);
  assert.equal(c.profissionalId, 3);
  assert.equal(c.boasVindas, DEFAULT_WA_CONFIG.boasVindas);
  assert.equal(botCanTriage(c, true), false);
  assert.equal(botCanTriage({ ...c, geminiPago: true }, true), true);
  assert.equal(botCanTriage({ ...c, geminiPago: true }, false), false);
  assert.equal(fillClinic("Olá da {clinica}", "Renova"), "Olá da Renova");
});

test("resumo da consulta: lido com tolerância, CID validado, negativas fora", () => {
  const s = parseConsultSummary(
    JSON.stringify({ queixa: "Tosse", anamnese: "x", conduta: "y", cid: "j06.9", alergias: ["Dipirona", "nega"], retorno_dias: 15 }),
  );
  assert.equal(s.cid, "J06.9");
  assert.deepEqual(s.alergias, ["Dipirona"]);
  assert.equal(s.retornoDias, 15);
  assert.equal(parseConsultSummary(JSON.stringify({ queixa: "a", cid: "lixo" })).cid, "");
  assert.equal(parseConsultSummary("nada"), null);
  const d = summaryFromDraft({ queixa: "Febre", alergias: "nenhuma", medicamentos: "Losartana 50 mg", historia: "há 2 dias" });
  assert.deepEqual(d.alergias, []);
  assert.deepEqual(d.medicamentos, ["Losartana 50 mg"]);
  assert.match(d.anamnese, /há 2 dias/);
});
