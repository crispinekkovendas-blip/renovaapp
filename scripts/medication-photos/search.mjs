// Busca no Wikimedia Commons uma foto de licença livre para cada marca.
// A lista de marcas (brands.json: [{key, brand, substances}]) sai da tabela
// medications com isGenericName/brandCase (só comercializadas). Depois:
// conferir cada foto numa folha de contato e rodar build.mjs.
// Uso: node commons_search.mjs brands.json candidates.json
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const [, , IN, OUT] = process.argv;
const UA = "RenovaApp/1.0 (clinic software; contact crispin.ekkovendas@gmail.com) brand-photo-matcher";
const brands = JSON.parse(readFileSync(IN, "utf8"));
const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

const key = (s) => (s ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/<[^>]+>/g, " ").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const SALTS = new Set("sodica sodico potassica potassico calcica calcico magnesica cloridrato bromidrato maleato succinato tartarato fumarato mesilato besilato acetato citrato sulfato fosfato monoidratada monoidratado trihidratada triidratada hidratada anidra anidro acido".split(" "));
// pt → en roots, so "clonazepam"/"sertralina" still match English categories ("Sertraline").
const root = (w) => w.replace(/(ina|ino|ona|ida|ato|ol|am)$/, "");
const DRUG = /\b(tablet|tablets|pill|pills|capsule|capsules|comprimido|comprimidos|capsula|medicine|medicines|medication|medicamento|medicamentos|drug|drugs|pharmaceutical|pharmaceuticals|blister|packaging|package|box|embalagem|caixa|ampoule|ampola|syrup|xarope|drops|gotas|ointment|pomada|inhaler|injection|vial|frasco|bottle)\b/;
const BAD = /\b(propaganda|advert|advertisement|ad|anuncio|sales|court|logo|chart|graph|map|structure|molecule|formula|skeletal|ball and stick|3d|protest|building|factory|headquarters|street|mosque|bazar|portrait|trial)\b/;
const PACK = /\b(box|packaging|package|embalagem|caixa|blister|pack|carton)\b/;
const OK_LICENSE = /^(public domain|pd|cc0|cc by(-sa)? [\d.]+( [a-z\-]+)?)$/i;

async function api(params) {
  const u = new URL("https://commons.wikimedia.org/w/api.php");
  for (const [k, v] of Object.entries({ format: "json", formatversion: "2", maxlag: "5", ...params })) u.searchParams.set(k, v);
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(u, { headers: { "User-Agent": UA } });
    if (r.ok) {
      const j = await r.json();
      if (!j.error) return j;
      if (j.error.code !== "maxlag") throw new Error(j.error.info);
    }
    await new Promise((res) => setTimeout(res, 2000 * (attempt + 1)));
  }
  throw new Error("api retries exhausted");
}

function judge(b, page) {
  const ii = page.imageinfo?.[0];
  if (!ii) return null;
  const m = ii.extmetadata ?? {};
  const license = (m.LicenseShortName?.value ?? "").trim();
  if (!OK_LICENSE.test(license)) return null;
  if (!/^image\/(jpeg|png|webp)$/.test(ii.mime)) return null;
  if (ii.width < 200 || ii.height < 150) return null;
  const title = key(page.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, ""));
  if (!(` ${title} `).includes(` ${b.key} `)) return null;
  const cats = key((page.categories ?? []).map((c) => c.title.replace(/^Category:/, "")).join(" | "));
  const desc = key(m.ImageDescription?.value ?? "");
  const hay = `${title} ${cats} ${desc}`;
  if (BAD.test(title) || BAD.test(cats)) return null;
  const subWords = new Set();
  for (const s of b.substances) for (const w of key(s).split(" ")) if (w.length >= 5 && !SALTS.has(w)) subWords.add(w);
  const hayWords = hay.split(" ");
  const subHit = [...subWords].some((w) => hayWords.some((h) => h === w || (h.length >= 5 && root(h) === root(w)) || (root(w).length >= 5 && h.startsWith(root(w)))));
  const drugHit = DRUG.test(hay);
  if (!subHit && !(drugHit && b.key.length >= 6)) return null;
  let score = (subHit ? 3 : 0) + (drugHit ? 1 : 0) + (PACK.test(hay) ? 2 : 0) + (/^(public domain|pd|cc0)$/i.test(license) ? 1 : 0);
  return {
    file: page.title,
    page: ii.descriptionurl,
    thumb: ii.thumburl,
    license,
    licenseUrl: m.LicenseUrl?.value ?? null,
    artist: key(m.Artist?.value ?? "") ? (m.Artist.value.replace(/<[^>]+>/g, "").trim()) : null,
    credit: (m.Credit?.value ?? "").replace(/<[^>]+>/g, "").trim().slice(0, 200) || null,
    score,
    subHit,
  };
}

let n = 0;
const queue = brands.filter((b) => b.key.length >= 4 && !(b.key in done));
console.log(`to search: ${queue.length} (already ${Object.keys(done).length})`);
async function worker() {
  while (queue.length) {
    const b = queue.shift();
    try {
      const j = await api({
        action: "query", generator: "search", gsrnamespace: "6", gsrsearch: `intitle:"${b.brand}"`, gsrlimit: "10",
        prop: "imageinfo|categories", iiprop: "url|extmetadata|mime|size", iiurlwidth: "320", clshow: "!hidden", cllimit: "max",
      });
      const found = (j.query?.pages ?? []).map((p) => judge(b, p)).filter(Boolean).sort((a, c) => c.score - a.score);
      done[b.key] = { brand: b.brand, substances: b.substances, candidates: found.slice(0, 4) };
    } catch (e) {
      console.error(b.brand, e.message);
    }
    if (++n % 100 === 0) {
      writeFileSync(OUT, JSON.stringify(done));
      console.log(n, "searched;", Object.values(done).filter((d) => d.candidates.length).length, "with photo");
    }
    await new Promise((res) => setTimeout(res, 150));
  }
}
await Promise.all([worker()]);
writeFileSync(OUT, JSON.stringify(done));
console.log("done", Object.keys(done).length, "with photo:", Object.values(done).filter((d) => d.candidates.length).length);
