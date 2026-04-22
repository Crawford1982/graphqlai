/**
 * Build operator-grade submission bundles from a graphqlai JSON report.
 * Deterministic only — no LLM. `submissionReady` is conservative.
 */

import { graphqlErrorMessages } from '../schema/leakHeuristics.js';
import { redactSecrets } from './redact.js';

/**
 * @typedef {{
 *   schemaVersion: '1.0.0',
 *   id: string,
 *   source: { findingIndex: number, caseId: string|null, kind: string, checkerId?: string|null, signalId?: string|null },
 *   readiness: 'hypothesis'|'confirmed_candidate',
 *   submissionReady: boolean,
 *   submissionReadyReason: string,
 *   title: string,
 *   category: string,
 *   severityHint: string|null,
 *   confidence: number|null,
 *   payoutCorrelationScore: number|null,
 *   evidencePairKind: 'two_principals'|'single_operation'|'batch_compare'|'depth_probe'|'information_disclosure',
 *   diffSummary: string,
 *   evidenceA: EvidencePacket|null,
 *   evidenceB: EvidencePacket|null,
 *   operatorChecklist: string[],
 *   escalationHints: string[],
 *   repro: { notes: string, primaryCurlFile: string|null, alternateCurlFile: string|null },
 *   programNotes: { redaction: string, scope: string },
 * }} SubmissionBundleV1
 */

/**
 * @typedef {{
 *   role: 'primary'|'alternate'|'single'|'observation',
 *   caseId: string|null,
 *   status: number|null,
 *   elapsedMs?: number|null,
 *   replayCurl: string|null,
 *   bodyPreviewSnippet: string|null,
 *   graphqlErrorMessages: string[],
 * }} EvidencePacket
 */

/**
 * @param {Record<string, unknown>} row
 * @param {'primary'|'alternate'|'single'|'observation'} role
 * @returns {EvidencePacket|null}
 */
function rowToPacket(row, role) {
  if (!row || typeof row !== 'object') return null;
  const body = String(row.bodyPreview || '');
  return {
    role,
    caseId: row.caseId != null ? String(row.caseId) : null,
    status: row.status != null ? Number(row.status) : null,
    elapsedMs: row.elapsedMs != null ? Number(row.elapsedMs) : null,
    replayCurl: row.replayCurl ? redactSecrets(String(row.replayCurl)) : null,
    bodyPreviewSnippet: body ? redactSecrets(body.slice(0, 1500)) : null,
    graphqlErrorMessages: graphqlErrorMessages(body).slice(0, 8),
  };
}

/**
 * @param {Record<string, unknown>} f
 */
function inferCategory(f) {
  const checkerId = String(f.checkerId || '');
  const signalId = String(f.signalId || '');
  const title = String(f.title || '');
  if (checkerId.startsWith('cross_principal')) return 'broken_access_control';
  if (signalId === 'jwt_or_bearer_leak') return 'credential_exposure';
  if (signalId === 'sql_error_echo') return 'injection_diagnostic';
  if (signalId === 'server_stack_trace') return 'information_disclosure';
  if (String(f.kind) === 'stress_anomaly') return 'availability_signal';
  if (/Sensitive pattern/i.test(title)) return 'sensitive_data_preview';
  if (/Verbose GraphQL/i.test(title)) return 'information_disclosure';
  return 'graphql_signal';
}

/**
 * @param {Record<string, unknown>} f
 */
function defaultEscalationHints(category, f) {
  const kind = String(f.kind || '');
  const stress = /** @type {{ probe?: string }} */ (f.stress || {});
  /** @type {string[]} */
  const hints = [];
  if (category === 'broken_access_control') {
    hints.push(
      'If IDs appear in variables, retry with adjacent resource IDs for the same operation.',
      'Check sibling mutations (update/delete) on the same GraphQL type.',
      'Confirm impact with data the program classifies as sensitive (PII, billing, admin).'
    );
  }
  if (kind === 'stress_anomaly' && stress.probe === 'GRAPHQL_BATCH_ALIAS') {
    hints.push(
      'Compare batch POST vs single-operation POST under program DoS / abuse rules.',
      'Capture stable timing under fixed concurrency to support resource-exhaustion narratives.'
    );
  }
  if (kind === 'stress_anomaly' && stress.probe === 'GRAPHQL_DEPTH_LADDER') {
    hints.push(
      'Correlate depth with resolver cost; check program rules on query complexity / cost limits.'
    );
  }
  if (hints.length === 0) {
    hints.push(
      'Correlate with application roles and object ownership in the schema.',
      'Attach minimal repro only; redact tokens and personal data before submission.'
    );
  }
  return hints;
}

/**
 * @param {Record<string, unknown>} f
 * @param {Map<string, Record<string, unknown>>} byCase
 * @param {number} findingIndex
 * @returns {SubmissionBundleV1|null}
 */
function bundleFromPrincipalChecker(f, byCase, findingIndex) {
  const ids = /** @type {string[]} */ (Array.isArray(f.evidenceCaseIds) ? f.evidenceCaseIds : []);
  if (ids.length < 2) return null;
  const rowP = byCase.get(ids[0]);
  const rowA = byCase.get(ids[1]);
  const ep =
    String(ids[1]).endsWith(':authAlt') || String(ids[0]).endsWith(':authAlt')
      ? /** @type {const} */ ('two_principals')
      : /** @type {const} */ ('two_principals');

  const evP = rowP ? rowToPacket(rowP, 'primary') : null;
  const evA = rowA ? rowToPacket(rowA, 'alternate') : null;
  const checkerId = String(f.checkerId || '');
  const bothCurl = Boolean(evP?.replayCurl && evA?.replayCurl);
  const escalation = checkerId === 'cross_principal_status_escalation';
  const submissionReady = Boolean(bothCurl && escalation);
  const submissionReadyReason = submissionReady
    ? 'Paired replay curls with opposing HTTP status (403 vs 200) across principals — verify impact and scope.'
    : bothCurl
      ? 'Paired curls present; confirm whether shared or differential data constitutes unauthorized access under program rules.'
      : 'Missing replay curl on one side — capture manually before submitting.';

  /** @type {string[]} */
  const checklist = [
    'Confirm both principals are in-scope identities allowed by the engagement.',
    'Remove or replace live secrets in any pasted evidence.',
    'State business impact (what data or action was exposed), not only HTTP status.',
  ];
  if (!bothCurl) checklist.unshift('Export full replayCurl for both principals from raw campaign output if missing here.');

  const category = inferCategory(f);
  const readiness = escalation ? 'confirmed_candidate' : 'hypothesis';

  return {
    schemaVersion: '1.0.0',
    id: makeBundleId(findingIndex, String(f.title || 'finding')),
    source: {
      findingIndex,
      caseId: f.caseId != null ? String(f.caseId) : null,
      kind: String(f.kind || ''),
      checkerId: f.checkerId != null ? String(f.checkerId) : null,
      signalId: null,
    },
    readiness,
    submissionReady,
    submissionReadyReason,
    title: String(f.title || 'Finding'),
    category,
    severityHint: f.severity != null ? String(f.severity) : null,
    confidence: typeof f.confidence === 'number' ? f.confidence : null,
    payoutCorrelationScore:
      typeof f.payoutCorrelationScore === 'number' ? Math.round(f.payoutCorrelationScore) : null,
    evidencePairKind: ep,
    diffSummary: String(f.detail || f.title || ''),
    evidenceA: evP,
    evidenceB: evA,
    operatorChecklist: checklist,
    escalationHints: defaultEscalationHints(category, f),
    repro: {
      notes:
        'Run scripts in submission pack folder or paste replay curls into GraphQL client. Use separate shells/sessions for each principal.',
      primaryCurlFile: 'repro-primary.sh',
      alternateCurlFile: 'repro-alternate.sh',
    },
    programNotes: {
      redaction: 'This bundle applies heuristic redaction only. You are responsible for final secrets hygiene.',
      scope: 'Submit only within authorized program scope and disclosure channels.',
    },
  };
}

/**
 * @param {Record<string, unknown>} f
 * @param {Map<string, Record<string, unknown>>} byCase
 * @param {number} findingIndex
 */
function bundleFromSingleFinding(f, byCase, findingIndex) {
  const cid = f.caseId != null ? String(f.caseId) : null;
  const row = cid ? byCase.get(cid) : null;
  const kind = String(f.kind || '');
  const stress = f.stress && typeof f.stress === 'object' ? /** @type {Record<string, unknown>} */ (f.stress) : {};

  /** @type {'single_operation'|'batch_compare'|'depth_probe'|'information_disclosure'} */
  let pairKind = 'single_operation';
  if (kind === 'stress_anomaly') {
    if (stress.probe === 'GRAPHQL_BATCH_ALIAS') pairKind = 'batch_compare';
    else if (stress.probe === 'GRAPHQL_DEPTH_LADDER') pairKind = 'depth_probe';
  }
  if (kind === 'graphql_signal' || kind === 'bounty_signal') pairKind = 'information_disclosure';

  const ev = row ? rowToPacket(row, 'single') : null;
  const category = inferCategory(f);
  const submissionReady = false;
  const submissionReadyReason =
    'Single-request signal — confirm impact, duplication, and program expectations before submission.';

  /** @type {string[]} */
  const checklist = [
    'Treat as hypothesis until reproduced in a clean session.',
    'Capture stable before/after or compared-to-baseline if claiming impact.',
    'Check if similar noise appears on benign routes (false positive triage).',
  ];

  return {
    schemaVersion: '1.0.0',
    id: makeBundleId(findingIndex, String(f.title || 'finding')),
    source: {
      findingIndex,
      caseId: cid,
      kind,
      checkerId: f.checkerId != null ? String(f.checkerId) : null,
      signalId: f.signalId != null ? String(f.signalId) : null,
    },
    readiness: 'hypothesis',
    submissionReady,
    submissionReadyReason,
    title: String(f.title || 'Finding'),
    category,
    severityHint: f.severity != null ? String(f.severity) : null,
    confidence: typeof f.confidence === 'number' ? f.confidence : null,
    payoutCorrelationScore:
      typeof f.payoutCorrelationScore === 'number' ? Math.round(f.payoutCorrelationScore) : null,
    evidencePairKind: pairKind,
    diffSummary: String(f.detail || f.title || ''),
    evidenceA: ev,
    evidenceB: null,
    operatorChecklist: checklist,
    escalationHints: defaultEscalationHints(category, f),
    repro: {
      notes: row?.replayCurl
        ? 'Use repro-single.sh or paste replayCurl into your HTTP client.'
        : 'No replay curl on row — reconstruct from case metadata or re-run campaign.',
      primaryCurlFile: row?.replayCurl ? 'repro-single.sh' : null,
      alternateCurlFile: null,
    },
    programNotes: {
      redaction: 'Heuristic redaction only; verify before external sharing.',
      scope: 'Authorized testing only.',
    },
  };
}

/**
 * @param {number} idx
 * @param {string} title
 */
function makeBundleId(idx, title) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'finding';
  return `finding-${String(idx + 1).padStart(3, '0')}-${slug}`;
}

/**
 * @param {Record<string, unknown>} report
 * @returns {SubmissionBundleV1[]}
 */
export function buildSubmissionBundlesFromReport(report) {
  const results = Array.isArray(report.results) ? report.results : [];
  /** @type {Map<string, Record<string, unknown>>} */
  const byCase = new Map();
  for (const r of results) {
    const row = /** @type {Record<string, unknown>} */ (r);
    if (row.caseId) byCase.set(String(row.caseId), row);
  }

  const findings = Array.isArray(report.findings) ? report.findings : [];
  /** @type {SubmissionBundleV1[]} */
  const out = [];

  findings.forEach((raw, findingIndex) => {
    const f = /** @type {Record<string, unknown>} */ (raw);
    const title = String(f.title || '');
    if (/Transport\/timeout/i.test(title) && String(f.kind || '') === '') {
      return;
    }
    if (String(f.kind) === 'checker' && Array.isArray(f.evidenceCaseIds) && f.evidenceCaseIds.length >= 2) {
      const b = bundleFromPrincipalChecker(f, byCase, findingIndex);
      if (b) out.push(b);
      return;
    }
    out.push(bundleFromSingleFinding(f, byCase, findingIndex));
  });

  out.sort((a, b) => {
    const pa = a.payoutCorrelationScore ?? 0;
    const pb = b.payoutCorrelationScore ?? 0;
    if (pb !== pa) return pb - pa;
    if (a.submissionReady !== b.submissionReady) return a.submissionReady ? -1 : 1;
    return a.source.findingIndex - b.source.findingIndex;
  });

  return out.map((b, i) => ({
    ...b,
    id: makeBundleId(i, b.title),
  }));
}
