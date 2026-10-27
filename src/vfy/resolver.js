// Deterministic Steal the VFY resolver, per the build guide: FORTIFY costs 2 and
// blocks up to 6 incoming extraction; EXTRACT N takes up to N (<= 10) from the
// opponent's balance; both sides resolve simultaneously against prior state.
//
// The guide leaves the fortify window ambiguous ("this turn" vs "for the next
// resolution", plus a fortifiedUntilTurn field), so it is a parameter:
//   "same" - protects in the turn it is played
//   "next" - protects in the following turn only
//   "both" - protects in the turn played and the following one

export const RULES = { start: 100, turns: 20, fortifyCost: 2, fortifyBlock: 6, maxExtract: 10 };

export function resolveTurn(state, actA, actB, turn, fortifyWindow = "same", rules = RULES) {
  const a = { ...state.a };
  const b = { ...state.b };
  const playA = { side: a, act: actA };
  const playB = { side: b, act: actB };

  for (const { side, act } of [playA, playB]) {
    if (act.type === "FORTIFY") {
      if (fortifyWindow === "same") side.shieldTurns = [turn];
      else if (fortifyWindow === "next") side.shieldTurns = [...(side.shieldTurns ?? []).filter((t) => t >= turn), turn + 1];
      else side.shieldTurns = [turn, turn + 1];
    }
  }
  const shielded = (s) => (s.shieldTurns ?? []).includes(turn);
  const take = (act, victim, victimPrior) =>
    act.type === "EXTRACT"
      ? Math.max(0, Math.min(act.amount, rules.maxExtract, victimPrior) - (shielded(victim) ? rules.fortifyBlock : 0))
      : 0;

  const gainA = take(actA, b, state.b.balance);
  const gainB = take(actB, a, state.a.balance);
  const costA = actA.type === "FORTIFY" ? Math.min(rules.fortifyCost, state.a.balance) : 0;
  const costB = actB.type === "FORTIFY" ? Math.min(rules.fortifyCost, state.b.balance) : 0;
  a.balance = Math.max(0, state.a.balance - costA - gainB + gainA);
  b.balance = Math.max(0, state.b.balance - costB - gainA + gainB);
  return { a, b };
}

/** Plays a full match between two policy functions (self, opp) -> action. */
export function playMatch(policyA, policyB, fortifyWindow = "same", rules = RULES) {
  let state = { a: { balance: rules.start }, b: { balance: rules.start } };
  for (let turn = 1; turn <= rules.turns; turn++) {
    const actA = policyA(state.a.balance, state.b.balance, turn);
    const actB = policyB(state.b.balance, state.a.balance, turn);
    state = resolveTurn(state, actA, actB, turn, fortifyWindow, rules);
  }
  const diff = state.a.balance - state.b.balance;
  return { a: state.a.balance, b: state.b.balance, result: diff > 0 ? "W" : diff < 0 ? "L" : "D" };
}

export const MATCH_POINTS = { W: 18, D: 9, L: 3 };
