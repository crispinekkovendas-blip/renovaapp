import { test } from "node:test";
import assert from "node:assert/strict";
import { baseUrl, firstName, groupByPatient, migrationPending } from "./helpers.ts";

test("migrationPending recognises missing table/column only", () => {
  assert.equal(migrationPending({ code: "42P01" }), true);
  assert.equal(migrationPending({ code: "42703" }), true);
  assert.equal(migrationPending({ code: "08006" }), false);
  assert.equal(migrationPending(new Error("x")), false);
  assert.equal(migrationPending(null), false);
});

test("baseUrl prefers the production host, then forwarded headers", () => {
  const h = (init) => new Headers(init);
  assert.equal(baseUrl(h({ host: "x" }), "renovaapp.vercel.app"), "https://renovaapp.vercel.app");
  assert.equal(baseUrl(h({}), " https://renova.app "), "https://renova.app");
  assert.equal(baseUrl(h({ "x-forwarded-host": "a.b", "x-forwarded-proto": "https, http" }), undefined), "https://a.b");
  assert.equal(baseUrl(h({ host: "localhost:3100" }), ""), "http://localhost:3100");
  assert.equal(baseUrl(h({ host: "renova.app" }), undefined), "https://renova.app");
  assert.equal(baseUrl(h({}), undefined), "http://localhost:3000");
});

test("groupByPatient keeps order within each patient", () => {
  const map = groupByPatient([
    { id: 1, patient_id: 12 },
    { id: 2, patient_id: 13 },
    { id: 3, patient_id: 12 },
  ]);
  assert.deepEqual(map.get(12).map((s) => s.id), [1, 3]);
  assert.deepEqual(map.get(13).map((s) => s.id), [2]);
  assert.equal(map.get(99), undefined);
});

test("firstName", () => {
  assert.equal(firstName("Ana Maria Souza"), "Ana");
  assert.equal(firstName("Bia"), "Bia");
});
