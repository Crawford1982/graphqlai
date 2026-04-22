/**
 * Best-effort secret redaction for disclosure packets (tokens in curl / bodies).
 */

const BEARER = /Bearer\s+[A-Za-z0-9._\-]{20,}/gi;
const JWT_LIKE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
const LONG_HEX = /\b[0-9a-f]{32,}\b/gi;

/**
 * @param {string} s
 */
export function redactSecrets(s) {
  let out = String(s);
  out = out.replace(BEARER, 'Bearer [REDACTED]');
  out = out.replace(JWT_LIKE, '[REDACTED_JWT]');
  out = out.replace(LONG_HEX, '[REDACTED_HEX]');
  return out;
}
