import crypto from "node:crypto";
import sha3 from "js-sha3";

const { keccak256 } = sha3;

// BN254 scalar field; circom reduces every input modulo this prime.
export const FIELD_P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/** Decimal or 0x-hex string/number -> bigint. Throws on anything else. */
export function toBigInt(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  if (typeof value === "string") {
    const s = value.trim();
    if (/^0x[0-9a-fA-F]+$/.test(s)) return BigInt(s);
    if (/^[0-9]+$/.test(s)) return BigInt(s);
  }
  throw new Error(`not an unsigned integer: ${JSON.stringify(value)}`);
}

export function toField(value) {
  return toBigInt(value) % FIELD_P;
}

/** task_id strings like "gk_8d31_..." are not numbers; the encoding is configurable. */
export function encodeTaskId(taskId, encoding) {
  if (/^(0x[0-9a-fA-F]+|[0-9]+)$/.test(String(taskId))) return toField(String(taskId));
  const bytes = Buffer.from(String(taskId), "utf8");
  switch (encoding) {
    case "utf8":
      return BigInt("0x" + (bytes.toString("hex") || "0")) % FIELD_P;
    case "sha256":
      return BigInt("0x" + crypto.createHash("sha256").update(bytes).digest("hex")) % FIELD_P;
    case "keccak256":
      return BigInt("0x" + keccak256(bytes)) % FIELD_P;
    default:
      throw new Error(`unknown TASK_ID_ENCODING ${encoding}`);
  }
}
