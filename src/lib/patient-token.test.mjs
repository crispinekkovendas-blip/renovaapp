import { test } from "node:test";
import assert from "node:assert/strict";
import { signPatientToken, verifyPatientToken } from "./patient-token.ts";
import { signConfirmToken, verifyConfirmToken } from "./confirm-token.ts";

const SECRET = "segredo-de-teste";
const TODAY = "2026-09-06";

test("round trip: a signed token verifies to the same patient id", () => {
  const token = signPatientToken(42, "2026-10-06", SECRET);
  assert.deepEqual(verifyPatientToken(token, SECRET, TODAY), { patientId: 42 });
});

test("token is URL-path safe (base64url plus one dot)", () => {
  const token = signPatientToken(123456, "2026-12-31", SECRET);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
});

test("still valid on the expiry day itself", () => {
  const token = signPatientToken(7, TODAY, SECRET);
  assert.deepEqual(verifyPatientToken(token, SECRET, TODAY), { patientId: 7 });
});

test("expired token is rejected", () => {
  const token = signPatientToken(7, "2026-09-05", SECRET);
  assert.equal(verifyPatientToken(token, SECRET, TODAY), null);
});

test("tampered payload is rejected", () => {
  const token = signPatientToken(42, "2026-10-06", SECRET);
  const [, signature] = token.split(".");
  const forgedPayload = Buffer.from("pac.43.2026-10-06", "utf8").toString("base64url");
  assert.equal(verifyPatientToken(`${forgedPayload}.${signature}`, SECRET, TODAY), null);
});

test("payload with a pushed-out expiry is rejected", () => {
  const token = signPatientToken(42, "2026-09-05", SECRET);
  const [, signature] = token.split(".");
  const forgedPayload = Buffer.from("pac.42.2099-01-01", "utf8").toString("base64url");
  assert.equal(verifyPatientToken(`${forgedPayload}.${signature}`, SECRET, TODAY), null);
});

test("tampered signature is rejected", () => {
  const token = signPatientToken(42, "2026-10-06", SECRET);
  const [payload, signature] = token.split(".");
  const flipped = (signature[0] === "A" ? "B" : "A") + signature.slice(1);
  assert.equal(verifyPatientToken(`${payload}.${flipped}`, SECRET, TODAY), null);
  assert.equal(verifyPatientToken(`${payload}.${signature.slice(0, -1)}`, SECRET, TODAY), null);
});

test("wrong secret is rejected", () => {
  const token = signPatientToken(42, "2026-10-06", SECRET);
  assert.equal(verifyPatientToken(token, "outro-segredo", TODAY), null);
});

test("garbage is rejected", () => {
  assert.equal(verifyPatientToken("", SECRET, TODAY), null);
  assert.equal(verifyPatientToken("abc", SECRET, TODAY), null);
  assert.equal(verifyPatientToken("a.b.c", SECRET, TODAY), null);
  assert.equal(verifyPatientToken(".", SECRET, TODAY), null);
  assert.equal(verifyPatientToken("invalido", SECRET, TODAY), null);
  assert.equal(verifyPatientToken("../../etc/passwd", SECRET, TODAY), null);
});

test("a correctly signed but malformed payload is rejected", () => {
  // Signed by us, but the payload is not "pac.<id>.<date>".
  const payload = Buffer.from("not-an-id", "utf8").toString("base64url");
  const forged = signPatientToken(1, "2026-10-06", SECRET).split(".")[1];
  assert.equal(verifyPatientToken(`${payload}.${forged}`, SECRET, TODAY), null);
  const zero = signPatientToken(0, "2026-10-06", SECRET);
  assert.equal(verifyPatientToken(zero, SECRET, TODAY), null);
});

test("a confirm token (same secret, same id) is rejected as a patient token", () => {
  const confirm = signConfirmToken(42, "2026-10-06", SECRET);
  assert.deepEqual(verifyConfirmToken(confirm, SECRET, TODAY), { appointmentId: 42 });
  assert.equal(verifyPatientToken(confirm, SECRET, TODAY), null);
});

test("a patient token is rejected as a confirm token", () => {
  const portal = signPatientToken(42, "2026-10-06", SECRET);
  assert.deepEqual(verifyPatientToken(portal, SECRET, TODAY), { patientId: 42 });
  assert.equal(verifyConfirmToken(portal, SECRET, TODAY), null);
});

test("the two token kinds never collide for the same id and expiry", () => {
  assert.notEqual(signPatientToken(42, "2026-10-06", SECRET), signConfirmToken(42, "2026-10-06", SECRET));
});
