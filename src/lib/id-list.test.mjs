import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIdList } from "./id-list.ts";

test("parseIdList reads positive integers in order, without repeats", () => {
  assert.deepEqual(parseIdList("12,15,7"), [12, 15, 7]);
  assert.deepEqual(parseIdList(" 3 , 3 ,4"), [3, 4]);
  assert.deepEqual(parseIdList("5"), [5]);
});

test("parseIdList ignores garbage and empties instead of throwing", () => {
  assert.deepEqual(parseIdList(""), []);
  assert.deepEqual(parseIdList(null), []);
  assert.deepEqual(parseIdList(undefined), []);
  assert.deepEqual(parseIdList("a,-1,0,1.5,2e3,,9"), [9]);
  assert.deepEqual(parseIdList("99999999999999999999"), []);
});

test("parseIdList caps the list", () => {
  const many = Array.from({ length: 15 }, (_, i) => i + 1).join(",");
  assert.deepEqual(parseIdList(many), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(parseIdList(many, 3), [1, 2, 3]);
});
