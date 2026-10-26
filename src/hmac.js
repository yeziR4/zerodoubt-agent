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

function mac(secret, body) {
  return crypto.createHmac("sha256", secret).update(body).digest();
}

function safeEqual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Returns the matching scheme name, or null when the signature is missing or wrong. */
export function verifySignature(secret, rawBody, header) {
  if (!secret || typeof header !== "string" || header.length === 0) return null;
  const digest = mac(secret, rawBody);
  const given = header.trim();
  for (const [name, format] of Object.entries(SCHEMES)) {
    const expected = format(digest);
    if (name.endsWith("hex") ? safeEqual(expected, given.toLowerCase()) : safeEqual(expected, given)) return name;
  }
  return null;
}

export function sign(secret, rawBody, scheme = DEFAULT_SCHEME) {
  return (SCHEMES[scheme] ?? SCHEMES[DEFAULT_SCHEME])(mac(secret, rawBody));
}
