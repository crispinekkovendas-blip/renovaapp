import { test } from "node:test";
import assert from "node:assert/strict";
import { firstWithColumns, isMigrationPending, isMissingColumn, isUniqueViolation, pgCode } from "./pg-errors.ts";

const pg = (code) => Object.assign(new Error(`pg ${code}`), { code });

test("pgCode lê o código de qualquer coisa sem quebrar", () => {
  assert.equal(pgCode(pg("42703")), "42703");
  assert.equal(pgCode(new Error("x")), "");
  assert.equal(pgCode(null), "");
  assert.equal(pgCode("42703"), "");
});

test("classificação dos códigos", () => {
  assert.ok(isMissingColumn(pg("42703")));
  assert.ok(!isMissingColumn(pg("42P01")));
  assert.ok(isUniqueViolation(pg("23505")));
  for (const code of ["42P01", "42703", "23514"]) assert.ok(isMigrationPending(pg(code)), code);
  assert.ok(!isMigrationPending(pg("23505")));
});

test("firstWithColumns: 42703 passa para a próxima tentativa", async () => {
  const calls = [];
  const result = await firstWithColumns([
    async () => { calls.push(1); throw pg("42703"); },
    async () => { calls.push(2); return "antiga"; },
    async () => { calls.push(3); return "nunca"; },
  ]);
  assert.equal(result, "antiga");
  assert.deepEqual(calls, [1, 2]);
});

test("firstWithColumns: outro erro sobe na hora", async () => {
  const calls = [];
  await assert.rejects(
    firstWithColumns([
      async () => { calls.push(1); throw pg("23505"); },
      async () => { calls.push(2); return "x"; },
    ]),
    (error) => error.code === "23505"
  );
  assert.deepEqual(calls, [1]);
});

test("firstWithColumns: 42703 na última tentativa sobe", async () => {
  await assert.rejects(
    firstWithColumns([async () => { throw pg("42703"); }, async () => { throw pg("42703"); }]),
    (error) => error.code === "42703"
  );
});
