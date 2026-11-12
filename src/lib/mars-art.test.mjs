import assert from "node:assert/strict";
import { test } from "node:test";
import { MARS_ARTS, marsArtOf } from "./mars-art.ts";

test("três dias seguidos mostram os três desenhos, e o quarto repete o primeiro", () => {
  const days = ["2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"].map(marsArtOf);
  assert.equal(new Set(days.slice(0, 3)).size, 3);
  assert.equal(days[3], days[0]);
});

test("o rodízio atravessa a virada de mês e de ano sem pular nem repetir", () => {
  const order = (a, b) => (MARS_ARTS.indexOf(b) - MARS_ARTS.indexOf(a) + 3) % 3;
  assert.equal(order(marsArtOf("2026-11-30"), marsArtOf("2026-12-01")), 1);
  assert.equal(order(marsArtOf("2026-12-31"), marsArtOf("2027-01-01")), 1);
  assert.equal(order(marsArtOf("2028-02-28"), marsArtOf("2028-02-29")), 1);
});

test("a mesma data dá sempre o mesmo desenho, e data torta não quebra", () => {
  assert.equal(marsArtOf("2026-11-12"), marsArtOf("2026-11-12"));
  assert.ok(MARS_ARTS.includes(marsArtOf("")));
  assert.ok(MARS_ARTS.includes(marsArtOf("ontem")));
});
