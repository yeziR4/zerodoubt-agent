import http from "node:http";
import { config } from "./config.js";
import { Store } from "./store.js";
import { GatekeeperProver } from "./prover.js";
import { makeKurier } from "./kurier.js";
import { createApp } from "./app.js";

if (!config.hmacSecret) {
  console.error("AGENT_GAMES_HMAC_SECRET is not set; every request will be rejected until it is.");
}

const store = new Store(config.dataDir);
const prover = new GatekeeperProver(config.circuitsDir);
const kurier = makeKurier({
  apiKey: config.kurierApiKey,
  apiUrl: config.kurierApiUrl,
  vkHash: config.gatekeeperVkHash,
  log: (name, row) => store.log(name, row),
});

// Warm the prover so the first scored task doesn't pay snarkjs start-up cost.
prover
  .prove({
    registeredVkHash: 1n, proofVkHash: 1n, minimum: 1n, publicBalance: 1n, expiryBlock: 2n, currentBlock: 1n,
    recipient: 1n, conditionRecipient: 1n, amount: 1n, maxTransfer: 1n, taskId: 1n, decision: 1n,
  })
  .then(() => console.log("prover warm"))
  .catch((err) => console.error("prover warm-up failed:", err.message));

const server = http.createServer(createApp({ config, store, prover, kurier }));
server.requestTimeout = 65_000;
server.listen(config.port, () => {
  console.log(`agent listening on :${config.port}${config.agentPath} (task_id encoding: ${config.taskIdEncoding})`);
});

for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.close(() => process.exit(0)));
