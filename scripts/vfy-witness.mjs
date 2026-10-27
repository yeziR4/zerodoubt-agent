// Witness-level probe of vfy-policy: tries an input and reports OK or the failing template line.
import * as snarkjs from "snarkjs";
import { poseidon2, poseidon8, poseidon9 } from "poseidon-lite";
export const COMMIT = {
  p9: (p, s) => poseidon9([...p, s]),
  s9: (p, s) => poseidon9([s, ...p]),
  nested: (p, s) => poseidon2([poseidon8(p), s]),
};
export async function tryWitness(inp, commitMode = "p9") {
  const input = { ...inp };
  input.commitment ??= COMMIT[commitMode](input.strategyParams.map(BigInt), BigInt(input.salt));
  const norm = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : String(v)]));
  const out = { type: "mem" };
  const errs = [];
  const orig = console.log; console.log = (...a) => errs.push(a.join(" "));
  try {
    await snarkjs.wtns.calculate(norm, "circuits/vfy-policy.wasm", out);
    return "OK";
  } catch (e) {
    return "FAIL " + (String(e.message).match(/line: \d+/)?.[0] ?? e.message.split("\n")[0]);
  } finally { console.log = orig; }
}
