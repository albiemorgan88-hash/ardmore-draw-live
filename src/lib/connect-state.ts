import { createHmac, timingSafeEqual } from "node:crypto";

function signature(value: string) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Connect callback signing is not configured");
  return createHmac("sha256", key).update(`ardmore-connect-v1:${value}`).digest("base64url");
}

export function createConnectState(profile: string, account: string, claim: string | null, now = Date.now()) {
  const value = Buffer.from(JSON.stringify({ profile, account, claim, expires: now + 30 * 60_000 })).toString("base64url");
  return `${value}.${signature(value)}`;
}

export function verifyConnectState(state: string | null, profile: string, account: string, claim: string | null, now = Date.now()) {
  if (!state || state.length > 4096) return false;
  try {
    const [value, signed, extra] = state.split(".");
    if (!value || !signed || extra) return false;
    const expected = Buffer.from(signature(value));
    const supplied = Buffer.from(signed);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString());
    return decoded.profile === profile && decoded.account === account && decoded.claim === claim
      && Number.isSafeInteger(decoded.expires) && decoded.expires > now && decoded.expires <= now + 30 * 60_000;
  } catch { return false; }
}
