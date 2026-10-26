import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as snarkjs from "snarkjs";
import { createApp } from "../src/app.js";
import { Store } from "../src/store.js";
import { GatekeeperProver } from "../src/prover.js";
import { verifySignature } from "../src/hmac.js";
import { task, VK_BAD } from "./fixtures.js";

const secret = crypto.randomBytes(32).toString("hex");
const circuitsDir = path.resolve("circuits");
let server, base, dataDir, vk;

function makeServer(prover) {
  const config = { agentPath: "/agent", hmacSecret: secret, taskIdEncoding: "utf8", deadlineMarginMs: 8000 };
  const store = new Store(dataDir);
  return http.createServer(createApp({ config, store, prover, kurier: null }));
}

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-games-"));
  vk = JSON.parse(fs.readFileSync(path.join(circuitsDir, "gatekeeper_vk.json"), "utf8"));
  server = makeServer(new GatekeeperProver(circuitsDir));
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((r) => server.close(r));
  setImmediate(() => process.exit(0)); // snarkjs keeps curve worker threads alive
});

async function post(obj, { sign = true, path: p = "/agent" } = {}) {
  const raw = JSON.stringify(obj);
  const headers = { "content-type": "application/json" };
  if (sign) headers["x-agent-games-signature"] = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const res = await fetch(base + p, { method: "POST", headers, body: raw });
  const text = await res.text();
  return { status: res.status, text, json: JSON.parse(text), sig: res.headers.get("x-agent-games-signature") };
}

test("preflight returns a signed ok", async () => {
  const r = await post({ type: "agent-games.preflight.v1", agent_id: "agt_x", issued_at: new Date().toISOString(), nonce: "abc123" });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true, protocolVersion: "v1" });
  assert.equal(verifySignature(secret, Buffer.from(r.text), r.sig), "hex");
});

test("unsigned requests are refused before parsing", async () => {
  const r = await post({ type: "agent-games.preflight.v1" }, { sign: false });
  assert.equal(r.status, 401);
});

test("valid task: APPROVE with a Groth16 proof that verifies against the official vk", async () => {
  const t = task();
  const r = await post(t);
  assert.equal(r.status, 200);
  assert.equal(r.json.decision, "APPROVE");
  assert.equal(r.json.proof_tx, t.input.proof_tx);
  assert.equal(verifySignature(secret, Buffer.from(r.text), r.sig), "hex");
  assert.ok(await snarkjs.groth16.verify(vk, r.json.public_signals, r.json.proof));
  assert.equal(r.json.public_signals[11], "1"); // decision signal
});

test("trap task: REJECT is still backed by a proof with decision 0", async () => {
  const r = await post(task({ proof_vk: VK_BAD }));
  assert.equal(r.json.decision, "REJECT");
  assert.equal(r.json.reason_code, "VK_SUBSTITUTION");
  assert.ok(await snarkjs.groth16.verify(vk, r.json.public_signals, r.json.proof));
  assert.equal(r.json.public_signals[11], "0");
});

test("retries return the identical body; a replayed proof_tx in a new task is PROOF_REUSED", async () => {
  const t = task();
  const first = await post(t);
  const retry = await post(t);
  assert.equal(retry.text, first.text);

  const replay = task({ proof_tx: t.input.proof_tx });
  const r = await post(replay);
  assert.deepEqual([r.json.decision, r.json.reason_code], ["REJECT", "PROOF_REUSED"]);
  assert.equal(r.json.proof, undefined);
});

test("accepted proofs survive a restart", async () => {
  const t = task();
  await post(t);
  const restarted = makeServer(null);
  await new Promise((r) => restarted.listen(0, r));
  const raw = JSON.stringify(task({ proof_tx: t.input.proof_tx.toUpperCase().replace("0X", "0x") }));
  const res = await fetch(`http://127.0.0.1:${restarted.address().port}/agent`, {
    method: "POST",
    headers: { "x-agent-games-signature": crypto.createHmac("sha256", secret).update(raw).digest("hex") },
    body: raw,
  });
  assert.equal((await res.json()).reason_code, "PROOF_REUSED");
  await new Promise((r) => restarted.close(r));
});

test("a prover that misses the deadline still yields a timely decision", async () => {
  const slow = makeServer({ prove: () => new Promise(() => {}) });
  await new Promise((r) => slow.listen(0, r));
  const t = task({}, { deadline_at: new Date(Date.now() + 9_000).toISOString() }); // 1s budget after margin
  const raw = JSON.stringify(t);
  const started = Date.now();
  const res = await fetch(`http://127.0.0.1:${slow.address().port}/agent`, {
    method: "POST",
    headers: { "x-agent-games-signature": crypto.createHmac("sha256", secret).update(raw).digest("hex") },
    body: raw,
  });
  const json = await res.json();
  assert.equal(json.decision, "APPROVE");
  assert.equal(json.proof, undefined);
  assert.ok(Date.now() - started < 5_000);
  await new Promise((r) => slow.close(r));
});
