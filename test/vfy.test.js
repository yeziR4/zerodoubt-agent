import test, { after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import http from "node:http";
import crypto from "node:crypto";
import * as snarkjs from "snarkjs";
import sha3 from "js-sha3";
import { policyAction, validateParams } from "../src/vfy/policy.js";
import { resolveTurn, playMatch } from "../src/vfy/resolver.js";
import { StealTheVfy, publicInputsHash, idempotencyKey } from "../src/vfy/agent.js";
import { createApp } from "../src/app.js";
import { Store } from "../src/store.js";

after(() => setImmediate(() => process.exit(0))); // snarkjs worker threads

const P = [10, 0, 0, 0, 0, 0, 0, 0];

test("policy mirrors the circuit's rule order", () => {
  const p = [7, 60, 40, 0, 0, 0, 0, 0];
  assert.deepEqual(policyAction(p, 59, 100), { type: "FORTIFY" });
  assert.deepEqual(policyAction(p, 60, 40), { type: "HOLD" });
  assert.deepEqual(policyAction(p, 60, 41), { type: "EXTRACT", amount: 7 });
  assert.deepEqual(policyAction([7, 0, 0, 1, 0, 0, 0, 0], 100, 100), { type: "HOLD" });
  assert.deepEqual(policyAction(P, 200, 0), { type: "HOLD" });
});

test("invalid params are refused before commitment", () => {
  assert.throws(() => validateParams([11, 0, 0, 0, 0, 0, 0, 0]));
  assert.throws(() => validateParams([5, 0, 0, 2, 0, 0, 0, 0]));
  assert.throws(() => validateParams([5, 0, 0, 0, 1, 0, 0, 0]));
  assert.doesNotThrow(() => validateParams(P));
});

test("resolver: fortify blocks 6 and costs 2; simultaneous extraction", () => {
  const s = { a: { balance: 100 }, b: { balance: 100 } };
  const r1 = resolveTurn(s, { type: "EXTRACT", amount: 10 }, { type: "FORTIFY" }, 1, "same");
  assert.deepEqual([r1.a.balance, r1.b.balance], [104, 94]);
  const r2 = resolveTurn(s, { type: "EXTRACT", amount: 10 }, { type: "EXTRACT", amount: 4 }, 1);
  assert.deepEqual([r2.a.balance, r2.b.balance], [106, 94]);
  assert.equal(playMatch(() => ({ type: "EXTRACT", amount: 10 }), () => ({ type: "HOLD" })).a, 200);
});

test("publicInputsHash follows the guide's field order and widths", () => {
  const args = { commitment: 5n, matchId: "9f4e1b2a-0000-0000-0000-000000000001", turn: 3, selfBalance: "95", opponentBalance: "105", action: { type: "EXTRACT", amount: 5 } };
  const fields = [5n, BigInt("0x9f4e1b2a000000000000000000000001"), 3n, 95n, 105n, 2n, 5n, 1n];
  const expected = "0x" + sha3.keccak256(Buffer.concat(fields.map((f) => Buffer.from(f.toString(16).padStart(64, "0"), "hex"))));
  assert.equal(publicInputsHash(args), expected);
  assert.notEqual(idempotencyKey("m", 1), idempotencyKey("m", 2));
});

test("turn handler: signed EXTRACT 10 with a policy proof that verifies", async () => {
  const secret = crypto.randomBytes(32).toString("hex");
  const vfy = new StealTheVfy({ circuitsDir: path.resolve("circuits"), params: P, salt: "123456789" });
  const store = new Store(fs.mkdtempSync(path.join(os.tmpdir(), "stv-")));
  const config = { agentPath: "/agent", hmacSecret: secret, deadlineMarginMs: 3000 };
  const server = http.createServer(createApp({ config, store, prover: null, kurier: null, vfy }));
  await new Promise((r) => server.listen(0, r));
  const turn = {
    protocolVersion: "v1", eventId: "steal-the-vfy", mode: "practice", matchId: "9f4e1b2a-1111-2222-3333-444455556666", turn: 3,
    issuedAt: new Date().toISOString(), deadlineAt: new Date(Date.now() + 30_000).toISOString(),
    state: { selfBalance: "95", opponentBalance: "105", selfFortifiedUntilTurn: null, opponentFortifiedUntilTurn: null },
    strategyCommitment: { hash: vfy.commitmentHex }, resolverVersion: "v1", nonce: "abc",
  };
  const post = async (obj) => {
    const raw = JSON.stringify(obj);
    const res = await fetch(`http://127.0.0.1:${server.address().port}/agent`, {
      method: "POST", headers: { "x-agent-games-signature": crypto.createHmac("sha256", secret).update(raw).digest("hex") }, body: raw,
    });
    return { text: await res.text(), sig: res.headers.get("x-agent-games-signature") };
  };

  const r = await post(turn);
  const json = JSON.parse(r.text);
  assert.equal(r.sig, crypto.createHmac("sha256", secret).update(r.text).digest("hex"));
  assert.deepEqual([json.matchId, json.turn, json.action], [turn.matchId, 3, { type: "EXTRACT", amount: 10 }]);
  assert.equal(json.policyProof.circuitVersion, "v1");
  assert.ok(await snarkjs.groth16.verify(vfy.vk, json.public_signals, json.proof));

  const retry = await post(turn);
  assert.equal(retry.text, r.text, "retries are idempotent");

  const wrong = JSON.parse((await post({ ...turn, turn: 4, strategyCommitment: { hash: "0x01" } })).text);
  assert.deepEqual(wrong.action, { type: "HOLD" }, "no proof possible -> HOLD, no amount field");
  await new Promise((r) => server.close(r));
});
