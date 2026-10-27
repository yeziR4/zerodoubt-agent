// Usage: node scripts/probe-names.mjs <wasm> — prints input signals (name, size) found among candidate names.
import fs from "node:fs";
const { instance } = await WebAssembly.instantiate(fs.readFileSync(process.argv[2]), { runtime: { exceptionHandler() {}, printErrorMessage() {}, writeBufferMessage() {}, showSharedRWMemory() {} } });
const e = instance.exports; e.init(0);
const fnv = (s) => { let h = 0xcbf29ce484222325n; for (const c of Buffer.from(s)) { h ^= BigInt(c); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; } return [Number(h >> 32n), Number(h & 0xffffffffn)]; };
const words = ["strategy","commitment","commit","salt","match","matchId","turn","self","opponent","opp","my","their","balance","Balance","action","Action","actionType","amount","Amount","circuit","version","circuitVersion","params","param","weights","witness","w","W","threshold","Threshold","extract","Extract","fortify","Fortify","hold","Hold","fortified","Fortified","Until","UntilTurn","until","state","publicInputsHash","inputsHash","hash","lead","deficit","margin","aggression","max","min","cap","Cap","last","Last","endgame","Endgame","bias","seed","Seed","mode","Mode","random","prior","opening","Opening","lastTurns","delta","diff","base","Base","rule","Rule","type","code","Code","r","R","C","M","T","S","A","V","nonce","resolver"];
const cands = new Set(words);
for (const a of words) for (const b of words) cands.add(a + b[0].toUpperCase() + b.slice(1)), cands.add(a + "_" + b.toLowerCase());
for (const a of ["strategy","policy","param","params","w","weight","p","s","rule"]) for (let i = 0; i < 16; i++) cands.add(a + i), cands.add(a + "_" + i);
const found = [];
for (const n of cands) { const [m, l] = fnv(n); const s = e.getInputSignalSize(m, l); if (s > 0) found.push(`${n}[${s}]`); }
console.log(found.join(" "), "| total signals:", e.getInputSize());
