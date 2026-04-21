/**
 * HTTP transport — executor owns all network I/O (no LLM).
 */

import fs from 'fs';
import path from 'path';

import { assertUrlInScope, checkRedirectPolicy } from '../safety/scopePolicy.js';
import { parseRetryAfterSeconds, sleep } from './retryAfter.js';

/**
 * @typedef {import('../types.js').FuzzCase} FuzzCase
 */

/**
 * @param {FuzzCase[]} cases
 * @param {{
 *   concurrency: number,
 *   timeoutMs: number,
 *   authHeader?: string | null,
 *   extraHeaders?: Record<string, string>,
 *   cookieHeader?: string | null,
 *   captureFullBody?: boolean,
 *   scopePolicy?: import('../safety/scopePolicy.js').ScopePolicy | null,
 *   rateLimiter?: { acquire: () => Promise<void> },
 *   maxBodyPreviewChars?: number,
 *   respectRetryAfter?: boolean,
 *   max429Retries?: number,
 *   maxRetryAfterMs?: number,
 * }} opts
 */
export async function executeCases(cases, opts) {
  return runPool(cases, opts.concurrency, (c) => runOne(c, opts));
}

/**
 * @param {FuzzCase} c
 * @param {Omit<Parameters<typeof executeCases>[1], 'concurrency'>} opts
 */
export async function executeOne(c, opts) {
  return runOne(c, opts);
}

/**
 * @param {FuzzCase} c
 * @param {Omit<Parameters<typeof executeCases>[1], 'concurrency'>} opts
 */
function mergeTransportHeaders(c, opts) {
  const headers = { ...(c.headers || {}) };
  const extra = opts.extraHeaders && typeof opts.extraHeaders === 'object' ? opts.extraHeaders : {};
  Object.assign(headers, extra);
  if (opts.cookieHeader && !headers.Cookie && !headers.cookie) {
    headers.Cookie = opts.cookieHeader;
  }
  if (opts.authHeader && !c.omitAuth) {
    if (!headers.Authorization && !headers.authorization) {
      headers.Authorization = opts.authHeader.startsWith('Bearer ')
        ? opts.authHeader
        : `Bearer ${opts.authHeader}`;
    }
  }
  return headers;
}

async function runOne(c, opts) {
  const previewCap = Math.min(
    Math.max(512, opts.maxBodyPreviewChars ?? 8192),
    2_000_000
  );
  const headers = mergeTransportHeaders(c, opts);

  let url = c.url;
  if (c.meta && c.meta.query) {
    const u = new URL(url);
    for (const [k, v] of Object.entries(c.meta.query)) u.searchParams.set(k, String(v));
    url = u.toString();
  }

  const scopeCheck = assertUrlInScope(url, opts.scopePolicy);
  if (!scopeCheck.ok) {
    return {
      caseId: c.id,
      family: c.family,
      method: c.method || 'GET',
      url,
      status: null,
      elapsedMs: 0,
      headers: {},
      bodyPreview: '',
      bodyBytes: 0,
      error: `out_of_scope:${scopeCheck.reason}`,
    };
  }

  await opts.rateLimiter?.acquire?.();

  /** @type {string | undefined} */
  let body;
  if (c.meta && c.meta.jsonBody !== undefined) {
    body =
      typeof c.meta.jsonBody === 'string'
        ? c.meta.jsonBody
        : JSON.stringify(c.meta.jsonBody);
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = c.meta.contentType || 'application/json';
    }
  }

  const started = Date.now();
  const maxRetries = Math.max(0, Number(opts.max429Retries ?? 1));
  const respect429 = Boolean(opts.respectRetryAfter);
  const maxDelayMs = Math.min(Math.max(0, Number(opts.maxRetryAfterMs ?? 60000)), 300000);

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let outerTimer;

  try {
    let ctrl = new AbortController();
    outerTimer = setTimeout(() => ctrl.abort(), opts.timeoutMs);

    /** @type {Response} */
    let res = await fetch(url, {
      method: c.method || 'GET',
      headers,
      redirect: 'manual',
      signal: ctrl.signal,
      ...(body !== undefined ? { body } : {}),
    });

    let retried429 = 0;
    while (
      res.status === 429 &&
      respect429 &&
      retried429 < maxRetries
    ) {
      await res.text();
      clearTimeout(outerTimer);
      const sec = parseRetryAfterSeconds(res.headers);
      const delayMs = Math.min(Math.max(0, (sec ?? 1) * 1000), maxDelayMs);
      await sleep(delayMs);
      retried429++;
      ctrl = new AbortController();
      outerTimer = setTimeout(() => ctrl.abort(), opts.timeoutMs);
      res = await fetch(url, {
        method: c.method || 'GET',
        headers,
        redirect: 'manual',
        signal: ctrl.signal,
        ...(body !== undefined ? { body } : {}),
      });
    }

    const rd = checkRedirectPolicy(url, res.status, res.headers, opts.scopePolicy);
    if (!rd.ok) {
      const bodyText = await res.text();
      clearTimeout(outerTimer);
      return {
        caseId: c.id,
        family: c.family,
        method: c.method || 'GET',
        url,
        status: res.status,
        elapsedMs: Date.now() - started,
        headers: sanitizeHeaders(Object.fromEntries(res.headers)),
        bodyPreview: bodyText.slice(0, previewCap),
        bodyBytes: Buffer.byteLength(bodyText, 'utf8'),
        error: `redirect_policy:${rd.reason}${rd.location ? ` → ${rd.location}` : ''}`,
        ...(res.status === 429 ? { retryAfterSec: parseRetryAfterSeconds(res.headers) } : {}),
        ...(retried429 > 0 ? { retriedAfter429: retried429 } : {}),
      };
    }

    const bodyText = await res.text();
    clearTimeout(outerTimer);
    const elapsed = Date.now() - started;

    const cap = Boolean(opts.captureFullBody);
    /** @type {Record<string, unknown>} */
    const row = {
      caseId: c.id,
      family: c.family,
      method: c.method || 'GET',
      url,
      status: res.status,
      elapsedMs: elapsed,
      headers: sanitizeHeaders(Object.fromEntries(res.headers)),
      bodyPreview: bodyText.slice(0, previewCap),
      ...(cap ? { fullBody: bodyText } : {}),
      bodyBytes: Buffer.byteLength(bodyText, 'utf8'),
      error: null,
    };
    if (res.status === 429) {
      row.retryAfterSec = parseRetryAfterSeconds(res.headers);
    }
    if (retried429 > 0) row.retriedAfter429 = retried429;
    return row;
  } catch (e) {
    if (outerTimer) clearTimeout(outerTimer);
    return {
      caseId: c.id,
      family: c.family,
      method: c.method || 'GET',
      url: c.url,
      status: null,
      elapsedMs: Date.now() - started,
      headers: {},
      bodyPreview: '',
      bodyBytes: 0,
      error: /** @type {Error} */ (e).message,
    };
  }
}

function sanitizeHeaders(h) {
  const out = { ...h };
  for (const k of Object.keys(out)) {
    if (/auth|cookie|token|secret/i.test(k)) out[k] = '[redacted]';
  }
  return out;
}

async function runPool(items, concurrency, worker) {
  /** @type {unknown[]} */
  const results = new Array(items.length);
  let next = 0;

  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }

  const n = Math.max(1, Math.min(concurrency, items.length || 1));
  await Promise.all(Array.from({ length: n }, () => runner()));
  return results;
}

export function ensureOutputDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  return path.resolve(dir);
}
