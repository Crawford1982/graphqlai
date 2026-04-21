/**
 * Shared HTTP transport options (scope, rate limit).
 */

import { createRateLimiter } from './rateLimiter.js';

/**
 * @param {{
 *   timeoutMs: number,
 *   authHeader?: string | null,
 *   extraHeaders?: Record<string, string>,
 *   cookieHeader?: string | null,
 *   scopePolicy?: import('./scopePolicy.js').ScopePolicy | null,
 *   maxRps?: number,
 *   respectRetryAfter?: boolean,
 *   max429Retries?: number,
 *   maxRetryAfterMs?: number,
 * }} cfg
 */
export function buildTransportOpts(cfg) {
  return {
    timeoutMs: cfg.timeoutMs,
    authHeader: cfg.authHeader ?? null,
    extraHeaders: cfg.extraHeaders && typeof cfg.extraHeaders === 'object' ? cfg.extraHeaders : {},
    cookieHeader: cfg.cookieHeader ?? null,
    scopePolicy: cfg.scopePolicy ?? null,
    rateLimiter: createRateLimiter(cfg.maxRps ?? 0),
    respectRetryAfter: Boolean(cfg.respectRetryAfter),
    max429Retries:
      cfg.max429Retries !== undefined ? Math.max(0, Number(cfg.max429Retries)) : 1,
    maxRetryAfterMs:
      cfg.maxRetryAfterMs !== undefined ? Math.max(0, Number(cfg.maxRetryAfterMs)) : 60000,
  };
}
