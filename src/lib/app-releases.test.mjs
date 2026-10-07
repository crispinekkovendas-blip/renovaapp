import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { apkReleases, parseReleases, RELEASES_DIR } from "./app-releases.ts";

test("releases do app: da mais nova para a mais velha, sem entrada malformada", () => {
  const list = parseReleases([
    { version: "1.0.9", publishedAt: "2026-10-01", fileName: "GuiaRenova-1.0.9.apk", size: 1 },
    { version: "1.0.13", publishedAt: "2026-10-07", fileName: "GuiaRenova-1.0.13.apk", size: 2 },
    { version: "1.0.10", fileName: "GuiaRenova-1.0.10.apk" },
    { version: "1.0.14", fileName: "../segredo.apk" },
    { version: "x", fileName: "a.apk" },
    null,
  ]);
  assert.deepEqual(list.map((r) => r.version), ["1.0.13", "1.0.10", "1.0.9"]);
  assert.deepEqual(parseReleases({ nada: 1 }), []);
});

test("releases do app: cada APK da lista está na pasta, com o tamanho certo", () => {
  if (!existsSync(path.join(RELEASES_DIR, "releases.json"))) return;
  const list = apkReleases();
  assert.ok(list.length >= 1);
  for (const r of list) {
    const file = path.join(RELEASES_DIR, r.fileName);
    assert.ok(existsSync(file), r.fileName);
    assert.equal(statSync(file).size, r.size, r.fileName);
    assert.equal(readFileSync(file).subarray(0, 2).toString(), "PK", `${r.fileName} não parece um APK`);
  }
});
