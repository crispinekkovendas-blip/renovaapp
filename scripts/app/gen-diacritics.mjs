// Gera android/.../search/Diacritics.kt: os pontos de código com a propriedade
// Unicode "Diacritic" — a mesma classe que searchKey() (src/lib/normalize.ts)
// tira do texto. O Java não tem \p{Diacritic}; o app usa esta tabela.
import { writeFileSync } from "node:fs";

const re = /\p{Diacritic}/u;
const ranges = [];
let start = -1;
for (let cp = 0; cp <= 0x10ffff; cp++) {
  if (cp >= 0xd800 && cp <= 0xdfff) {
    if (start >= 0) ranges.push([start, cp - 1]);
    start = -1;
    continue;
  }
  const hit = re.test(String.fromCodePoint(cp));
  if (hit && start < 0) start = cp;
  if (!hit && start >= 0) {
    ranges.push([start, cp - 1]);
    start = -1;
  }
}
if (start >= 0) ranges.push([start, 0x10ffff]);

const hex = (n) => `0x${n.toString(16).toUpperCase()}`;
const rows = [];
for (let i = 0; i < ranges.length; i += 6) {
  rows.push("        " + ranges.slice(i, i + 6).map(([a, b]) => `${hex(a)}, ${hex(b)}`).join(", ") + ",");
}
const kt = `package br.com.renova.guia.search

// Gerado por scripts/app/gen-diacritics.mjs (Node ${process.version}) — não editar à mão.

/** Pontos de código com a propriedade Unicode "Diacritic", em pares [início, fim]. */
internal object Diacritics {
    private val RANGES = intArrayOf(
${rows.join("\n")}
    )

    fun contains(cp: Int): Boolean {
        var lo = 0
        var hi = RANGES.size / 2 - 1
        while (lo <= hi) {
            val mid = (lo + hi) ushr 1
            when {
                cp < RANGES[mid * 2] -> hi = mid - 1
                cp > RANGES[mid * 2 + 1] -> lo = mid + 1
                else -> return true
            }
        }
        return false
    }
}
`;
const out = "android/app/src/main/java/br/com/renova/guia/search/Diacritics.kt";
writeFileSync(out, kt);
console.log(`${out}: ${ranges.length} faixas`);
