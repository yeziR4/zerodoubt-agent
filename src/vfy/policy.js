// Mirror of the vfy-policy circuit, recovered by probing the official wasm.
// A strategy is strategyParams[8] = [extractAmount, fortifyBelow, holdAtOrBelow, alwaysHold, 0, 0, 0, 0].

export const ACTION_CODE = { HOLD: 0, FORTIFY: 1, EXTRACT: 2 };

export function validateParams(p) {
  if (!Array.isArray(p) || p.length !== 8) throw new Error("strategyParams must have 8 entries");
  const [amount, , , alwaysHold, ...reserved] = p.map(BigInt);
  if (amount < 1n || amount > 10n) throw new Error("p0 (extract amount) must be 1..10");
  if (alwaysHold !== 0n && alwaysHold !== 1n) throw new Error("p3 must be 0 or 1");
  if (reserved.some((v) => v !== 0n)) throw new Error("p4..p7 must be 0");
  if (p.some((v) => BigInt(v) < 0n)) throw new Error("params must be non-negative");
}

/** The single action the circuit permits for this state. */
export function policyAction(p, selfBalance, opponentBalance) {
  const [amount, fortifyBelow, holdAtOrBelow, alwaysHold] = p.map(BigInt);
  const self = BigInt(selfBalance);
  const opp = BigInt(opponentBalance);
  if (self < fortifyBelow) return { type: "FORTIFY" };
  if (alwaysHold === 1n || opp <= holdAtOrBelow) return { type: "HOLD" };
  return { type: "EXTRACT", amount: Number(amount) };
}
