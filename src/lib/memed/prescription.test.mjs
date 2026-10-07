import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLinkResponse,
  alreadyRegisteredExternalId,
  brDateTimeToISO,
  patientIdFromExternalId,
  memedPatientExternalId,
  parsePrescriptionList,
  matchPatientId,
} from "./prescription.ts";

/** Resposta real da homologação, 2026-09-17 — não uma suposição do formato. */
const PDF_RESPONSE = {
  data: [
    {
      type: "prescricoes",
      attributes: {
        link: "https://integrations.api.memed.com.br/v1/prescricoes/bR3mYj/pdf?document=a5a44633",
        signed: 0,
      },
    },
  ],
  meta: { total: 1 },
};

const PATIENT_LINK_RESPONSE = {
  data: [{ type: "prescricoes", attributes: { link: "https://assistant.memed.com.br/p/bR3mYj", digits: "3047" } }],
  meta: { total: 1 },
};

test("lê o link dentro do array — o formato que a Memed devolve de verdade", () => {
  assert.equal(parseLinkResponse(PDF_RESPONSE).link, PDF_RESPONSE.data[0].attributes.link);
  assert.equal(parseLinkResponse(PATIENT_LINK_RESPONSE).link, "https://assistant.memed.com.br/p/bR3mYj");
});

test("guarda os 4 dígitos que o paciente digita na farmácia", () => {
  assert.equal(parseLinkResponse(PATIENT_LINK_RESPONSE).digits, "3047");
  // O PDF não tem código; não inventa um.
  assert.equal(parseLinkResponse(PDF_RESPONSE).digits, null);
});

test("descarta código que não seja de 4 dígitos", () => {
  assert.equal(parseLinkResponse({ data: [{ attributes: { link: "x", digits: "" } }] }).digits, null);
  assert.equal(parseLinkResponse({ data: [{ attributes: { link: "x", digits: "30" } }] }).digits, null);
});

test("signed só é verdadeiro quando a Memed diz 1", () => {
  assert.equal(parseLinkResponse(PDF_RESPONSE).signed, false);
  assert.equal(parseLinkResponse({ data: [{ attributes: { link: "x", signed: 1 } }] }).signed, true);
});

test("aceita data como objeto e o campo url, por segurança", () => {
  assert.equal(parseLinkResponse({ data: { attributes: { url: "https://pdf" } } }).link, "https://pdf");
});

test("resposta vazia ou quebrada não derruba nada", () => {
  for (const body of [null, undefined, {}, { data: [] }, { data: null }, "texto", { data: [{}] }]) {
    assert.deepEqual(parseLinkResponse(body), { link: null, digits: null, signed: false });
  }
});

test("extrai o id externo do erro de CPF já cadastrado", () => {
  const body = {
    errors: [
      {
        code: "Cpf",
        title: "Erro",
        detail: "Medico ja cadastrado para o parceiro com esse cpf. Id externo (e7b8a2d1-5f42-46de-a7b3-9b7a842f1b5c)",
      },
    ],
  };
  assert.equal(alreadyRegisteredExternalId(body), "e7b8a2d1-5f42-46de-a7b3-9b7a842f1b5c");
});

test("outro erro da Memed não vira um id externo inventado", () => {
  assert.equal(alreadyRegisteredExternalId({ errors: [{ detail: "CPF inválido" }] }), null);
  assert.equal(alreadyRegisteredExternalId({ errors: [] }), null);
  assert.equal(alreadyRegisteredExternalId({}), null);
  assert.equal(alreadyRegisteredExternalId(null), null);
});

test("converte a data brasileira da Memed para a do banco", () => {
  assert.equal(brDateTimeToISO("31/08/2026 21:03:46"), "2026-08-31 21:03:46");
  assert.equal(brDateTimeToISO("01/12/2026"), "2026-12-01");
  assert.equal(brDateTimeToISO("2026-08-31"), null);
  assert.equal(brDateTimeToISO(""), null);
  assert.equal(brDateTimeToISO(null), null);
});

test("id externo do paciente vai e volta", () => {
  assert.equal(memedPatientExternalId(12), "renova-pac-12");
  assert.equal(patientIdFromExternalId("renova-pac-12"), 12);
  // Id gerado pela própria Memed (receita emitida fora do Renova) não é nosso.
  assert.equal(patientIdFromExternalId("01a058fe-a90a-7180-ba6e-2c36b4b728e1"), null);
  assert.equal(patientIdFromExternalId("renova-pac-0"), null);
  assert.equal(patientIdFromExternalId(null), null);
});

/** Recorte fiel de `GET /prescricoes` na homologação. */
const LIST = {
  data: [
    {
      id: 180568,
      type: "prescricoes",
      attributes: {
        created_at: "31/08/2026 21:03:46",
        signed: 0,
        paciente: { id: 438061, external_id: "renova-pac-7", nome: "Fernando Murilo", cpf: "828.093.762-55" },
      },
    },
    {
      id: 175384,
      type: "prescricoes",
      attributes: {
        created_at: "20/08/2026 10:00:00",
        signed: 1,
        paciente: { id: 1, external_id: "01a058fe-a90a-7180", nome: "Outro", cpf: "39053344705" },
      },
    },
  ],
};

test("lista traz id, data convertida e o paciente de cada receita", () => {
  const rows = parsePrescriptionList(LIST);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].id, "180568");
  assert.equal(rows[0].createdAt, "2026-08-31 21:03:46");
  assert.equal(rows[0].signed, false);
  assert.equal(rows[0].patient.externalId, "renova-pac-7");
  assert.equal(rows[0].patient.cpf, "82809376255");
  assert.equal(rows[1].signed, true);
});

test("lista vazia ou inesperada devolve nada, sem lançar", () => {
  assert.deepEqual(parsePrescriptionList({}), []);
  assert.deepEqual(parsePrescriptionList({ data: {} }), []);
  assert.deepEqual(parsePrescriptionList(null), []);
});

test("liga a receita ao paciente pelo nosso id externo", () => {
  const rows = parsePrescriptionList(LIST);
  assert.equal(matchPatientId(rows[0], new Map()), 7);
});

test("sem id nosso, liga pelo CPF — receita emitida direto na Memed", () => {
  const rows = parsePrescriptionList(LIST);
  assert.equal(matchPatientId(rows[1], new Map([["39053344705", 42]])), 42);
});

test("sem id e sem CPF conhecido, não chuta um paciente", () => {
  const rows = parsePrescriptionList(LIST);
  assert.equal(matchPatientId(rows[1], new Map()), null);
});
