import test from "node:test";
import assert from "node:assert/strict";
import { decide, REASONS } from "../src/gatekeeper.js";
import { task, OTHER, VK_BAD, ADDR } from "./fixtures.js";

const none = { acceptedBy: () => undefined, taskIdEncoding: "utf8" };

const cases = [
  ["valid condition", {}, "APPROVE", REASONS.VALID],
  ["vk substitution", { proof_vk: VK_BAD }, "REJECT", REASONS.VK],
  ["threshold mismatch", { public_balance: "999" }, "REJECT", REASONS.THRESHOLD],
  ["balance exactly at minimum", { public_balance: "1000" }, "APPROVE", REASONS.VALID],
  ["expired condition", { current_block: 8430001 }, "REJECT", REASONS.EXPIRED],
  ["expiry block itself counts as expired", { current_block: 8430000 }, "REJECT", REASONS.EXPIRED],
  ["recipient mismatch", { recipient: OTHER }, "REJECT", REASONS.RECIPIENT],
  ["recipient hex case is ignored", { recipient: ADDR.toLowerCase(), condition_recipient: ADDR.toUpperCase().replace("0X", "0x") }, "APPROVE", REASONS.VALID],
  ["amount overflow", { amount: "1001" }, "REJECT", REASONS.AMOUNT],
  ["amount exactly at cap", { amount: "1000" }, "APPROVE", REASONS.VALID],
  ["huge amounts compare as bigints", { amount: "100000000000000000000001", max_transfer: "100000000000000000000000" }, "REJECT", REASONS.AMOUNT],
  ["malformed number fails closed", { amount: "five hundred" }, "REJECT", REASONS.INVALID],
  ["missing vk fails closed", { proof_vk: "" }, "REJECT", REASONS.INVALID],
];

for (const [name, overrides, decision, reason] of cases) {
  test(name, () => {
    const v = decide(task(overrides), none);
    assert.equal(v.decision, decision);
    assert.equal(v.reason_code, reason);
  });
}

test("proof reused from an earlier accepted task", () => {
  const t = task();
  const v = decide(t, { ...none, acceptedBy: (ref) => (ref === t.input.proof_tx ? "gk_earlier" : undefined) });
  assert.deepEqual([v.decision, v.reason_code, v.circuitInput], ["REJECT", REASONS.REUSED, null]);
});

test("a platform retry of the same task is not mistaken for reuse", () => {
  const t = task();
  const v = decide(t, { ...none, acceptedBy: () => t.task_id });
  assert.equal(v.decision, "APPROVE");
});

test("field traps take precedence over reuse so the rejection stays provable", () => {
  const v = decide(task({ proof_vk: VK_BAD }), { ...none, acceptedBy: () => "gk_earlier" });
  assert.equal(v.reason_code, REASONS.VK);
  assert.equal(v.circuitInput.decision, 0n);
});

test("circuit decision bit matches the verdict", () => {
  assert.equal(decide(task(), none).circuitInput.decision, 1n);
  assert.equal(decide(task({ amount: "5000" }), none).circuitInput.decision, 0n);
});
