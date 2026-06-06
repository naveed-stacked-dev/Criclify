// ID obfuscation — hides raw 24-char MongoDB ObjectIds in public URLs.
// Not cryptographically secure; purpose is to prevent casual ID exposure.
//
// Encoding scheme:
//   1. Reverse the 24-char hex string
//   2. base64-encode it, remove padding
//   3. Replace '/' → '_'  and  '+' → '.'  (both URL-safe, no conflict)
//   4. Insert 3 dashes as visual segment separators every 8 chars
//      → final shape: xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx
//
// Matches admin/src/utils/crypto.js — IDs encoded in either app decode cleanly.

export const encodeId = (id) => {
  if (!id) return id;
  try {
    const reversed = id.toString().split("").reverse().join("");
    const b64 = btoa(reversed)
      .replace(/=/g, "")
      .replace(/\+/g, ".")   // '.' never used as a separator → no ambiguity
      .replace(/\//g, "_");
    // Split into up to 4 segments with 3 dashes
    const parts = [b64.slice(0, 8), b64.slice(8, 16), b64.slice(16, 24), b64.slice(24)].filter(Boolean);
    return parts.join("-");
  } catch {
    return id;
  }
};

export const decodeId = (encoded) => {
  if (!encoded) return encoded;
  // Raw ObjectId → pass through unchanged (backward-compat / direct links)
  if (/^[0-9a-fA-F]{24}$/.test(encoded)) return encoded;
  try {
    // New format: strip segment dashes, restore '.' → '+', '_' → '/'
    let b64 = encoded.replace(/-/g, "").replace(/\./g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    const result = atob(b64).split("").reverse().join("");
    if (/^[0-9a-fA-F]{24}$/.test(result)) return result;
    // Fallback: old format where '-' represented '+' (no segment dashes)
    let b64Old = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (b64Old.length % 4 !== 0) b64Old += "=";
    return atob(b64Old).split("").reverse().join("");
  } catch {
    return encoded;
  }
};
