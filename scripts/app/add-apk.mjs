// Põe um APK em android-releases/ (o que o site entrega em Guia clínico ›
// App Android) e atualiza releases.json, guardando as 3 versões mais novas.
// O GitHub Actions roda isto ao publicar; também serve à mão.
//
// Uso: node scripts/app/add-apk.mjs <arquivo.apk> <versão, ex. 1.0.13>
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const KEEP = 3;
const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "android-releases");
const [apk, version] = process.argv.slice(2);
if (!apk || !/^\d+(\.\d+)*$/.test(version ?? "")) {
  console.error("uso: node scripts/app/add-apk.mjs <arquivo.apk> <versão>");
  process.exit(1);
}

mkdirSync(DIR, { recursive: true });
const fileName = `GuiaRenova-${version}.apk`;
if (basename(apk) !== fileName || dirname(apk) !== DIR) copyFileSync(apk, join(DIR, fileName));
const manifest = join(DIR, "releases.json");
const list = existsSync(manifest) ? JSON.parse(readFileSync(manifest, "utf8")) : [];
const key = (v) => v.split(".").map(Number);
const all = [
  { version, publishedAt: new Date().toISOString(), fileName, size: statSync(join(DIR, fileName)).size },
  ...list.filter((r) => r.version !== version),
].sort((a, b) => {
  const [x, y] = [key(a.version), key(b.version)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
  return 0;
});
for (const old of all.slice(KEEP)) rmSync(join(DIR, old.fileName), { force: true });
writeFileSync(manifest, JSON.stringify(all.slice(0, KEEP), null, 1) + "\n");
console.log(`android-releases: ${all.slice(0, KEEP).map((r) => r.version).join(", ")}`);
