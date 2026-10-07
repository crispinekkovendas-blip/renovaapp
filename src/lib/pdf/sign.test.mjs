import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { buildDocumentPdf } from "./document-pdf.ts";
import { prepareForSigning, injectSignature, embeddedSignature, SIGNATURE_LENGTH } from "./sign.ts";

const BASE = {
  title: "Receituário simples",
  body: "1) DIPIRONA MONOIDRATADA 500 MG — 1 caixa\n   Tomar 1 comprimido de 6 em 6 horas se dor. Via oral.",
  date: "17/09/2026",
  code: "RNV-SIGN-0001",
  validateUrl: "https://renovaapp.vercel.app/validar/RNV-SIGN-0001",
  clinic: { name: "Clínica Renova", line: "Av. Paulista, 1000", cnes: "1234567" },
  patient: { name: "Ana Beatriz Souza", cpf: "412.658.790-01" },
  professional: { name: "Dra. Maibe Foronda", council: "CRM 123456-SP", specialty: "Clínica Médica", rqe: "12345" },
};

const PLACEHOLDER = { reason: "Prescrição médica", name: "Dra. Maibe Foronda", location: "São Paulo/SP" };

async function signablePdf() {
  return Buffer.from(await buildDocumentPdf({ ...BASE, signaturePlaceholder: PLACEHOLDER }));
}

test("sem placeholder, o PDF não finge estar pronto para assinar", async () => {
  const plain = Buffer.from(await buildDocumentPdf(BASE));
  assert.throws(() => prepareForSigning(plain), /sem espaço de assinatura/i);
});

test("com placeholder, o PDF traz ByteRange e Contents", async () => {
  const pdf = await signablePdf();
  const raw = pdf.toString("latin1");
  assert.match(raw, /\/ByteRange/);
  assert.match(raw, /\/SubFilter\s*\/ETSI\.CAdES\.detached/);
  assert.match(raw, /\/Type\s*\/Sig/);
});

/**
 * A regra que faz a assinatura valer: o ByteRange cobre o PDF inteiro **menos**
 * o buraco do /Contents. Uma assinatura não pode assinar a si mesma.
 */
test("o ByteRange pula exatamente o espaço da assinatura", async () => {
  const prepared = prepareForSigning(await signablePdf());
  const [start, firstLen, secondStart, secondLen] = prepared.byteRange;

  assert.equal(start, 0);
  assert.equal(secondStart + secondLen, prepared.pdf.length, "o 2º trecho vai até o fim do arquivo");
  // O buraco é o hex do CMS mais os delimitadores < e >.
  // `signatureLength` do @signpdf conta caracteres hexadecimais, não bytes:
  // o buraco é SIGNATURE_LENGTH de hex mais os delimitadores < e >.
  assert.equal(secondStart - firstLen, SIGNATURE_LENGTH + 2);
  assert.equal(prepared.hole.capacity, SIGNATURE_LENGTH);
  assert.equal(prepared.hole.capacity / 2, 8192, "cabem 8 KB de CMS — folga para cadeia e carimbo");
  // E o ByteRange real ficou escrito no PDF, sem asterisco sobrando.
  const raw = prepared.pdf.toString("latin1");
  assert.ok(raw.includes(`/ByteRange [0 ${firstLen} ${secondStart} ${secondLen}]`), "ByteRange real não foi escrito");
  assert.ok(!raw.includes("/ByteRange [0 /*"), "sobrou o placeholder de asteriscos");
});

test("o digest é SHA-256 dos bytes do ByteRange, e nada mais", async () => {
  const { pdf, byteRange, digestBase64, digestHex } = prepareForSigning(await signablePdf());
  const signedBytes = Buffer.concat([
    pdf.subarray(byteRange[0], byteRange[0] + byteRange[1]),
    pdf.subarray(byteRange[2], byteRange[2] + byteRange[3]),
  ]);
  const manual = crypto.createHash("sha256").update(signedBytes).digest();
  assert.equal(digestBase64, manual.toString("base64"));
  assert.equal(digestHex, manual.toString("hex"));
  assert.equal(Buffer.from(digestBase64, "base64").length, 32, "SHA-256 são 32 bytes");
});

test("preparar duas vezes dá o mesmo resultado", async () => {
  const pdf = await signablePdf();
  const once = prepareForSigning(pdf);
  // Reprocessar o já preparado não pode mover nada nem mudar o hash.
  const twice = prepareForSigning(once.pdf);
  assert.equal(twice.digestHex, once.digestHex);
  assert.deepEqual(twice.byteRange, once.byteRange);
});

/** Round-trip completo, sem fornecedor nenhum: injeta e lê de volta. */
test("a assinatura injetada é a que se lê de volta", async () => {
  const prepared = prepareForSigning(await signablePdf());
  const cms = crypto.randomBytes(1200); // faz as vezes do CMS do IntegraICP
  const signed = injectSignature(prepared, cms);

  assert.equal(signed.length, prepared.pdf.length, "injetar não pode mudar o tamanho do PDF");
  const back = embeddedSignature(signed, prepared.hole);
  assert.equal(back.subarray(0, cms.length).toString("hex"), cms.toString("hex"));
});

test("injetar não mexe nos bytes que foram assinados", async () => {
  const prepared = prepareForSigning(await signablePdf());
  const signed = injectSignature(prepared, crypto.randomBytes(800));
  // Se o digest mudasse, a assinatura recém-colocada já nasceria inválida.
  assert.equal(prepareForSigning(signed).digestHex, prepared.digestHex);
});

test("assinatura maior que o espaço reservado falha com o número na mensagem", async () => {
  const prepared = prepareForSigning(await signablePdf());
  assert.throws(
    () => injectSignature(prepared, crypto.randomBytes(SIGNATURE_LENGTH + 10)),
    /não cabe no espaço reservado.*\d+/s
  );
});
