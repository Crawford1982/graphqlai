/**
 * GraphQL-specific anomaly hints for Milestone 3 probes (batch/array + depth ladder).
 * Uses only execution rows — no extra HTTP. Complements generic triage (timeouts, sensitive regex).
 */

/** @typedef {{ caseId?: string, family?: string, status?: number|null, elapsedMs?: number, bodyPreview?: string, error?: string|null }} ExecRow */

/**
 * @param {ExecRow[]} execResults
 * @returns {Array<Record<string, unknown>>}
 */
export function analyzeStressProbeAnomalies(execResults) {
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  const byId = new Map(execResults.map((r) => [String(r.caseId || ''), r]));

  // --- Batch / alias array bodies: compare to single-operation sibling row ---
  for (const r of execResults) {
    if (r.family !== 'GRAPHQL_BATCH_ALIAS' || r.error) continue;
    const cid = String(r.caseId || '');
    if (!cid.endsWith(':batch')) continue;
    const baseId = cid.slice(0, -':batch'.length);
    const base = byId.get(baseId);
    if (!base || base.error) continue;

    const body = String(r.bodyPreview || '');
    const baseMs = Math.max(1, Number(base.elapsedMs) || 1);
    const batchMs = Number(r.elapsedMs) || 0;
    const ratio = batchMs / baseMs;

    const multiErr = (body.match(/"errors"/g) || []).length >= 2;
    const arrayEnvelope = body.trimStart().startsWith('[');

    let flaggedMulti = false;
    if (multiErr && arrayEnvelope) {
      flaggedMulti = true;
      out.push({
        kind: 'stress_anomaly',
        severity: 'medium',
        title: 'GraphQL batch probe: multiple error objects in array response',
        detail:
          'Batch POST returned a JSON array with multiple GraphQL error payloads — review for amplification / parser mismatch vs single-operation baseline.',
        caseId: r.caseId,
        url: r.url,
        stress: { probe: 'GRAPHQL_BATCH_ALIAS', signal: 'multi_error_array', baseCaseId: baseId },
      });
    }

    const statusDivergence =
      base.status != null &&
      r.status != null &&
      Math.floor(Number(base.status) / 100) !== Math.floor(Number(r.status) / 100);

    if (!flaggedMulti && (statusDivergence || (ratio >= 4 && batchMs >= 800))) {
      out.push({
        kind: 'stress_anomaly',
        severity: 'medium',
        title: 'GraphQL batch probe: latency or status divergence vs single operation',
        detail: `batch elapsed≈${batchMs}ms vs single≈${Number(base.elapsedMs)}ms (ratio≈${ratio.toFixed(
          1
        )}); statuses single=${base.status} batch=${r.status}`,
        caseId: r.caseId,
        url: r.url,
        stress: {
          probe: 'GRAPHQL_BATCH_ALIAS',
          signal: 'divergence',
          baseCaseId: baseId,
          latencyRatio: Math.round(ratio * 100) / 100,
        },
      });
    }
  }

  // --- Depth ladder: rising cost with synthetic nesting ---
  const depthRe = /^gql:depth:([^:]+):(\d+):\d+$/;
  /** @type {Map<string, Array<{ depth: number, ms: number, status: number|null, caseId: string }>>} */
  const byField = new Map();

  for (const r of execResults) {
    if (r.family !== 'GRAPHQL_DEPTH_LADDER' || r.error) continue;
    const m = String(r.caseId || '').match(depthRe);
    if (!m) continue;
    const fieldName = m[1];
    const depth = Number(m[2]);
    const ms = Number(r.elapsedMs) || 0;
    const st = r.status != null ? Number(r.status) : null;
    if (!byField.has(fieldName)) byField.set(fieldName, []);
    byField.get(fieldName)?.push({ depth, ms, status: st, caseId: String(r.caseId) });
  }

  for (const [fieldName, rows] of byField) {
    const ok = rows.filter((x) => x.status === 200 && x.ms > 0);
    if (ok.length < 2) continue;
    ok.sort((a, b) => a.depth - b.depth);
    const minMs = Math.min(...ok.map((x) => x.ms));
    const maxRow = ok.reduce((a, b) => (a.ms >= b.ms ? a : b));
    const ratio = maxRow.ms / Math.max(1, minMs);
    if (ratio >= 5 && maxRow.ms >= 400) {
      out.push({
        kind: 'stress_anomaly',
        severity: 'low',
        title: 'GraphQL depth ladder: sharp latency increase at deeper nesting',
        detail: `field "${fieldName}" depth=${maxRow.depth} took ~${maxRow.ms}ms vs minimum ~${minMs}ms across ladder (ratio≈${ratio.toFixed(
          1
        )}) — possible recursion/DoS sensitivity (verify against program scope).`,
        caseId: maxRow.caseId,
        stress: {
          probe: 'GRAPHQL_DEPTH_LADDER',
          signal: 'depth_latency_ramp',
          fieldName,
          depth: maxRow.depth,
          latencyRatio: Math.round(ratio * 100) / 100,
        },
      });
    }
  }

  return dedupeStressFindings(out);
}

/**
 * @param {Array<Record<string, unknown>>} rows
 */
function dedupeStressFindings(rows) {
  const seen = new Set();
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const f of rows) {
    const key = `${f.caseId}:${f.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}
