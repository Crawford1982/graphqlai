import { fingerprintBody } from './baseline.js';

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
    if (Number(p.status) !== 200 || Number(a.status) !== 200) continue;
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
    }
  }
  return out;
}
