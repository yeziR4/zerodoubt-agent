import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const config = {
  port: Number(process.env.PORT ?? 8080),
  agentPath: process.env.AGENT_PATH ?? "/agent",
  hmacSecret: process.env.AGENT_GAMES_HMAC_SECRET ?? "",
  dataDir: process.env.DATA_DIR ?? path.join(root, "data"),
  circuitsDir: process.env.CIRCUITS_DIR ?? path.join(root, "circuits"),
  // How a non-numeric task_id becomes a field element; confirm against practice tasks.
  taskIdEncoding: process.env.TASK_ID_ENCODING ?? "utf8",
  // Stop proving this many ms before deadline_at and answer without a proof instead.
  deadlineMarginMs: Number(process.env.DEADLINE_MARGIN_MS ?? 8000),
  kurierApiKey: process.env.KURIER_API_KEY ?? "",
  kurierApiUrl: process.env.KURIER_API_URL ?? "https://api.kurier.xyz/api/v1",
  // Steal the VFY: committed policy [extract, fortifyBelow, holdAtOrBelow, alwaysHold, 0,0,0,0] and its secret salt.
  strategyParams: JSON.parse(process.env.STRATEGY_PARAMS ?? "[10,0,0,0,0,0,0,0]"),
  strategySalt: process.env.STRATEGY_SALT ?? "",
  gatekeeperVkHash:
    process.env.GATEKEEPER_VK_HASH ?? "0x6b79c6012a6d8651f3e13bc4d2a20370280ab49700c90c5316d4168bfbad77b0",
};
