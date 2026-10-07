import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildClinicJsonLd,
  buildFaqJsonLd,
  firstNameOf,
  formatHour,
  initialsOf,
  jsonLdScript,
  mapsEmbedUrl,
  mapsSearchUrl,
  monthYearPT,
  normalizeInsurances,
  parseInsurances,
  summarizeHours,
  telHref,
} from "./clinic-public.ts";

const row = (weekday, start_time, end_time) => ({ weekday, start_time, end_time });

test("formatHour: full hours drop the minutes, half hours keep them", () => {
  assert.equal(formatHour("08:00"), "8h");
  assert.equal(formatHour("08:30"), "8h30");
  assert.equal(formatHour("13:00"), "13h");
  assert.equal(formatHour("00:15"), "0h15");
  assert.equal(formatHour("nope"), "nope");
});

test("summarizeHours: empty input gives no runs", () => {
  assert.deepEqual(summarizeHours([]), []);
});

test("summarizeHours: a single day", () => {
  const runs = summarizeHours([row(3, "09:00", "17:00")]);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].text, "Qua · 9h às 17h");
  assert.deepEqual(runs[0].weekdays, [3]);
});

test("summarizeHours: consecutive weekdays with the same hours collapse into one run", () => {
  const runs = summarizeHours([1, 2, 3, 4, 5].map((d) => row(d, "08:00", "18:00")));
  assert.equal(runs.length, 1);
  assert.equal(runs[0].text, "Seg a Sex · 8h às 18h");
  assert.equal(runs[0].days, "Seg a Sex");
  assert.equal(runs[0].hours, "8h às 18h");
  assert.deepEqual(runs[0].weekdays, [1, 2, 3, 4, 5]);
});

test("summarizeHours: two runs — weekdays and Saturday", () => {
  const runs = summarizeHours([
    ...[1, 2, 3, 4, 5].map((d) => row(d, "08:00", "18:00")),
    row(6, "08:00", "12:00"),
  ]);
  assert.deepEqual(
    runs.map((r) => r.text),
    ["Seg a Sex · 8h às 18h", "Sáb · 8h às 12h"]
  );
});

test("summarizeHours: differing hours split the run even on consecutive days", () => {
  const runs = summarizeHours([
    row(1, "08:00", "18:00"),
    row(2, "08:00", "18:00"),
    row(3, "08:00", "18:00"),
    row(4, "09:00", "17:00"),
    row(5, "09:00", "17:00"),
  ]);
  assert.deepEqual(
    runs.map((r) => r.text),
    ["Seg a Qua · 8h às 18h", "Qui e Sex · 9h às 17h"]
  );
});

test("summarizeHours: half hours are formatted as 8h30", () => {
  const runs = summarizeHours([row(1, "08:30", "17:30")]);
  assert.equal(runs[0].text, "Seg · 8h30 às 17h30");
});

test("summarizeHours: several professionals on the same day merge to min start / max end", () => {
  const runs = summarizeHours([
    row(1, "13:00", "18:00"),
    row(1, "08:00", "12:00"),
    row(1, "09:00", "20:00"),
  ]);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].start, "08:00");
  assert.equal(runs[0].end, "20:00");
  assert.equal(runs[0].text, "Seg · 8h às 20h");
});

test("summarizeHours: Sunday is read last and a gap breaks the run", () => {
  const runs = summarizeHours([row(0, "08:00", "12:00"), row(1, "08:00", "12:00"), row(3, "08:00", "12:00")]);
  assert.deepEqual(
    runs.map((r) => r.days),
    ["Seg", "Qua", "Dom"]
  );
});

test("summarizeHours: ignores rows out of range, malformed or inverted; order of input is irrelevant", () => {
  const runs = summarizeHours([
    row(5, "08:00", "18:00"),
    row(7, "08:00", "18:00"),
    row(2, "8:00", "18:00"),
    row(3, "18:00", "08:00"),
    row(1, "08:00", "18:00"),
  ]);
  assert.deepEqual(
    runs.map((r) => r.text),
    ["Seg · 8h às 18h", "Sex · 8h às 18h"]
  );
});

test("parseInsurances: splits on comma, semicolon and newline, trims and dedupes", () => {
  assert.deepEqual(parseInsurances(" Unimed , Bradesco  Saúde;Amil\nunimed,,"), [
    "Unimed",
    "Bradesco Saúde",
    "Amil",
  ]);
  assert.deepEqual(parseInsurances(""), []);
  assert.deepEqual(parseInsurances(null), []);
  assert.deepEqual(parseInsurances(undefined), []);
});

test("normalizeInsurances: the stored value is the clean comma-separated list", () => {
  assert.equal(normalizeInsurances(" Unimed ; Amil ,"), "Unimed, Amil");
  assert.equal(normalizeInsurances("   "), "");
});

test("maps urls encode the address", () => {
  assert.equal(
    mapsSearchUrl("Rua das Flores, 10 - Centro "),
    "https://www.google.com/maps/search/?api=1&query=Rua%20das%20Flores%2C%2010%20-%20Centro"
  );
  assert.equal(
    mapsEmbedUrl("Av. Paulista, 1000"),
    "https://www.google.com/maps?q=Av.%20Paulista%2C%201000&output=embed"
  );
});

test("firstNameOf: keeps the honorific, drops the rest", () => {
  assert.equal(firstNameOf("Dra. Ana Paula Souza"), "Dra. Ana");
  assert.equal(firstNameOf("dr Carlos Lima"), "Dr. Carlos");
  assert.equal(firstNameOf("Maria Clara Souza"), "Maria");
  assert.equal(firstNameOf("  Maria  "), "Maria");
  assert.equal(firstNameOf("Dra."), "Dra.");
});

test("initialsOf: first and last name, honorific ignored", () => {
  assert.equal(initialsOf("Dra. Ana Paula Souza"), "AS");
  assert.equal(initialsOf("Maria"), "M");
  assert.equal(initialsOf("josé álvares"), "JÁ");
  assert.equal(initialsOf("   "), "");
});

test("monthYearPT: month and year in Portuguese", () => {
  assert.equal(monthYearPT("2026-09-07 10:00:00"), "setembro de 2026");
  assert.equal(monthYearPT("2026-01-31"), "janeiro de 2026");
  assert.equal(monthYearPT("garbage"), "");
});

test("buildClinicJsonLd: only includes what exists", () => {
  const minimal = buildClinicJsonLd({ name: "Clínica Renova", url: "https://renova.example" });
  assert.deepEqual(minimal, {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: "Clínica Renova",
    url: "https://renova.example",
  });
  assert.equal("telephone" in minimal, false);
  assert.equal("address" in minimal, false);
  assert.equal("openingHoursSpecification" in minimal, false);

  const blank = buildClinicJsonLd({ name: "X", url: "u", phone: "  ", address: "", hours: [] });
  assert.equal("telephone" in blank, false);
  assert.equal("address" in blank, false);
  assert.equal("openingHoursSpecification" in blank, false);
});

test("buildClinicJsonLd: full object with opening hours from the runs", () => {
  const hours = summarizeHours([
    ...[1, 2, 3, 4, 5].map((d) => row(d, "08:00", "18:00")),
    row(6, "08:00", "12:00"),
  ]);
  const full = buildClinicJsonLd({
    name: "Clínica Renova",
    url: "https://renova.example",
    phone: "(11) 99999-0000",
    address: "Rua das Flores, 10",
    hours,
  });
  assert.equal(full.telephone, "(11) 99999-0000");
  assert.deepEqual(full.address, {
    "@type": "PostalAddress",
    streetAddress: "Rua das Flores, 10",
    addressCountry: "BR",
  });
  assert.deepEqual(full.openingHoursSpecification, [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday"], opens: "08:00", closes: "12:00" },
  ]);
});

test("jsonLdScript: escapes < so a clinic name cannot close the script tag", () => {
  const out = jsonLdScript({ name: "</script><b>x" });
  assert.equal(out.includes("</script>"), false);
  assert.equal(out, '{"name":"\\u003c/script>\\u003cb>x"}');
  assert.deepEqual(JSON.parse(out), { name: "</script><b>x" });
});

test("buildClinicJsonLd: CNPJ and the booking action only when given", () => {
  const out = buildClinicJsonLd({
    name: "Clínica Renova",
    url: "https://renova.example/",
    taxId: " 12.345.678/0001-90 ",
    bookingUrl: "https://renova.example/agendar",
  });
  assert.equal(out.taxID, "12.345.678/0001-90");
  assert.deepEqual(out.potentialAction, {
    "@type": "ReserveAction",
    name: "Agendar consulta",
    target: { "@type": "EntryPoint", urlTemplate: "https://renova.example/agendar" },
  });

  const blank = buildClinicJsonLd({ name: "X", url: "u", taxId: "  ", bookingUrl: "" });
  assert.equal("taxID" in blank, false);
  assert.equal("potentialAction" in blank, false);
});

test("buildFaqJsonLd: questions with answers, blanks dropped, null when empty", () => {
  assert.equal(buildFaqJsonLd([]), null);
  assert.equal(buildFaqJsonLd([{ question: " ", answer: "x" }]), null);
  assert.deepEqual(
    buildFaqJsonLd([
      { question: " Preciso de senha? ", answer: " Não. " },
      { question: "Sem resposta", answer: "" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "Preciso de senha?", acceptedAnswer: { "@type": "Answer", text: "Não." } },
      ],
    }
  );
});

test("telHref: adds the country code once, null without digits", () => {
  assert.equal(telHref("(11) 3333-4444"), "tel:+551133334444");
  assert.equal(telHref("+55 11 99999-0000"), "tel:+5511999990000");
  assert.equal(telHref(""), null);
  assert.equal(telHref(null), null);
  assert.equal(telHref("sem telefone"), null);
});
