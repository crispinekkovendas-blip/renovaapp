import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ICS_TZID,
  buildIcs,
  escapeIcsText,
  foldIcsLine,
  icsLocalDateTime,
  icsUtcStamp,
  unfoldIcs,
} from "./ics.ts";

const STAMP = new Date("2026-09-07T12:34:56.789Z");

const base = {
  uid: "renova-appt-42@renovaapp.vercel.app",
  start: "2026-09-10 14:30",
  end: "2026-09-10 15:00",
  summary: "Consulta com Dra. Ana Souza",
  stamp: STAMP,
};

// ---------- escaping ----------

test("escapes backslash, semicolon, comma and line breaks in that order", () => {
  assert.equal(escapeIcsText("a\\b"), "a\\\\b");
  assert.equal(escapeIcsText("Rua A; sala 2, fundos"), "Rua A\\; sala 2\\, fundos");
  assert.equal(escapeIcsText("linha 1\nlinha 2\r\nlinha 3\rfim"), "linha 1\\nlinha 2\\nlinha 3\\nfim");
});

test("summary, description and location are escaped; URL is not", () => {
  const ics = unfoldIcs(
    buildIcs({
      ...base,
      summary: "Consulta; retorno, sala 3",
      description: "Chegue 10 min antes.\nTraga exames.",
      location: "Av. Brasil, 100 - Centro",
      url: "https://renovaapp.vercel.app/p/abc?x=1,2;3",
    })
  );
  assert.match(ics, /^SUMMARY:Consulta\\; retorno\\, sala 3$/m);
  assert.match(ics, /^DESCRIPTION:Chegue 10 min antes\.\\nTraga exames\.$/m);
  assert.match(ics, /^LOCATION:Av\. Brasil\\, 100 - Centro$/m);
  assert.match(ics, /^URL:https:\/\/renovaapp\.vercel\.app\/p\/abc\?x=1,2;3$/m);
});

// ---------- dates ----------

test("local date-times are rendered with TZID=America/Sao_Paulo", () => {
  assert.equal(icsLocalDateTime("2026-09-10 14:30"), "20260910T143000");
  assert.equal(icsLocalDateTime("2026-09-10T08:05:09"), "20260910T080509");
  assert.throws(() => icsLocalDateTime("10/09/2026 14:30"));
  const ics = unfoldIcs(buildIcs(base));
  assert.match(ics, new RegExp(`^DTSTART;TZID=${ICS_TZID}:20260910T143000$`, "m"));
  assert.match(ics, new RegExp(`^DTEND;TZID=${ICS_TZID}:20260910T150000$`, "m"));
});

test("DTSTAMP is in UTC with the Z suffix", () => {
  assert.equal(icsUtcStamp(STAMP), "20260907T123456Z");
  assert.match(unfoldIcs(buildIcs(base)), /^DTSTAMP:20260907T123456Z$/m);
});

test("includes a minimal VTIMEZONE at -0300 without DST", () => {
  const ics = unfoldIcs(buildIcs(base));
  const tz = ics.slice(ics.indexOf("BEGIN:VTIMEZONE"), ics.indexOf("END:VTIMEZONE"));
  assert.match(tz, /^TZID:America\/Sao_Paulo$/m);
  assert.match(tz, /^TZOFFSETFROM:-0300$/m);
  assert.match(tz, /^TZOFFSETTO:-0300$/m);
  assert.doesNotMatch(tz, /DAYLIGHT/);
});

// ---------- line endings and folding ----------

test("every line ends with CRLF and there are no bare LFs", () => {
  const ics = buildIcs(base);
  assert.ok(ics.endsWith("\r\n"));
  assert.equal(ics.replace(/\r\n/g, "").includes("\n"), false);
  assert.equal(ics.split("\r\n")[0], "BEGIN:VCALENDAR");
});

test("folds lines at 75 octets with a leading space and never splits a multibyte character", () => {
  const description = "Consulta de acompanhamento — ".repeat(6) + "ação coração ç ã é ú";
  const ics = buildIcs({ ...base, description });
  const encoder = new TextEncoder();
  for (const line of ics.split("\r\n")) {
    assert.ok(encoder.encode(line).length <= 75, `line over 75 octets: ${JSON.stringify(line)}`);
  }
  // Every folded piece is valid UTF-8 (no replacement characters) and unfolding gives the original back.
  const decoder = new TextDecoder("utf-8", { fatal: true });
  for (const line of ics.split("\r\n")) decoder.decode(encoder.encode(line));
  assert.match(unfoldIcs(ics), new RegExp(`^DESCRIPTION:${description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
});

test("foldIcsLine leaves short lines alone and counts the continuation space", () => {
  assert.equal(foldIcsLine("SUMMARY:curta"), "SUMMARY:curta");
  const folded = foldIcsLine("X".repeat(150));
  const parts = folded.split("\r\n");
  assert.equal(parts[0].length, 75);
  assert.ok(parts[1].startsWith(" "));
  assert.equal(parts[1].length, 75);
  assert.equal(parts[2], " X");
  assert.equal(unfoldIcs(folded), "X".repeat(150));
});

// ---------- optional fields ----------

test("omits DESCRIPTION, LOCATION and URL when absent, keeps the véspera alarm", () => {
  const ics = unfoldIcs(buildIcs(base));
  // O VALARM tem a própria DESCRIPTION; o que importa é o VEVENT antes dele.
  const event = ics.slice(ics.indexOf("BEGIN:VEVENT"), ics.indexOf("BEGIN:VALARM"));
  assert.doesNotMatch(event, /^DESCRIPTION:/m);
  assert.doesNotMatch(event, /^LOCATION:/m);
  assert.doesNotMatch(event, /^URL:/m);
  assert.match(ics, /^UID:renova-appt-42@renovaapp\.vercel\.app$/m);
  assert.match(ics, /^TRIGGER:-P1D$/m);
  assert.match(ics, /^METHOD:PUBLISH$/m);
});
