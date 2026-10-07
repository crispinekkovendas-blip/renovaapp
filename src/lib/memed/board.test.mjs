import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCouncil } from "./board.ts";

test("parses the common hyphenated form", () => {
  assert.deepEqual(parseCouncil("CRM-SP 123456"), { code: "CRM", number: "123456", state: "SP" });
});

test("parses without a separator", () => {
  assert.deepEqual(parseCouncil("CRO SP 98765"), { code: "CRO", number: "98765", state: "SP" });
});

test("parses with a slash and no space", () => {
  assert.deepEqual(parseCouncil("CRM/RJ 4321"), { code: "CRM", number: "4321", state: "RJ" });
});

test("uppercases lowercase input", () => {
  assert.deepEqual(parseCouncil("crm-mg 777"), { code: "CRM", number: "777", state: "MG" });
});

test("parses the state-last form used by the seeded professionals", () => {
  assert.deepEqual(parseCouncil("CRM 123456-SP"), { code: "CRM", number: "123456", state: "SP" });
  assert.deepEqual(parseCouncil("CRO 654321/RJ"), { code: "CRO", number: "654321", state: "RJ" });
});

test("returns null for text it cannot understand", () => {
  assert.equal(parseCouncil("registro pendente"), null);
  assert.equal(parseCouncil(""), null);
});

test("returns null when the state is missing", () => {
  assert.equal(parseCouncil("CRM 123456"), null);
});

test("returns null for a council code Memed does not accept", () => {
  assert.equal(parseCouncil("XYZ-SP 123456"), null);
});
