import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifySignature, sign } from "../src/hmac.js";

const secret = crypto.randomBytes(32).toString("hex");
const body = Buffer.from('{"type":"agent-games.preflight.v1","nonce":"abc123"}');
const digest = crypto.createHmac("sha256", secret).update(body).digest();

test("accepts each supported signature form and reports it", () => {
  assert.equal(verifySignature(secret, body, digest.toString("hex")), "hex");
  assert.equal(verifySignature(secret, body, digest.toString("hex").toUpperCase()), "hex");
  assert.equal(verifySignature(secret, body, `sha256=${digest.toString("hex")}`), "sha256=hex");
  assert.equal(verifySignature(secret, body, digest.toString("base64")), "base64");
});

test("rejects wrong, missing, or tampered signatures", () => {
  assert.equal(verifySignature(secret, body, "deadbeef"), null);
  assert.equal(verifySignature(secret, body, undefined), null);
  assert.equal(verifySignature(secret, Buffer.from(body.toString() + " "), digest.toString("hex")), null);
  assert.equal(verifySignature("", body, digest.toString("hex")), null);
});

test("signs responses in the scheme the request used", () => {
  assert.equal(sign(secret, body, "sha256=hex"), `sha256=${digest.toString("hex")}`);
  assert.equal(sign(secret, body), digest.toString("hex"));
});
