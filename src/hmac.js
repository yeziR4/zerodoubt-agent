import crypto from "node:crypto";

// The build guide names the header but not the encoding, so accept the common
// HMAC-SHA256 forms and answer in whichever form the platform used.
const SCHEMES = {
  hex: (mac) => mac.toString("hex"),
  "sha256=hex": (mac) => `sha256=${mac.toString("hex")}`,
  base64: (mac) => mac.toString("base64"),
  "sha256=base64": (mac) => `sha256=${mac.toString("base64")}`,
};

export const DEFAULT_SCHEME = "hex";

// The dashboard shows the 32-byte secret as 64 hex chars; the platform may key
// the HMAC with that text or with the decoded bytes, so try both.
function keys(secret) {
  const out = [["text", Buffer.from(secret, "utf8")]];
  if (/^[0-9a-fA-F]{64}$/.test(secret)) out.push(["bytes", Buffer.from(secret, "hex")]);
  return out;
}

function mac(key, body) {
  return crypto.createHmac("sha256", key).update(body).digest();
}

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/**
 * Returns the matching scheme as "<key form>:<encoding>" (e.g. "text:hex"),
 * or null when the signature is missing or wrong.
 */
export function verifySignature(secret, rawBody, header) {
  if (!secret || typeof header !== "string" || header.length === 0) return null;
  const given = header.trim();
  for (const [form, key] of keys(secret)) {
    const digest = mac(key, rawBody);
    for (const [name, format] of Object.entries(SCHEMES)) {
      const expected = format(digest);
      if (name.endsWith("hex") ? safeEqual(expected, given.toLowerCase()) : safeEqual(expected, given)) return `${form}:${name}`;
    }
  }
  return null;
}

export function sign(secret, rawBody, scheme = `text:${DEFAULT_SCHEME}`) {
  const [form, name] = scheme.includes(":") ? scheme.split(/:(.*)/s) : ["text", scheme];
  const key = (keys(secret).find(([f]) => f === form) ?? keys(secret)[0])[1];
  return (SCHEMES[name] ?? SCHEMES[DEFAULT_SCHEME])(mac(key, rawBody));
}
