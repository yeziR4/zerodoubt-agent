// Replays signed sample envelopes (preflight + one per trap) against a running agent.
// Usage: AGENT_URL=http://localhost:8080/agent npm run replay
import crypto from "node:crypto";

const url = process.env.AGENT_URL ?? "http://localhost:8080/agent";
const secret = process.env.AGENT_GAMES_HMAC_SECRET;
if (!secret) throw new Error("set AGENT_GAMES_HMAC_SECRET");

const VK = "0x6b79c6012a6d8651f3e13bc4d2a20370280ab49700c90c5316d4168bfbad77b0";
const ADDR = "0xDe42000000000000000000000000000000009f01";
const run = Date.now().toString(36);
const valid = (i) => ({
  registered_vk: VK, proof_vk: VK, minimum: "1000", public_balance: "1460", expiry_block: 8430000, current_block: 8420000,
  recipient: ADDR, condition_recipient: ADDR, amount: "500", max_transfer: "1000", proof_tx: `0x${run}${i}`,
});

const cases = [
  ["VALID_CONDITION", {}],
  ["VK_SUBSTITUTION", { proof_vk: "0x13aa" }],
  ["THRESHOLD_MISMATCH", { public_balance: "999" }],
  ["EXPIRED_CONDITION", { current_block: 8430001 }],
  ["RECIPIENT_MISMATCH", { recipient: "0x9999000000000000000000000000000000009f01" }],
  ["AMOUNT_OVERFLOW", { amount: "1001" }],
  ["PROOF_REUSED", { proof_tx: `0x${run}0` }],
];

async function send(obj) {
  const raw = JSON.stringify(obj);
  const started = performance.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-agent-games-signature": crypto.createHmac("sha256", secret).update(raw).digest("hex") },
    body: raw,
  });
  const text = await res.text();
  const sig = res.headers.get("x-agent-games-signature");
  const sigOk = sig === crypto.createHmac("sha256", secret).update(text).digest("hex");
  return { status: res.status, json: JSON.parse(text), ms: Math.round(performance.now() - started), sigOk };
}

const pre = await send({ type: "agent-games.preflight.v1", agent_id: "agt_local", issued_at: new Date().toISOString(), nonce: run });
console.log(`preflight  ${pre.status} sig=${pre.sigOk} ${JSON.stringify(pre.json)}`);

let failures = 0;
for (const [i, [expected, overrides]] of cases.entries()) {
  const r = await send({
    type: "agent-games.proof-gatekeeper.v1", task_id: `gk_${run}_${i}`, mode: "practice",
    issued_at: new Date().toISOString(), deadline_at: new Date(Date.now() + 60_000).toISOString(),
    input: { ...valid(i), ...overrides },
  });
  const ok = r.json.reason_code === expected && r.sigOk;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${expected.padEnd(19)} -> ${r.json.decision} ${r.json.reason_code} proof=${Boolean(r.json.proof)} ${r.ms}ms`);
}
process.exit(failures ? 1 : 0);
