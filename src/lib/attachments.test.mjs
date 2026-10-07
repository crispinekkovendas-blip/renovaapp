import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALLOWED_MIME,
  ALLOWED_MIME_TYPES,
  MAX_ATTACHMENT_BYTES,
  contentDisposition,
  parsePositiveId,
  fmtBytes,
  safeFileName,
  validateAttachment,
} from "./attachments.ts";

// ---------- validateAttachment ----------

test("rejects a MIME type outside the allow-list", () => {
  const error = validateAttachment({ name: "virus.exe", type: "application/x-msdownload", size: 1024 });
  assert.equal(typeof error, "string");
  assert.match(error, /não permitido/);
});

test("rejects a file over the 10 MB cap and says so in pt-BR", () => {
  const error = validateAttachment({ name: "exame.pdf", type: "application/pdf", size: MAX_ATTACHMENT_BYTES + 1 });
  assert.equal(typeof error, "string");
  assert.match(error, /muito grande/);
  assert.match(error, /10 MB/);
});

test("rejects an empty file and a missing name", () => {
  assert.equal(typeof validateAttachment({ name: "exame.pdf", type: "application/pdf", size: 0 }), "string");
  assert.equal(typeof validateAttachment({ name: "", type: "application/pdf", size: 10 }), "string");
});

test("accepts every allowed MIME type at exactly the cap", () => {
  assert.equal(ALLOWED_MIME.size, 4);
  for (const type of ALLOWED_MIME) {
    assert.equal(validateAttachment({ name: "arquivo", type, size: MAX_ATTACHMENT_BYTES }), null, type);
  }
});

// ---------- safeFileName ----------

test("strips path traversal and directory separators", () => {
  assert.equal(safeFileName("../../etc/passwd"), "passwd");
  assert.equal(safeFileName("C:\\Users\\dr\\exame.pdf"), "exame.pdf");
  assert.equal(safeFileName("/tmp/foto.png"), "foto.png");
});

test("removes control characters (NUL, DEL, newline, tab) and collapses whitespace", () => {
  const nul = String.fromCharCode(0);
  const del = String.fromCharCode(127);
  const newline = String.fromCharCode(10);
  const tab = String.fromCharCode(9);
  const input = `ex${nul}ame${newline}  fi${del}nal${tab}.pdf`;
  assert.equal(safeFileName(input), "exame final.pdf");
});

test("falls back to a placeholder when nothing usable is left", () => {
  assert.equal(safeFileName(""), "arquivo");
  assert.equal(safeFileName(".."), "arquivo");
  assert.equal(safeFileName("../"), "arquivo");
});

test("caps a long name at 120 characters and keeps the extension", () => {
  const long = `${"a".repeat(200)}.jpeg`;
  const safe = safeFileName(long);
  assert.ok(safe.length <= 120, `length ${safe.length}`);
  assert.ok(safe.endsWith(".jpeg"));
});

test("leaves a normal accented name untouched", () => {
  assert.equal(safeFileName("Raio-X tórax (2026).pdf"), "Raio-X tórax (2026).pdf");
});

// ---------- fmtBytes ----------

test("formats bytes, kilobytes and megabytes with a decimal comma", () => {
  assert.equal(fmtBytes(512), "512 B");
  assert.equal(fmtBytes(1536), "1,5 KB");
  assert.equal(fmtBytes(1258291), "1,2 MB");
  assert.equal(fmtBytes(MAX_ATTACHMENT_BYTES), "10 MB");
});

test("treats garbage as zero bytes", () => {
  assert.equal(fmtBytes(-5), "0 B");
  assert.equal(fmtBytes(Number.NaN), "0 B");
});

// ---------- ALLOWED_MIME ----------

test("the MIME set mirrors the MIME list", () => {
  assert.deepEqual([...ALLOWED_MIME], [...ALLOWED_MIME_TYPES]);
});

// ---------- parsePositiveId ----------

test("parsePositiveId accepts positive integers from strings and numbers", () => {
  assert.equal(parsePositiveId("12"), 12);
  assert.equal(parsePositiveId(" 7 "), 7);
  assert.equal(parsePositiveId(3), 3);
});

test("parsePositiveId rejects blanks, zero, negatives, fractions, garbage and non-strings", () => {
  for (const raw of ["", "  ", "0", "-1", "1.5", "abc", null, undefined, {}, Number.NaN]) {
    assert.equal(parsePositiveId(raw), null, String(raw));
  }
});

// ---------- contentDisposition ----------

test("contentDisposition keeps a plain ASCII name as is", () => {
  assert.equal(contentDisposition("exame.pdf"), `inline; filename="exame.pdf"; filename*=UTF-8''exame.pdf`);
});

test("contentDisposition replaces non-ASCII, quotes and backslashes in the ASCII fallback", () => {
  const header = contentDisposition('Raio "X" tórax\\a.pdf');
  assert.match(header, /filename="Raio _X_ t_rax_a\.pdf"/);
  assert.match(header, /filename\*=UTF-8''Raio%20%22X%22%20t%C3%B3rax%5Ca\.pdf$/);
});

test("contentDisposition percent-encodes the characters encodeURIComponent leaves alone", () => {
  assert.match(contentDisposition("a(1)'*.pdf"), /filename\*=UTF-8''a%281%29%27%2A\.pdf$/);
});
