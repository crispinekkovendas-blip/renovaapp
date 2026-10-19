import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SHEET_STYLE,
  SHEET_PRESETS,
  checkLogo,
  hexToRgb01,
  isDefaultStyle,
  normalizeSheetStyle,
  parseSheetStyle,
  parseTemplates,
  templatesFor,
  tint,
} from "./sheet-style.ts";

test("estilo: o que não vale volta ao padrão; texto é aparado", () => {
  const style = normalizeSheetStyle({
    accent: "#2F6553",
    align: "center",
    logo: "../../etc/passwd",
    rule: "pontilhada",
    scale: "grande",
    meds: "lista",
    headerNote: "  Clínica geral   ·  Família ",
    footerNote: "x".repeat(500),
    extra: "ignorado",
  });
  assert.equal(style.accent, "#2f6553");
  assert.equal(style.align, "center");
  assert.equal(style.logo, null);
  assert.equal(style.rule, "grossa");
  assert.equal(style.scale, "grande");
  assert.equal(style.headerNote, "Clínica geral · Família");
  assert.equal(style.footerNote.length, 140);
  assert.ok(!("extra" in style));
  assert.deepEqual(parseSheetStyle("lixo"), DEFAULT_SHEET_STYLE);
  assert.deepEqual(parseSheetStyle(null), DEFAULT_SHEET_STYLE);
  assert.equal(isDefaultStyle(parseSheetStyle(JSON.stringify(DEFAULT_SHEET_STYLE))), true);
  for (const preset of SHEET_PRESETS) assert.deepEqual(normalizeSheetStyle(preset.style), preset.style, preset.id);
});

test("cores", () => {
  assert.deepEqual(hexToRgb01("#ff0000"), [1, 0, 0]);
  assert.equal(tint("#000000", 1), "#ffffff");
  assert.equal(tint("#3d0e6b", 0), "#3d0e6b");
});

test("modelos salvos: lidos com tolerância e filtrados por profissional", () => {
  const all = parseTemplates(
    JSON.stringify([
      { id: "a", name: "Da clínica", professional_id: null, style: { accent: "#1d4e89" } },
      { id: "b", name: "Do Dr. 2", professional_id: 2, style: {} },
      { id: "c", name: "Do Dr. 3", professional_id: 3, style: {} },
      { name: "sem id" },
      "lixo",
    ]),
  );
  assert.deepEqual(all.map((t) => t.id), ["a", "b", "c"]);
  assert.equal(all[0].style.accent, "#1d4e89");
  assert.deepEqual(templatesFor(all, 2).map((t) => t.id), ["a", "b"]);
  assert.deepEqual(parseTemplates("{"), []);
});

test("logotipo: só PNG/JPEG e até 300 KB", () => {
  assert.deepEqual(checkLogo("data:image/png;base64,iVBORw0KGgo="), { ok: true, mime: "image/png" });
  assert.equal(checkLogo("data:image/svg+xml;base64,PHN2Zz4=").ok, false);
  assert.equal(checkLogo(`data:image/jpeg;base64,${"A".repeat(500_000)}`).ok, false);
});

test("documento sem cópia do estilo é de antes do redesign: sai roxo, como saiu", async () => {
  const { styleFromDocumentFields, LEGACY_SHEET_STYLE } = await import("./sheet-style.ts");
  assert.deepEqual(styleFromDocumentFields('{"template_id":null,"fields":{}}'), LEGACY_SHEET_STYLE);
  assert.deepEqual(styleFromDocumentFields(null), LEGACY_SHEET_STYLE);
  assert.equal(styleFromDocumentFields('{"folha":{"accent":"#2c4a6e"}}').accent, "#2c4a6e");
});
