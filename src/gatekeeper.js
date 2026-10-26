import { toBigInt, toField, encodeTaskId } from "./encode.js";

export const TASK_TYPE = "agent-games.proof-gatekeeper.v1";

export const REASONS = {
  VALID: "VALID_CONDITION",
  VK: "VK_SUBSTITUTION",
  THRESHOLD: "THRESHOLD_MISMATCH",
  EXPIRED: "EXPIRED_CONDITION",
  RECIPIENT: "RECIPIENT_MISMATCH",
  AMOUNT: "AMOUNT_OVERFLOW",
  REUSED: "PROOF_REUSED",
  INVALID: "INVALID_INPUT",
};

/**
 * Pure decision. Mirrors the gatekeeper circuit exactly (probed against the
 * official wasm): approve iff vk hashes equal, balance >= minimum,
 * current_block < expiry_block, recipients equal, amount <= max_transfer.
 * Proof reuse is outside the circuit and is checked against the durable seen-set.
 *
 * Returns { decision, reason_code, circuitInput|null }. circuitInput is null when
 * the circuit cannot express the decision (reuse, malformed input).
 */
export function decide(task, { acceptedBy, taskIdEncoding }) {
  let f;
  try {
    f = parseInput(task.input);
  } catch {
    return { decision: "REJECT", reason_code: REASONS.INVALID, circuitInput: null };
  }

  const checks = [
    [REASONS.VK, f.registeredVk === f.proofVk],
    [REASONS.THRESHOLD, f.publicBalance >= f.minimum],
    [REASONS.EXPIRED, f.currentBlock < f.expiryBlock],
    [REASONS.RECIPIENT, f.recipient === f.conditionRecipient],
    [REASONS.AMOUNT, f.amount <= f.maxTransfer],
  ];
  const failed = checks.find(([, ok]) => !ok);
  const circuitApproves = !failed;

  let circuitInput = null;
  try {
    circuitInput = {
      registeredVkHash: f.registeredVk,
      proofVkHash: f.proofVk,
      minimum: f.minimum,
      publicBalance: f.publicBalance,
      expiryBlock: f.expiryBlock,
      currentBlock: f.currentBlock,
      recipient: f.recipient,
      conditionRecipient: f.conditionRecipient,
      amount: f.amount,
      maxTransfer: f.maxTransfer,
      taskId: encodeTaskId(task.task_id, taskIdEncoding),
      decision: circuitApproves ? 1n : 0n,
    };
  } catch {
    circuitInput = null;
  }

  if (failed) return { decision: "REJECT", reason_code: failed[0], circuitInput };

  // Every field passes, so the only remaining trap is a replayed proof reference.
  // The circuit would compute APPROVE here, so a reuse rejection carries no proof
  // (the rules exclude PROOF_REUSED from the proof requirement).
  const prior = acceptedBy(task.input.proof_tx);
  if (prior && prior !== task.task_id) return { decision: "REJECT", reason_code: REASONS.REUSED, circuitInput: null };

  return { decision: "APPROVE", reason_code: REASONS.VALID, circuitInput };
}

function parseInput(input) {
  if (!input || typeof input !== "object") throw new Error("missing input");
  return {
    registeredVk: identity(input.registered_vk),
    proofVk: identity(input.proof_vk),
    minimum: toBigInt(input.minimum),
    publicBalance: toBigInt(input.public_balance),
    expiryBlock: toBigInt(input.expiry_block),
    currentBlock: toBigInt(input.current_block),
    recipient: identity(input.recipient),
    conditionRecipient: identity(input.condition_recipient),
    amount: toBigInt(input.amount),
    maxTransfer: toBigInt(input.max_transfer),
  };
}

// Hashes and addresses: compare as field elements so the JS check and the
// circuit's IsEqual agree exactly (case-insensitive hex, mod p).
function identity(value) {
  if (typeof value !== "string" || value.trim() === "") throw new Error("missing identity field");
  return toField(value);
}
