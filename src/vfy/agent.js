import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as snarkjs from "snarkjs";
import sha3 from "js-sha3";
import { poseidon9 } from "poseidon-lite";
import { policyAction, validateParams, ACTION_CODE } from "./policy.js";
import { FIELD_P } from "../encode.js";

const { keccak256 } = sha3;
export const CIRCUIT_VERSION = "v1";
const CIRCUIT_VERSION_NUM = 1n;

export function isTurn(msg) {
  return msg?.eventId === "steal-the-vfy" && typeof msg.matchId === "string" && Number.isInteger(msg.turn);
}

export function commitmentOf(params, salt) {
  return poseidon9([...params.map(BigInt), BigInt(salt)]);
}

export function matchIdToField(matchId) {
  return BigInt("0x" + matchId.replace(/-/g, ""));
}

/** keccak256 over 32-byte big-endian fields, in the order the build guide specifies. */
export function publicInputsHash({ commitment, matchId, turn, selfBalance, opponentBalance, action }) {
  const fields = [
    BigInt(commitment),
    matchIdToField(matchId),
    BigInt(turn),
    BigInt(selfBalance),
    BigInt(opponentBalance),
    BigInt(ACTION_CODE[action.type]),
    BigInt(action.amount ?? 0),
    CIRCUIT_VERSION_NUM,
  ];
  const bytes = Buffer.concat(fields.map((f) => Buffer.from(f.toString(16).padStart(64, "0"), "hex")));
  return "0x" + keccak256(bytes);
}

export class StealTheVfy {
  /** params: strategyParams[8]; salt: secret bigint-ish string. */
  constructor({ circuitsDir, params, salt }) {
    validateParams(params);
    this.params = params.map(BigInt);
    this.salt = BigInt(salt) % FIELD_P;
    this.commitment = commitmentOf(this.params, this.salt);
    this.wasm = new Uint8Array(fs.readFileSync(path.join(circuitsDir, "vfy-policy.wasm")));
    this.zkey = new Uint8Array(fs.readFileSync(path.join(circuitsDir, "vfy-policy_final.zkey")));
    this.vk = JSON.parse(fs.readFileSync(path.join(circuitsDir, "vfy-policy_vk.json"), "utf8"));
  }

  get commitmentHex() {
    return "0x" + this.commitment.toString(16).padStart(64, "0");
  }

  decide(turn) {
    return policyAction(this.params, turn.state.selfBalance, turn.state.opponentBalance);
  }

  async prove(turn, action) {
    const input = {
      commitment: this.commitment,
      salt: this.salt,
      matchId: matchIdToField(turn.matchId),
      turnNumber: BigInt(turn.turn),
      selfBalance: BigInt(turn.state.selfBalance),
      opponentBalance: BigInt(turn.state.opponentBalance),
      action: BigInt(ACTION_CODE[action.type]),
      amount: BigInt(action.amount ?? 0),
      circuitVersion: CIRCUIT_VERSION_NUM,
      strategyParams: this.params,
    };
    const norm = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : v.toString()]));
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(norm, this.wasm, this.zkey);
    if (!(await snarkjs.groth16.verify(this.vk, publicSignals, proof))) throw new Error("self-verification failed");
    return { proof, publicSignals };
  }

  /** The platform's frozen commitment must be ours, or no proof can satisfy it. */
  commitmentMatches(turn) {
    try {
      return BigInt(turn.strategyCommitment?.hash) === this.commitment;
    } catch {
      return false;
    }
  }
}

/** Unique per (match, turn), stable across retries. */
export function idempotencyKey(matchId, turn) {
  const h = crypto.createHash("sha256").update(`${matchId}:${turn}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export function buildTurnResponse(turn, action, { proved, inputsHash, now = new Date() }) {
  const response = {
    matchId: turn.matchId,
    turn: turn.turn,
    // amount must be omitted entirely for HOLD / FORTIFY
    action: action.type === "EXTRACT" ? { type: "EXTRACT", amount: action.amount } : { type: action.type },
    policyProof: { circuitVersion: CIRCUIT_VERSION, publicInputsHash: inputsHash },
    agentTimestamp: now.toISOString(),
    idempotencyKey: idempotencyKey(turn.matchId, turn.turn),
  };
  if (proved) {
    response.proof = proved.proof;
    response.public_signals = proved.publicSignals;
  }
  return response;
}
