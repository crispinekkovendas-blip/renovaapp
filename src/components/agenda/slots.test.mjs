import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SLOT_COUNT,
  SLOT_LABELS,
  byStartTime,
  clampedSlotIndex,
  groupBy,
  slotIndexOf,
  slotLabel,
  timeToMinutes,
} from "./slots.ts";

test("a faixa vai de 07:00 a 18:30, de 30 em 30 min", () => {
  assert.equal(SLOT_COUNT, 24);
  assert.equal(SLOT_LABELS.length, 24);
  assert.equal(SLOT_LABELS[0], "07:00");
  assert.equal(SLOT_LABELS[1], "07:30");
  assert.equal(SLOT_LABELS.at(-1), "18:30");
});

test("slotLabel preenche com zero", () => {
  assert.equal(slotLabel(0), "00:00");
  assert.equal(slotLabel(7 * 60 + 5), "07:05");
  assert.equal(slotLabel(19 * 60), "19:00");
});

test("timeToMinutes aceita HH:MM e HH:MM:SS; lixo vira zero", () => {
  assert.equal(timeToMinutes("09:30"), 570);
  assert.equal(timeToMinutes("09:30:59"), 570);
  assert.equal(timeToMinutes("xx:15"), 15);
  assert.equal(timeToMinutes(""), 0);
});

test("slotIndexOf arredonda para baixo dentro da faixa", () => {
  assert.equal(slotIndexOf("07:00"), 0);
  assert.equal(slotIndexOf("07:29"), 0);
  assert.equal(slotIndexOf("07:30"), 1);
  assert.equal(slotIndexOf("12:45"), 11);
  assert.equal(slotIndexOf("18:59"), 23);
});

test("slotIndexOf: fora da faixa é -1 (a agenda do dia não mostra)", () => {
  assert.equal(slotIndexOf("06:59"), -1);
  assert.equal(slotIndexOf("19:00"), -1);
  assert.equal(slotIndexOf("22:10"), -1);
});

test("slotIndexOf bate com a comparação de texto que a agenda do dia usava", () => {
  // Antes: a.start_time >= rótulo && a.start_time < próximo rótulo.
  for (let m = 6 * 60; m < 20 * 60; m += 7) {
    const t = slotLabel(m);
    const legacy = SLOT_LABELS.findIndex((label, i) => t >= label && t < slotLabel(7 * 60 + (i + 1) * 30));
    assert.equal(slotIndexOf(t), legacy, t);
  }
});

test("clampedSlotIndex: fora da faixa cai na primeira ou na última linha", () => {
  assert.equal(clampedSlotIndex("06:00"), 0);
  assert.equal(clampedSlotIndex("08:15"), 2);
  assert.equal(clampedSlotIndex("19:00"), 23);
  assert.equal(clampedSlotIndex("23:30"), 23);
});

test("byStartTime ordena por horário e depois por id, sem mexer na lista", () => {
  const list = [
    { id: 3, start_time: "10:00" },
    { id: 1, start_time: "09:00" },
    { id: 2, start_time: "10:00" },
  ];
  assert.deepEqual(
    byStartTime(list).map((a) => a.id),
    [1, 2, 3]
  );
  assert.deepEqual(
    list.map((a) => a.id),
    [3, 1, 2]
  );
});

test("groupBy mantém a ordem de entrada e descarta chave null", () => {
  const buckets = groupBy([1, 2, 3, 4, 5, 6], (n) => (n === 5 ? null : n % 2 ? "ímpar" : "par"));
  assert.deepEqual(buckets.get("ímpar"), [1, 3]);
  assert.deepEqual(buckets.get("par"), [2, 4, 6]);
  assert.equal(buckets.size, 2);
});
