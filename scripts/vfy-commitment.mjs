// Prints the Steal the VFY commitment for STRATEGY_PARAMS + STRATEGY_SALT (never prints the salt).
import { commitmentOf } from "../src/vfy/agent.js";
import { validateParams } from "../src/vfy/policy.js";
import { FIELD_P } from "../src/encode.js";
const params = JSON.parse(process.env.STRATEGY_PARAMS ?? "[10,0,0,0,0,0,0,0]");
validateParams(params);
if (!process.env.STRATEGY_SALT) throw new Error("set STRATEGY_SALT");
const c = commitmentOf(params, BigInt(process.env.STRATEGY_SALT) % FIELD_P);
console.log("0x" + c.toString(16).padStart(64, "0"));
