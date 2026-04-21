/**
 * Parse Retry-After from Fetch Headers (seconds or HTTP-date).
 *
 * @param {Headers} headers
 * @returns {number | null} seconds to wait, or null if absent/unparseable
 */
export function parseRetryAfterSeconds(headers) {
  const raw = headers.get('retry-after');
  if (!raw) return null;
  const s = String(raw).trim();
  const n = Number(s);
  if (Number.isFinite(n) && n >= 0) return Math.min(n, 86400);

  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const sec = Math.ceil((t - Date.now()) / 1000);
    return Math.min(Math.max(0, sec), 86400);
  }
  return null;
}

/** @param {number} ms */
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
