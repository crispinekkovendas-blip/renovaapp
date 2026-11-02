import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { allPhotos, photoCredit, photoForBrands } from "./medication-photos.ts";

test("a foto vem da primeira marca da lista que tiver uma", () => {
  assert.equal(photoForBrands(["Clopam", "Rivotril"])?.brand, "Rivotril");
  assert.equal(photoForBrands(["RIVOTRIL"])?.brand, "Rivotril");
  assert.equal(photoForBrands(["Marca sem foto"]), null);
  assert.equal(photoForBrands(undefined), null);
});

test("toda foto do manifesto existe, tem licença livre e crédito", () => {
  const photos = allPhotos();
  assert.ok(photos.length > 100);
  for (const photo of photos) {
    assert.ok(existsSync(`public${photo.src}`), photo.src);
    assert.match(photo.license, /^(public domain|pd|cc0|cc by(-sa)? [\d.]+( [a-z-]+)?)$/i, photo.brand);
    assert.doesNotMatch(photo.license, /\bnc\b|\bnd\b/i);
    assert.match(photo.page, /^https:\/\/commons\.wikimedia\.org\//);
    assert.match(photoCredit(photo), /Wikimedia Commons$/);
  }
});

test("as fotos rejeitadas na conferência não entram", () => {
  for (const brand of ["Narcan", "Viagra", "Lipitor", "Concerta"]) assert.equal(photoForBrands([brand]), null, brand);
});
