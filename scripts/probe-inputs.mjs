// Recover circom input signal names by probing FNV-1a-64 hashes against the witness calculator.
import fs from "node:fs";
const wasm = fs.readFileSync(process.argv[2]);
const { instance } = await WebAssembly.instantiate(wasm, {
  runtime: { exceptionHandler() {}, printErrorMessage() {}, writeBufferMessage() {}, showSharedRWMemory() {} },
});
const e = instance.exports;
e.init(0);
function fnv(str) {
  let h = 0xcbf29ce484222325n;
  for (const c of Buffer.from(str)) { h ^= BigInt(c); h = (h * 0x100000001b3n) & 0xffffffffffffffffn; }
  return [Number(h >> 32n), Number(h & 0xffffffffn)];
}
console.log("version", e.getVersion(), e.getMinorVersion(), e.getPatchVersion(), "inputs", e.getInputSize(), "witness", e.getWitnessSize());
const base = ["registered_vk","proof_vk","minimum","public_balance","expiry_block","current_block","recipient","condition_recipient","amount","max_transfer","proof_tx","task_id","decision","reason","reason_code","nonce","seen","reused","proof_reused","is_reused","vk","balance","threshold","expiry","block","cap","nullifier","salt","task","taskId","taskHash","task_hash","approve","approved","valid","out","commitment","proofTx","proof_ref","proofRef","reusedFlag","alreadySeen","already_seen","seen_flag","decisionCode","reasonCode","registeredVk","proofVk","publicBalance","expiryBlock","currentBlock","conditionRecipient","maxTransfer","proofTxHash","proof_tx_hash","taskIdHash","task_id_hash","binding","context","agent","agent_id","agentId","secret","witness","policy","in","inputs","isReused","proofReused","wasSeen","was_seen","seenBefore","seen_before","proof_seen","proofSeen","isSeen","is_seen","reuse","reuseFlag","reuse_flag","replay","replayed","trap","trap_code","trapCode","expected","claimed_decision","claimedDecision","claimed_reason","claimedReason"];
const found = [];
for (const n of base) { const [m, l] = fnv(n); const s = e.getInputSignalSize(m, l); if (s >= 0) found.push(`${n}[${s}]`); }
console.log(found.join("\n"));
