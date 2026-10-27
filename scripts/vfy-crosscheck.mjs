// Random states: the JS policy's action must be the only one the circuit accepts.
import { tryWitness } from "./vfy-witness.mjs";
import { policyAction, ACTION_CODE } from "../src/vfy/policy.js";
const rnd = (n) => Math.floor(Math.random() * n);
let bad = 0;
for (let i = 0; i < 40; i++) {
  const p = [1 + rnd(10), rnd(3) ? rnd(120) : 0, rnd(3) ? rnd(120) : 0, rnd(5) ? 0 : 1, 0, 0, 0, 0];
  const st = { selfBalance: rnd(200), opponentBalance: rnd(200) };
  const want = policyAction(p, st.selfBalance, st.opponentBalance);
  const base = { salt: 777, matchId: 5, turnNumber: 1 + rnd(20), circuitVersion: 1, strategyParams: p, ...st };
  const ok = (await tryWitness({ ...base, action: ACTION_CODE[want.type], amount: want.amount ?? 0 })) === "OK";
  // and one wrong alternative must fail
  const alt = want.type === "HOLD" ? { action: 1, amount: 0 } : { action: 0, amount: 0 };
  const altOk = (await tryWitness({ ...base, ...alt })) === "OK";
  if (!ok || altOk) { bad++; console.log("MISMATCH", JSON.stringify({ p, st, want, ok, altOk })); }
}
console.log(bad ? `${bad} mismatches` : "40/40 states match the circuit");
process.exit(0);
