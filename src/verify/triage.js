/**
 * Lightweight heuristic triage over execution rows (no LLM).
 */

const SENSITIVE = /password|secret|api_key|apikey|BEGIN RSA PRIVATE KEY/i;

/** @param {unknown[]} results */
export function triageResults(results) {
  /** @type {Array<Record<string, unknown>>} */
  const findings = [];

  for (const r of results) {
    if (r.error) {
      findings.push({
        severity: 'info',
        title: 'Transport/timeout',
        detail: r.error,
        caseId: r.caseId,
        url: r.url,
      });
      continue;
    }

    if (r.status && r.status >= 500) {
      findings.push({
        severity: 'high',
        title: 'Server error status',
        detail: `HTTP ${r.status}`,
        caseId: r.caseId,
        url: r.url,
      });
      continue;
    }

    if (r.family === 'AUTH_BYPASS' && r.status === 200 && r.bodyPreview?.length > 30) {
      findings.push({
        severity: 'medium',
        title: 'Possible auth anomaly',
        detail: '200 response on auth-focused case — verify manually',
        caseId: r.caseId,
        url: r.url,
      });
    }

    if (SENSITIVE.test(String(r.bodyPreview || ''))) {
      findings.push({
        severity: 'high',
        title: 'Sensitive pattern in body preview',
        detail: 'Heuristic match in response text (redact before sharing)',
        caseId: r.caseId,
        url: r.url,
      });
    }
  }

  return findings;
}
