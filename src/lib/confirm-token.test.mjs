import { test } from "node:test";
import assert from "node:assert/strict";
import { signConfirmToken, verifyConfirmToken } from "./confirm-token.ts";

const SECRET = "segredo-de-teste";
const TODAY = "2026-09-06";

test("round trip: a signed token verifies to the same appointment id", () => {
  const token = signConfirmToken(42, "2026-09-10", SECRET);
  assert.deepEqual(verifyConfirmToken(token, SECRET, TODAY), { appointmentId: 42 });
});

test("token is URL-path safe (base64url plus one dot)", () => {
  const token = signConfirmToken(123456, "2026-12-31", SECRET);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test("still valid on the expiry day itself", () => {
  const token = signConfirmToken(7, TODAY, SECRET);
  assert.deepEqual(verifyConfirmToken(token, SECRET, TODAY), { appointmentId: 7 });
});

test("expired token is rejected", () => {
  const token = signConfirmToken(7, "2026-09-05", SECRET);
  assert.equal(verifyConfirmToken(token, SECRET, TODAY), null);
});

test("tampered payload is rejected", () => {
  const token = signConfirmToken(42, "2026-09-10", SECRET);
  const [, signature] = token.split(".");
  const forgedPayload = Buffer.from("43.2026-09-10", "utf8").toString("base64url");
  assert.equal(verifyConfirmToken(`${forgedPayload}.${signature}`, SECRET, TODAY), null);
});

test("payload with a pushed-out expiry is rejected", () => {
  const token = signConfirmToken(42, "2026-09-05", SECRET);
  const [, signature] = token.split(".");
  const forgedPayload = Buffer.from("42.2099-01-01", "utf8").toString("base64url");
  assert.equal(verifyConfirmToken(`${forgedPayload}.${signature}`, SECRET, TODAY), null);
});

test("tampered signature is rejected", () => {
  const token = signConfirmToken(42, "2026-09-10", SECRET);
  const [payload, signature] = token.split(".");
  const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
  assert.equal(verifyConfirmToken(`${payload}.${flipped}`, SECRET, TODAY), null);
  assert.equal(verifyConfirmToken(`${payload}.${signature.slice(0, -1)}`, SECRET, TODAY), null);
});

test("wrong secret is rejected", () => {
  const token = signConfirmToken(42, "2026-09-10", SECRET);
  assert.equal(verifyConfirmToken(token, "outro-segredo", TODAY), null);
});

test("garbage is rejected", () => {
  assert.equal(verifyConfirmToken("", SECRET, TODAY), null);
  assert.equal(verifyConfirmToken("abc", SECRET, TODAY), null);
  assert.equal(verifyConfirmToken("a.b.c", SECRET, TODAY), null);
  assert.equal(verifyConfirmToken(".", SECRET, TODAY), null);
  assert.equal(verifyConfirmToken("invalido", SECRET, TODAY), null);
  assert.equal(verifyConfirmToken("../../etc/passwd", SECRET, TODAY), null);
});

test("a correctly signed but malformed payload is rejected", () => {
  // Signed by us, but the payload is not "<id>.<date>".
  const payload = Buffer.from("not-an-id", "utf8").toString("base64url");
  const forged = signConfirmToken(1, "2026-09-10", SECRET).split(".")[1];
  assert.equal(verifyConfirmToken(`${payload}.${forged}`, SECRET, TODAY), null);
  const zero = signConfirmToken(0, "2026-09-10", SECRET);
  assert.equal(verifyConfirmToken(zero, SECRET, TODAY), null);
});
