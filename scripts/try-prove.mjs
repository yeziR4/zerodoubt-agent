import * as snarkjs from "snarkjs";
const base = { registeredVkHash: "123", proofVkHash: "123", minimum: "1000", publicBalance: "1460", expiryBlock: "8430000", currentBlock: "8420000", recipient: "0xDe429f01", conditionRecipient: "0xDe429f01", amount: "500", maxTransfer: "1000", taskId: "777", decision: "1", salt: "42" };
const over = JSON.parse(process.argv[2] || "{}");
const input = Object.fromEntries(Object.entries({ ...base, ...over }).map(([k, v]) => [k, BigInt(v).toString()]));
try {
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, "circuits/gatekeeper.wasm", "circuits/gatekeeper_final.zkey");
  console.log("OK", JSON.stringify(publicSignals));
} catch (e) { console.log("FAIL", String(e.message).split("\n")[0]); }
process.exit(0);
