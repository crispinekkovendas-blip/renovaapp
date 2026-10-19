/**
 * Forma farmacêutica do item da receita — comprimido, cápsula, gotas… — para
 * as frases prontas e a quantidade falarem a mesma língua do medicamento:
 * receitou cápsula, a frase diz "1 cápsula" e a quantidade sugere "21 cápsulas".
 *
 * Vem da apresentação da CMED quando o item saiu da busca ("500 MG CAP DURA CT
 * BL…"); sem isso, do que o médico escreveu no nome, na quantidade ou na
 * posologia.
 */

export const DOSAGE_FORMS = [
  "comprimido",
  "capsula",
  "dragea",
  "sache",
  "gotas",
  "liquido",
  "topico",
  "colirio",
  "nasal",
  "inalatorio",
  "injetavel",
  "adesivo",
  "supositorio",
  "ovulo",
] as const;
export type DosageForm = (typeof DOSAGE_FORMS)[number];

export function isDosageForm(value: unknown): value is DosageForm {
  return typeof value === "string" && (DOSAGE_FORMS as readonly string[]).includes(value);
}

interface FormInfo {
  /** Como aparece ao lado do medicamento na busca. */
  label: string;
  /** A unidade que se toma/aplica: singular e plural; null quando a dose é em mL, jatos… */
  unit: readonly [string, string] | null;
  /** Embalagens para a quantidade, da mais comum para a menos. */
  packages: readonly string[];
}

export const FORM_INFO: Record<DosageForm, FormInfo> = {
  comprimido: { label: "Comprimido", unit: ["comprimido", "comprimidos"], packages: ["1 caixa", "2 caixas"] },
  capsula: { label: "Cápsula", unit: ["cápsula", "cápsulas"], packages: ["1 caixa", "2 caixas"] },
  dragea: { label: "Drágea", unit: ["drágea", "drágeas"], packages: ["1 caixa", "2 caixas"] },
  sache: { label: "Sachê", unit: ["sachê", "sachês"], packages: ["1 caixa", "2 caixas"] },
  gotas: { label: "Gotas", unit: null, packages: ["1 frasco", "2 frascos"] },
  liquido: { label: "Solução / suspensão oral", unit: null, packages: ["1 frasco", "2 frascos"] },
  topico: { label: "Uso tópico", unit: null, packages: ["1 bisnaga", "2 bisnagas", "1 frasco"] },
  colirio: { label: "Colírio", unit: null, packages: ["1 frasco"] },
  nasal: { label: "Spray nasal", unit: null, packages: ["1 frasco"] },
  inalatorio: { label: "Inalatório", unit: null, packages: ["1 frasco", "1 dispositivo inalatório"] },
  injetavel: { label: "Injetável", unit: null, packages: ["1 ampola", "1 caixa", "1 caneta", "4 canetas"] },
  adesivo: { label: "Adesivo", unit: ["adesivo", "adesivos"], packages: ["1 caixa"] },
  supositorio: { label: "Supositório", unit: ["supositório", "supositórios"], packages: ["1 caixa"] },
  ovulo: { label: "Óvulo vaginal", unit: ["óvulo", "óvulos"], packages: ["1 caixa"] },
};

/**
 * Apresentação da CMED → forma. A ordem importa: "PO SOL INJ" é injetável,
 * não pó; "SOL OFT" é colírio, não solução oral; "SOL OR CT FR GOT" é gotas.
 */
const PRESENTATION_RULES: readonly [RegExp, DosageForm][] = [
  [/\b(INJ|INJETAVEL|SER PREENC|CAN APLIC|CARP|LIOF|LIOFILIZADO)\b/, "injetavel"],
  [/\b(OFT|COL)\b/, "colirio"],
  [/\b(SUP)\b/, "supositorio"],
  [/\b(OVL|OVU|VAG)\b/, "ovulo"],
  [/\b(ADES|TRANSD)\b/, "adesivo"],
  [/\b(NAS)\b/, "nasal"],
  [/\b(INAL|AER|SPR OR)\b/, "inalatorio"],
  // Sólidos antes de tópico: "CAP GEL DURA" é cápsula gelatinosa, não gel.
  [/\b(DRG)\b/, "dragea"],
  [/\b(CAP)\b/, "capsula"],
  [/\b(COM|COMP|CPR)\b/, "comprimido"],
  [/\b(CREM|CREME|POM|GEL|GELEIA|LOC|LOCAO|DERM|XAMP|SHAMP|SHAMPOO|SAB|TINT|ESM|ESMALTE|UNG|TOP)\b/, "topico"],
  [/\b(GOT)\b/, "gotas"],
  [/\b(SOL|SUS|SUSP|LIQ|XPE|EMU|ELX|XAR)\b/, "liquido"],
  [/\b(GRAN|ENV|SACH|EFEV)\b/, "sache"],
];

export function formFromPresentation(presentation: string | null | undefined): DosageForm | null {
  const text = ` ${(presentation ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, " ")} `;
  for (const [pattern, form] of PRESENTATION_RULES) if (pattern.test(text)) return form;
  return null;
}

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Do que o médico escreveu ("30 cápsulas", "Instilar 1 gota", "pomada"). */
const TEXT_RULES: readonly [RegExp, DosageForm][] = [
  [/\b(ampolas?|canetas?|injet|intramuscular|subcutane|endovenos|\bim\b|\bsc\b)/, "injetavel"],
  [/\b(colirio|instilar .* olho|olhos?\b)/, "colirio"],
  [/\b(supositorios?)\b/, "supositorio"],
  [/\b(ovulos?)\b/, "ovulo"],
  [/\b(adesivos?)\b/, "adesivo"],
  [/\b(narinas?|nasal)\b/, "nasal"],
  [/\b(inalar|bombinha|jatos?|puffs?|inalatori)/, "inalatorio"],
  [/\b(pomada|creme|gel|locao|xampu|bisnaga|aplicar .* (pele|regiao|local))\b/, "topico"],
  [/\b(drageas?)\b/, "dragea"],
  [/\b(capsulas?|caps?)\b/, "capsula"],
  [/\b(comprimidos?|cps?|cpr)\b/, "comprimido"],
  [/\b(sache|saches|envelopes?|granulado)\b/, "sache"],
  [/\b(gotas?)\b/, "gotas"],
  [/\b(ml|xarope|suspensao|solucao oral|frasco)\b/, "liquido"],
];

export function formFromText(text: string | null | undefined): DosageForm | null {
  const t = plain(text ?? "");
  if (!t.trim()) return null;
  for (const [pattern, form] of TEXT_RULES) if (pattern.test(t)) return form;
  return null;
}

/** A forma do item: a que veio do catálogo; senão, a que o texto do médico indica. */
export function formOfItem(item: { form?: DosageForm | null; name: string; quantity: string; posology: string }): DosageForm | null {
  return item.form ?? formFromText(item.quantity) ?? formFromText(item.posology) ?? formFromText(item.name);
}

const SOLID_UNIT = /\b(comprimidos?|c[aá]psulas?|dr[aá]geas?|sach[eê]s?)\b/gi;

/**
 * Uma frase escrita para comprimido, na forma do item: "Tomar 1 comprimido de
 * 8 em 8 horas" vira "Tomar 1 cápsula de 8 em 8 horas" (o plural acompanha).
 * Frases de outras formas, e itens sem unidade sólida, ficam como estão.
 */
export function adaptPhrase(phrase: string, form: DosageForm | null): string {
  const unit = form ? FORM_INFO[form].unit : null;
  if (!unit || !["comprimido", "capsula", "dragea", "sache"].includes(form!)) return phrase;
  return phrase.replace(SOLID_UNIT, (word) => {
    const plural = /s$/i.test(word);
    const next = plural ? unit[1] : unit[0];
    return word[0] === word[0].toUpperCase() ? next[0].toUpperCase() + next.slice(1) : next;
  });
}

/* ---------- Quantidade ---------- */

const NUMBER_WORDS: Record<string, number> = {
  meio: 0.5, meia: 0.5, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6,
};

function number(word: string): number | null {
  const w = plain(word);
  if (w in NUMBER_WORDS) return NUMBER_WORDS[w];
  const n = Number(w.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Quantas unidades o tratamento usa, lendo a posologia: "1 comprimido de 8 em
 * 8 horas por 7 dias" → 21. Só quando a frase diz tudo (dose, frequência e
 * duração); "se dor" ou uso contínuo sem prazo → null (quem decide é o médico).
 */
export function unitsForCourse(posology: string): number | null {
  const t = plain(posology);
  if (/\bse (dor|febre|necessario|nausea|falta|precisar)\b|\bs\/n\b|\bsos\b/.test(t)) return null;

  const dose = t.match(/\b(\d+(?:[.,]\d+)?|meio|meia|uma?|dois|duas|tres|quatro)\s+(comprimidos?|capsulas?|drageas?|saches?|adesivos?|supositorios?|ovulos?)\b/);
  if (!dose) return null;
  const perDose = number(dose[1]);

  let perDay: number | null = null;
  const every = t.match(/\bde (\d+) em \1 ?(?:horas|h)\b/) ?? t.match(/\b(\d+)\s*\/\s*\1\s*h\b/);
  if (every) perDay = 24 / Number(every[1]);
  const times = t.match(/\b(\d+|uma|duas|tres|quatro)\s*(?:vezes|x)\s*(?:ao|por)\s*dia\b/);
  if (!perDay && times) perDay = number(times[1]);
  if (!perDay && /\b(ao dia|por dia|diariamente|1 vez ao dia)\b/.test(t)) perDay = 1;
  if (!perDay && /\b(dose unica)\b/.test(t)) return perDose;

  const days = t.match(/\bpor (\d+) dias?\b/);
  const weeks = t.match(/\bpor (\d+) semanas?\b/);
  const months = t.match(/\bpor (\d+) m[eê]s(?:es)?\b/);
  const duration = days ? Number(days[1]) : weeks ? Number(weeks[1]) * 7 : months ? Number(months[1]) * 30 : null;

  if (!perDose || !perDay || !duration) return null;
  return Math.ceil(perDose * perDay * duration);
}

/** "21" + cápsula → "21 cápsulas". */
export function unitCount(n: number, form: DosageForm | null): string | null {
  const unit = form ? FORM_INFO[form].unit : null;
  if (!unit) return null;
  return `${n} ${n === 1 ? unit[0] : unit[1]}`;
}

/**
 * Sugestões para o campo Quantidade: o total do tratamento ("21 cápsulas"),
 * o número que o médico começou a digitar já com a unidade ("30" → "30
 * comprimidos") e as embalagens daquela forma ("1 caixa", "1 frasco").
 */
export function quantitySuggestions(
  item: { form?: DosageForm | null; name: string; quantity: string; posology: string; continuous?: boolean },
): string[] {
  const form = formOfItem(item);
  const out: string[] = [];
  const typed = item.quantity.trim();
  if (/^\d+$/.test(typed)) {
    const withUnit = unitCount(Number(typed), form);
    if (withUnit) out.push(withUnit);
  }
  const course = unitsForCourse(item.posology);
  if (course) {
    const total = unitCount(course, form);
    if (total) out.push(total);
  } else if (item.continuous) {
    const perDay = unitsForCourse(`${item.posology} por 30 dias`);
    for (const months of [1, 3]) {
      const total = perDay ? unitCount(perDay * months, form) : null;
      if (total) out.push(`${total} (${months === 1 ? "1 mês" : `${months} meses`})`);
    }
  }
  out.push(...(form ? FORM_INFO[form].packages : ["1 caixa", "1 frasco"]));
  const seen = new Set<string>();
  return out.filter((s) => s !== typed && !seen.has(s) && seen.add(s)).slice(0, 5);
}
