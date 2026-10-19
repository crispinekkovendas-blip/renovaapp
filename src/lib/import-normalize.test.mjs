import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanPatient, findDuplicates, formatPhone, isoDate, validCpf } from "../../scripts/import/normalize.mjs";

// Testes da importação em lote (scripts/import/) — ficam aqui para rodar no `npm test`.
const TODAY = "2026-10-19";

test("CPF: confere os dígitos verificadores", () => {
  assert.equal(validCpf("529.982.247-25"), true);
  assert.equal(validCpf("52998224725"), true);
  assert.equal(validCpf("529.982.247-26"), false);
  assert.equal(validCpf("111.111.111-11"), false);
  assert.equal(validCpf("1234"), false);
});

test("datas brasileiras e ISO; data impossível vira null", () => {
  assert.equal(isoDate("31/12/1980"), "1980-12-31");
  assert.equal(isoDate("1/2/1990"), "1990-02-01");
  assert.equal(isoDate("1980-12-31 00:00:00"), "1980-12-31");
  assert.equal(isoDate("31/02/1990"), null);
  assert.equal(isoDate("ontem"), null);
});

test("celular no padrão do Renova, sem o 55", () => {
  assert.equal(formatPhone("+55 11 98765-4321"), "(11) 98765-4321");
  assert.equal(formatPhone("1133224455"), "(11) 3322-4455");
  assert.equal(formatPhone("98765"), null);
});

test("paciente: limpa o que dá e anota o que ficou de fora, sem inventar", () => {
  const { patient, encounters, problems } = cleanPatient(
    {
      ref: 77,
      name: "  Maria   da Silva ",
      cpf: "529.982.247-26",
      birth_date: "15/03/1975",
      phone: "11987654321",
      email: "maria@",
      allergies: "Dipirona",
      encounters: [
        { date: "10/01/2024", complaint: "Cefaleia", prescription: "Paracetamol 750 mg" },
        { date: "", anamnesis: "sem data" },
        { date: "01/01/2030", complaint: "futuro" },
        { date: "02/02/2024" },
      ],
    },
    TODAY,
  );
  assert.equal(patient.name, "Maria da Silva");
  assert.equal(patient.cpf, undefined);
  assert.equal(patient.birth_date, "1975-03-15");
  assert.equal(patient.phone, "(11) 98765-4321");
  assert.equal(patient.email, undefined);
  assert.equal(patient.allergies, "Dipirona");
  assert.deepEqual(encounters, [{ date: "2024-01-10", complaint: "Cefaleia", prescription: "Paracetamol 750 mg" }]);
  assert.equal(problems.length, 4);
  assert.match(problems.join("|"), /CPF inválido/);
});

test("duplicados: CPF, celular ou nome + nascimento, no arquivo e no Renova", () => {
  const rows = [
    { patient: { name: "João Souza", cpf: "529.982.247-25" } },
    { patient: { name: "JOAO  SOUZA", birth_date: "1980-01-01", phone: "(11) 91234-5678" } },
    { patient: { name: "João Souza", birth_date: "1980-01-01" } },
    { patient: { name: "Outra Pessoa" } },
  ];
  const renova = [{ id: 5, name: "Joao Souza", cpf: "52998224725" }];
  const result = findDuplicates(rows, renova);
  assert.deepEqual(result[0], { renova: [5], sameFile: [] });
  assert.deepEqual(result[1].sameFile, [2]);
  assert.deepEqual(result[2].sameFile, [1]);
  assert.deepEqual(result[3], { renova: [], sameFile: [] });
});
