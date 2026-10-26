import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as snarkjs from "snarkjs";
import { FIELD_P } from "./encode.js";

export class GatekeeperProver {
  constructor(circuitsDir) {
    this.wasm = new Uint8Array(fs.readFileSync(path.join(circuitsDir, "gatekeeper.wasm")));
    this.zkey = new Uint8Array(fs.readFileSync(path.join(circuitsDir, "gatekeeper_final.zkey")));
    this.vk = JSON.parse(fs.readFileSync(path.join(circuitsDir, "gatekeeper_vk.json"), "utf8"));
  }

  /** Groth16 proof over the circuit input; self-verified before it is returned. */
  async prove(circuitInput) {
    const salt = BigInt("0x" + crypto.randomBytes(32).toString("hex")) % FIELD_P;
    const input = Object.fromEntries(Object.entries({ ...circuitInput, salt }).map(([k, v]) => [k, v.toString()]));
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, this.wasm, this.zkey);
    if (!(await snarkjs.groth16.verify(this.vk, publicSignals, proof))) throw new Error("self-verification failed");
    return { proof, publicSignals };
  }
}

export function withTimeout(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), Math.max(0, ms));
    }),
  ]).finally(() => clearTimeout(timer));
}
