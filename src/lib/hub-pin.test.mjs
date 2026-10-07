import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PIN_COOKIE_DAYS,
  PIN_COOKIE_PREFIX,
  expectedPin,
  normalizePinInput,
  pinCookieName,
  pinMatches,
  signPinCookie,
  verifyPinCookie,
} from "./hub-pin.ts";

test("expectedPin is the last four digits of the phone, in any format", () => {
  assert.equal(expectedPin("(11) 98811-2233"), "2233");
  assert.equal(expectedPin("+55 11 9 8811 2233"), "2233");
  assert.equal(expectedPin("11988112233"), "2233");
});

test("expectedPin is null without a usable phone", () => {
  assert.equal(expectedPin(null), null);
  assert.equal(expectedPin(""), null);
  assert.equal(expectedPin("123"), null);
  assert.equal(expectedPin("sem telefone"), null);
});

test("normalizePinInput keeps only exactly four digits", () => {
  assert.equal(normalizePinInput("2233"), "2233");
  assert.equal(normalizePinInput(" 22 33 "), "2233");
  assert.equal(normalizePinInput("22333"), null);
  assert.equal(normalizePinInput("223"), null);
  assert.equal(normalizePinInput(2233), null);
  assert.equal(normalizePinInput(null), null);
});

test("pinMatches compares the typed digits with the phone", () => {
  assert.equal(pinMatches("2233", "(11) 98811-2233"), true);
  assert.equal(pinMatches("2234", "(11) 98811-2233"), false);
  assert.equal(pinMatches("2233", null), false);
  assert.equal(pinMatches("", "(11) 98811-2233"), false);
});

test("cookie name and lifetime", () => {
  assert.equal(pinCookieName(42), `${PIN_COOKIE_PREFIX}42`);
  assert.equal(pinCookieName(42), "renova_pin_42");
  assert.equal(PIN_COOKIE_DAYS, 30);
});

test("a signed cookie verifies for its patient until the expiry day, inclusive", () => {
  const cookie = signPinCookie(7, "2026-10-09", "segredo");
  assert.match(cookie, /^2026-10-09\.[A-Za-z0-9_-]+$/);
  assert.equal(verifyPinCookie(cookie, 7, "segredo", "2026-09-09"), true);
  assert.equal(verifyPinCookie(cookie, 7, "segredo", "2026-10-09"), true);
  assert.equal(verifyPinCookie(cookie, 7, "segredo", "2026-10-10"), false);
});

test("a cookie is bound to the patient id and to the secret", () => {
  const cookie = signPinCookie(7, "2026-10-09", "segredo");
  assert.equal(verifyPinCookie(cookie, 8, "segredo", "2026-09-09"), false);
  assert.equal(verifyPinCookie(cookie, 7, "outro", "2026-09-09"), false);
});

test("tampering with the expiry or the signature invalidates the cookie", () => {
  const cookie = signPinCookie(7, "2026-10-09", "segredo");
  const [, signature] = cookie.split(".");
  assert.equal(verifyPinCookie(`2027-10-09.${signature}`, 7, "segredo", "2026-09-09"), false);
  assert.equal(verifyPinCookie(`2026-10-09.${signature}x`, 7, "segredo", "2026-09-09"), false);
  assert.equal(verifyPinCookie("2026-10-09.", 7, "segredo", "2026-09-09"), false);
  assert.equal(verifyPinCookie("lixo", 7, "segredo", "2026-09-09"), false);
  assert.equal(verifyPinCookie(undefined, 7, "segredo", "2026-09-09"), false);
  assert.equal(verifyPinCookie(null, 7, "segredo", "2026-09-09"), false);
});
