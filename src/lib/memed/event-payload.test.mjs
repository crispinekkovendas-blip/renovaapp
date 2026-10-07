import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPrescriptionId } from "./event-payload.ts";

test("reads the id from a prescricaoImpressa payload", () => {
  assert.equal(extractPrescriptionId({ prescricao: { id: 4321, prescriptionUuid: "abc" } }), "4321");
});

test("reads the bare id that prescricaoExcluida delivers", () => {
  assert.equal(extractPrescriptionId(1234), "1234");
  assert.equal(extractPrescriptionId("1234"), "1234");
});

test("falls back to known shape variations", () => {
  assert.equal(extractPrescriptionId({ id: 7 }), "7");
  assert.equal(extractPrescriptionId({ data: { id: 9 } }), "9");
});

test("returns null rather than recording a bogus prescription", () => {
  assert.equal(extractPrescriptionId(null), null);
  assert.equal(extractPrescriptionId(undefined), null);
  assert.equal(extractPrescriptionId(""), null);
  assert.equal(extractPrescriptionId({}), null);
  assert.equal(extractPrescriptionId({ prescricao: {} }), null);
});
