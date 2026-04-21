/**
 * Stable ordering so high-signal GraphQL findings appear before generic heuristic noise on busy routes.
 */

/**
 * Lower score sorts first (more important).
 * @param {Record<string, unknown>} f
 */
export function findingReportPriority(f) {
  const kind = String(f.kind || '');
  const title = String(f.title || '');
  const sev = String(f.severity || '');

  if (kind === 'bounty_signal') return 100;
  if (kind === 'stress_anomaly') return 110;
  if (kind === 'checker' || kind === 'principal_overlap') return 115;

  if (kind === 'graphql_signal' && /verbose graphql error/i.test(title)) return 350;

  if (title.includes('Sensitive pattern in body preview')) return 400;
  if (title.includes('Transport/timeout')) return 440;
  if (title.includes('Server error status')) return 320;

  if (sev === 'high') return 300;
  if (sev === 'medium') return 340;
  if (sev === 'low') return 360;

  return 380;
}

/**
 * @template T
 * @param {T[]} findings
 * @returns {T[]}
 */
export function prioritizeFindingsForReport(findings) {
  const scored = findings.map((f, i) => ({
    f,
    i,
    p: findingReportPriority(/** @type {Record<string, unknown>} */ (f)),
    conf: Number(/** @type {{ confidence?: number }} */ (f).confidence ?? 0),
  }));
  scored.sort((a, b) => {
    if (a.p !== b.p) return a.p - b.p;
    if (b.conf !== a.conf) return b.conf - a.conf;
    return a.i - b.i;
  });
  return scored.map((x) => x.f);
}
