import { fingerprintBody } from './baseline.js';
import { parseGraphqlEnvelope } from '../schema/leakHeuristics.js';

/**
 * Structural fingerprint for `data` payloads (nested keys + scalar kinds; stable sort).
 *
 * @param {unknown} value
 * @param {number} [depth]
 */
export function graphqlDataShapeFingerprint(value, depth = 0) {
  if (depth > 8) return '"maxdepth"';
  if (value === null || value === undefined) return 'null';
  const t = typeof value;
  if (t === 'boolean') return 'bool';
  if (t === 'number') return Number.isInteger(value) ? 'int' : 'float';
  if (t === 'string') return 'str';
  if (Array.isArray(value)) {
    if (!value.length) return 'arr:0';
    const inner = graphqlDataShapeFingerprint(value[0], depth + 1);
    return `arr:${inner}`;
  }
  if (t === 'object') {
    const o = /** @type {Record<string, unknown>} */ (value);
    const keys = Object.keys(o).sort();
    const parts = keys.map((k) => `"${k}":${graphqlDataShapeFingerprint(o[k], depth + 1)}`);
    return `{${parts.join(',')}}`;
  }
  return 'unknown';
}

/**
 * Compare primary/alt responses for the same case lineage.
 */
export function checkCrossPrincipalOverlap(execResults) {
  const byBase = new Map();
  for (const raw of execResults) {
    const r = /** @type {Record<string, unknown>} */ (raw);
    const cid = String(r.caseId || '');
    if (!cid) continue;
    const base = cid.replace(/:authAlt$/, '');
    const cur = byBase.get(base) || {};
    if (cid.endsWith(':authAlt')) cur.alt = r;
    else cur.primary = r;
    byBase.set(base, cur);
  }

  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const [base, pair] of byBase.entries()) {
    if (!pair.primary || !pair.alt) continue;
    const p = pair.primary;
    const a = pair.alt;
    const ps = Number(p.status);
    const as = Number(a.status);
    if (ps === 200 && as === 403) {
      continue; // expected least privilege behavior
    }
    if (ps === 403 && as === 200) {
      out.push({
        kind: 'checker',
        checkerId: 'cross_principal_status_escalation',
        severity: 'high',
        title: 'Possible privilege escalation across principals',
        detail: 'Primary returned 403 while alternate principal returned 200.',
        caseId: base,
        evidenceCaseIds: [String(p.caseId), String(a.caseId)],
      });
      continue;
    }
    if (ps !== 200 || as !== 200) continue;
    const fp = fingerprintBody(String(p.bodyPreview || ''));
    const fa = fingerprintBody(String(a.bodyPreview || ''));
    if (fp && fa && fp === fa) {
      out.push({
        kind: 'checker',
        checkerId: 'cross_principal_same_body',
        severity: 'high',
        title: 'Same GraphQL response body across principals',
        detail: 'Primary and alternate Authorization produced the same body fingerprint.',
        caseId: base,
        evidenceCaseIds: [String(p.caseId), String(a.caseId)],
      });
      continue;
    }

    // Field-level diff: same status but different visible data shape.
    const pd = parseGraphqlEnvelope(String(p.bodyPreview || '')).data ?? {};
    const ad = parseGraphqlEnvelope(String(a.bodyPreview || '')).data ?? {};
    const pf = graphqlDataShapeFingerprint(pd);
    const af = graphqlDataShapeFingerprint(ad);
    if (pf !== af) {
      out.push({
        kind: 'checker',
        checkerId: 'cross_principal_field_diff',
        severity: 'medium',
        title: 'GraphQL response data shape differs across principals',
        detail:
          'Primary and alternate principals received different nested data shapes under `data` (keys and/or scalar kinds).',
        caseId: base,
        evidenceCaseIds: [String(p.caseId), String(a.caseId)],
      });
    }
  }
  return out;
}
