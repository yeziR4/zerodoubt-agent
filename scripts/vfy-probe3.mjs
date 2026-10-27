import { tryWitness } from "./vfy-witness.mjs";
const ACTS = [["H", 0, 0], ["F", 1, 0], ...Array.from({ length: 10 }, (_, i) => [`E${i + 1}`, 2, i + 1])];
export async function permitted(strategyParams, st = {}) {
  const base = { salt: 12345, matchId: 99, turnNumber: 3, selfBalance: 100, opponentBalance: 100, circuitVersion: 1, ...st };
  const ok = [], fails = new Set();
  for (const [n, action, amount] of ACTS) {
    const r = await tryWitness({ ...base, strategyParams, action, amount });
    r === "OK" ? ok.push(n) : fails.add(r.replace("FAIL line: ", "L"));
  }
  return ok.length ? ok.join(",") : [...fails].join("/");
}
