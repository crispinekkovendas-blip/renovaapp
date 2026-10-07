import { test } from "node:test";
import assert from "node:assert/strict";
import { csvField, csvMoney, insuranceCsv, insuranceCsvFilename } from "./csv.ts";

test("csvField quotes only when needed and doubles inner quotes", () => {
  assert.equal(csvField("Ana Souza"), "Ana Souza");
  assert.equal(csvField("a;b"), '"a;b"');
  assert.equal(csvField('Dr. "Zé"'), '"Dr. ""Zé"""');
  assert.equal(csvField("linha\noutra"), '"linha\noutra"');
  assert.equal(csvField(""), "");
});

test("csvMoney uses a decimal comma", () => {
  assert.equal(csvMoney(0), "0,00");
  assert.equal(csvMoney(15050), "150,50");
  assert.equal(csvMoney(5), "0,05");
});

test("insuranceCsv: BOM, CRLF, one line per row and the TOTAL line — byte for byte", () => {
  const csv = insuranceCsv([
    { date: "2026-09-02", start_time: "08:30", procedure: "Consulta", price_cents: 20000, patient_name: "Ana; Souza", cpf: "12345678900", insurance_number: null },
    { date: "2026-09-10", start_time: "14:00", procedure: "Retorno", price_cents: 5050, patient_name: "Bia", cpf: null, insurance_number: "0001" },
  ]);
  assert.equal(
    csv,
    "\uFEFFData;Hora;Paciente;CPF;Carteirinha;Procedimento;Valor (R$)\r\n" +
      '02/09/2026;08:30;"Ana; Souza";12345678900;;Consulta;200,00\r\n' +
      "10/09/2026;14:00;Bia;;0001;Retorno;50,50\r\n" +
      "TOTAL;;;;;;250,50"
  );
  assert.equal(insuranceCsv([]), "\uFEFFData;Hora;Paciente;CPF;Carteirinha;Procedimento;Valor (R$)\r\nTOTAL;;;;;;0,00");
});

test("insuranceCsvFilename slugs the insurance name", () => {
  assert.equal(insuranceCsvFilename("Unimed", "2026-09"), "faturamento-unimed-2026-09.csv");
  assert.equal(insuranceCsvFilename("Bradesco Saúde", "2026-09"), "faturamento-bradesco-sa-de-2026-09.csv");
  assert.equal(insuranceCsvFilename("---", "2026-09"), "faturamento-convenio-2026-09.csv");
});
