/**
 * Lightweight HTTP POST probes against the GraphQL endpoint (not LLM).
 */

import { assertUrlInScope } from '../safety/scopePolicy.js';

/**
 * @param {string} endpointUrl
 * @param {{
 *   timeoutMs: number,
 *   authHeader?: string | null,
 *   scopePolicy?: import('../safety/scopePolicy.js').ScopePolicy | null,
 *   rateLimiter?: { acquire: () => Promise<void> },
 * }} opts
 */
export async function probeGraphqlEndpoint(endpointUrl, opts) {
  const scopeCheck = assertUrlInScope(endpointUrl, opts.scopePolicy ?? null);
  if (!scopeCheck.ok) {
    return { probes: [], introspectionResponseLikely: false };
  }

  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (opts.authHeader) {
    headers.Authorization = opts.authHeader.startsWith('Bearer ')
      ? opts.authHeader
      : `Bearer ${opts.authHeader}`;
  }

  const probeBodies = [
    { name: 'typename_probe', queryBody: { query: '{ __typename }' } },
    { name: 'min_introspection', queryBody: { query: '{ __schema { queryType { name } } }' } },
  ];

  /** @type {Array<{ name: string, queryBody: Record<string, unknown>, status: number | null, ok: boolean, bodyPreview: string, elapsedMs: number, error?: string }>} */
  const probes = [];

  for (const b of probeBodies) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs);
    const started = Date.now();
    await opts.rateLimiter?.acquire?.();

    try {
      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(b.queryBody),
        redirect: 'manual',
        signal: ctrl.signal,
      });
      const text = await res.text();
      clearTimeout(t);
      const preview = text.length > 2048 ? text.slice(0, 2048) : text;
      probes.push({
        name: b.name,
        queryBody: b.queryBody,
        status: res.status,
        ok: res.ok,
        bodyPreview: preview,
        elapsedMs: Date.now() - started,
      });
    } catch (e) {
      clearTimeout(t);
      probes.push({
        name: b.name,
        queryBody: b.queryBody,
        status: null,
        ok: false,
        bodyPreview: '',
        elapsedMs: Date.now() - started,
        error: /** @type {Error} */ (e).message || String(e),
      });
    }
  }

  const intro = probes.find((p) => p.name === 'min_introspection');
  let introspectionResponseLikely = false;
  if (intro?.bodyPreview) {
    try {
      const j = JSON.parse(introBodySafe(intro.bodyPreview));
      introspectionResponseLikely = Boolean(
        j?.data?.__schema?.queryType?.name ||
          (Array.isArray(j?.errors) &&
            j.errors.some(
              (e) => typeof e?.message === 'string' && /introspection/i.test(e.message)
            ))
      );
    } catch {
      introspectionResponseLikely = false;
    }
  }

  return { probes, introspectionResponseLikely };
}

/** @param {string} text */
function introBodySafe(text) {
  const i = text.indexOf('{');
  return i >= 0 ? text.slice(i) : text;
}
