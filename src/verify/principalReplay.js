import { fingerprintBody } from './baseline.js';
import { parseGraphqlEnvelope } from '../schema/leakHeuristics.js';

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
    const pd = parseGraphqlEnvelope(String(p.bodyPreview || '')).data || {};
    const ad = parseGraphqlEnvelope(String(a.bodyPreview || '')).data || {};
    const pkeys = JSON.stringify(Object.keys(pd).sort());
    const akeys = JSON.stringify(Object.keys(ad).sort());
    if (pkeys !== akeys) {
      out.push({
        kind: 'checker',
        checkerId: 'cross_principal_field_diff',
        severity: 'medium',
        title: 'GraphQL top-level data fields differ across principals',
        detail: 'Primary and alternate responses expose different top-level GraphQL data fields.',
        caseId: base,
        evidenceCaseIds: [String(p.caseId), String(a.caseId)],
      });
    }
  }
  return out;
}
