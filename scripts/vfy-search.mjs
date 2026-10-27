// Strategy search over the full policy space the circuit allows.
// For each fortify-window variant: round-robin every candidate against the field,
// then report the best by expected points, worst case, and evolutionary stability.
import { policyAction } from "../src/vfy/policy.js";
import { playMatch, MATCH_POINTS } from "../src/vfy/resolver.js";

const P1 = [0, 40, 60, 80, 90, 95, 98, 100, 102, 105, 110, 120, 150, 250];
const P2 = [0, 10, 30, 50, 70, 90, 95, 100, 105, 110, 150];
const space = [];
for (let p0 = 1; p0 <= 10; p0++)
  for (const p1 of P1)
    for (const p2 of P2) for (const p3 of [0, 1]) {
      if (p3 === 1 && p2 !== 0) continue; // p2 is irrelevant once p3 forces HOLD
      space.push([p0, p1, p2, p3, 0, 0, 0, 0]);
    }
const fns = space.map((p) => {
  const cache = new Map();
  return (s, o) => {
    const k = s * 4096 + o;
    let v = cache.get(k);
    if (!v) cache.set(k, (v = policyAction(p, s, o)));
    return v;
  };
});
const key = (p) => `[${p.slice(0, 4).join(",")}]`;

for (const window of ["same", "next", "both"]) {
  const n = space.length;
  const pts = new Float64Array(n * n);
  const margin = new Float64Array(n * n);
  for (let i = 0; i < n; i++)
    for (let j = i; j < n; j++) {
      const m = playMatch(fns[i], fns[j], window);
      pts[i * n + j] = MATCH_POINTS[m.result];
      pts[j * n + i] = MATCH_POINTS[m.result === "W" ? "L" : m.result === "L" ? "W" : "D"];
      margin[i * n + j] = m.a - m.b;
      margin[j * n + i] = m.b - m.a;
    }

  const avg = (i, w) => { let s = 0, t = 0; for (let j = 0; j < n; j++) { s += pts[i * n + j] * w[j]; t += w[j]; } return s / t; };
  const worst = (i) => { let m = Infinity; for (let j = 0; j < n; j++) m = Math.min(m, pts[i * n + j]); return m; };
  const avgMargin = (i) => { let s = 0; for (let j = 0; j < n; j++) s += margin[i * n + j]; return s / n; };

  // Replicator dynamics from a uniform field: what survives when everyone adapts.
  let w = new Float64Array(n).fill(1 / n);
  for (let gen = 0; gen < 400; gen++) {
    const fit = Array.from({ length: n }, (_, i) => avg(i, w));
    const mean = fit.reduce((s, f, i) => s + f * w[i], 0);
    w = w.map((x, i) => (x * fit[i]) / mean);
  }
  const uniform = new Float64Array(n).fill(1);

  const rows = space.map((p, i) => ({ p, uni: avg(i, uniform), evo: avg(i, w), worst: worst(i), margin: avgMargin(i), share: w[i] }));
  const top = (by) => [...rows].sort((x, y) => y[by] - x[by] || y.margin - x.margin).slice(0, 5);
  console.log(`\n=== fortify window: ${window} (${n} strategies) ===`);
  console.log("best vs uniform field:  ", top("uni").map((r) => `${key(r.p)} ${r.uni.toFixed(2)}pts worst=${r.worst} margin=${r.margin.toFixed(1)}`).join(" | "));
  console.log("best vs evolved field:  ", top("evo").map((r) => `${key(r.p)} ${r.evo.toFixed(2)}pts`).join(" | "));
  console.log("evolved field survivors:", top("share").filter((r) => r.share > 0.01).map((r) => `${key(r.p)} ${(r.share * 100).toFixed(0)}%`).join(" | "));
  console.log("never-lose strategies:  ", rows.filter((r) => r.worst >= 9).length, "e.g.", rows.filter((r) => r.worst >= 9).sort((x, y) => y.uni - x.uni).slice(0, 4).map((r) => `${key(r.p)} ${r.uni.toFixed(2)}pts margin=${r.margin.toFixed(1)}`).join(" | "));
}
