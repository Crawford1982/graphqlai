/**
 * Bug-bounty–oriented triage metadata (heuristic only — does not predict payouts or acceptance).
 *
 * Goal: improve manual prioritization by mapping findings to common program rubric axes and
 * typical outcomes, without overstating confidence.
 */

/**
 * @typedef {{
 *   payoutCorrelationScore: number,
 *   bountyAxes: string[],
 *   typicalProgramOutcome: string,
 *   validationEffort: 'low' | 'medium' | 'high',
 *   correlationNote: string,
 * }} BountyTriageFields
 */

const DISCLAIMER =
  'Heuristic triage score (1–10): higher means “often worth validating first” on typical API bounty programs — not payout odds or severity guarantees.';

/**
 * @param {Record<string, unknown>} f
 * @returns {Omit<BountyTriageFields, 'payoutCorrelationScore'> & { score: number }}
 */
function computeBountyFields(f) {
  const kind = String(f.kind || '');
  const title = String(f.title || '');
  const signalId = String(f.signalId || '');
  const checkerId = String(f.checkerId || '');
  const stress = /** @type {{ probe?: string, signal?: string } | undefined} */ (f.stress);

  /** @type {string[]} */
  const axes = [];
  let score = 5;
  /** @type {'low' | 'medium' | 'high'} */
  let effort = 'medium';
  let outcome =
    'Varies widely by program scope and business impact — confirm impact before submitting.';
  let note =
    'Confirm with minimal replay steps and program rules; graphqlai emits hypotheses, not verdicts.';

  // --- Principal / authorization shaped (high manual value if reproducible) ---
  if (checkerId === 'cross_principal_status_escalation') {
    axes.push('broken_access_control');
    score = 9;
    effort = 'medium';
    outcome =
      'If reproducible end-to-end outside test noise, often reviewed as authorization / privilege issues (severity depends on data accessed).';
    note = 'Escalation pattern (403 vs 200 across tokens) — document both principals and exact operation.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }
  if (checkerId === 'cross_principal_same_body') {
    axes.push('broken_access_control', 'data_isolation');
    score = 8;
    effort = 'medium';
    outcome =
      'Same response body across principals can indicate missing row-level isolation — payout depends on sensitivity of fields.';
    note = 'Differentiate benign shared public data vs protected user data using schema + business context.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }
  if (checkerId === 'cross_principal_field_diff') {
    axes.push('broken_access_control', 'data_isolation');
    score = 7;
    effort = 'high';
    outcome =
      'Shape differences across principals are common for correct authz — value is proving unauthorized access to others’ data.';
    note = 'You must show cross-tenant/user impact; different shapes alone are not always a vulnerability.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }

  // --- Regex bounty signals ---
  if (kind === 'bounty_signal' && signalId) {
    axes.push('implementation_disclosure');
    if (signalId === 'jwt_or_bearer_leak') {
      axes.push('credential_material');
      score = 9;
      effort = 'low';
      outcome =
        'Real token/key material in responses is often taken seriously if scope allows — many duplicates are false positives (cached examples).';
      note = 'Verify token validity, audience, and whether it grants access beyond the reporter account.';
      return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
    }
    if (signalId === 'sql_error_echo') {
      axes.push('injection_diagnostic');
      score = 8;
      effort = 'medium';
      outcome =
        'SQL dialect strings can support injection chains but are frequently rated down without proven extract/impact.';
      note = 'Pair with a minimal exploitable query path or clear data exposure per program rules.';
      return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
    }
    if (signalId === 'server_stack_trace') {
      axes.push('security_misconfiguration');
      score = 6;
      effort = 'low';
      outcome =
        'Often informational unless stack frames reveal exploitable internals or secrets — depends on program.';
      note = 'Redact before sharing; gather fixed vs baseline to show novelty.';
      return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
    }
    if (signalId === 'verbose_admin_debug') {
      score = 5;
      effort = 'low';
      outcome = 'Debug markers can be noise in staging — confirm production impact.';
      return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
    }
    if (signalId === 'graphql_introspection_hint') {
      axes.push('information_disclosure');
      score = 4;
      effort = 'low';
      outcome =
        'Many programs treat introspection as informational or out-of-scope unless paired with sensitive exposure.';
      note = 'Check program rules on schema disclosure and combine with sensitive types/fields if applicable.';
      return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
    }
    score = 6;
    outcome = 'Signal matched — validate uniqueness and impact against baseline noise.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }

  // --- Stress probes (availability / abuse-shaped) ---
  if (kind === 'stress_anomaly') {
    axes.push('availability', 'resource_consumption');
    const sig = stress?.signal || '';
    if (sig === 'multi_error_array') {
      score = 6;
      effort = 'medium';
      outcome =
        'Batch/array error shapes may support DoS narratives if impact is proven and in scope — often needs timing and cost evidence.';
      note = 'Programs differ on resource exhaustion; capture stable repro and measured impact.';
      return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
    }
    if (sig === 'divergence') {
      score = 6;
      effort = 'medium';
      outcome =
        'Routing or status divergence can be logic bugs or infra noise — payout needs a clear security story.';
      note = 'Correlate with authn/z or consistency expectations in the API contract.';
      return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
    }
    if (sig === 'depth_latency_ramp') {
      score = 4;
      effort = 'high';
      outcome =
        'Complexity abuse is frequently OOS or duplicated; large payout needs clear in-scope impact and stable repro.';
      note = 'Many programs cap or decline pure query complexity without demonstrated harm.';
      return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
    }
    score = 5;
    outcome = 'Stress anomaly — prioritize if your program explicitly covers resource exhaustion or complexity abuse.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }

  // --- GraphQL envelope / verbose errors ---
  if (kind === 'graphql_signal' || /Verbose GraphQL error/i.test(title)) {
    axes.push('information_disclosure');
    score = 5;
    effort = 'medium';
    outcome =
      'Verbose GraphQL errors help craft follow-on tests; alone they are often medium/low unless they leak secrets or bypass authz.';
    note = 'Use errors to refine a concrete impact path rather than submitting error text alone.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }

  // --- Plain triage (no kind set) ---
  if (title.includes('Sensitive pattern in body preview')) {
    axes.push('credential_material', 'data_exposure');
    score = 7;
    effort = 'low';
    outcome =
      'Sensitive regex hits need manual redaction review — real secrets can be high severity; fixtures and examples are common FPs.';
    note = 'Confirm not a password field in a demo response or client-side placeholder.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }
  if (title.includes('Possible auth anomaly')) {
    axes.push('broken_authentication');
    score = 7;
    effort = 'high';
    outcome =
      'Heuristic auth anomalies warrant manual authz proof — payout hinges on accessing protected operations or data.';
    note = 'Pair with alternate accounts and explicit forbidden actions per program.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }
  if (title.includes('Server error status')) {
    axes.push('availability', 'implementation_disclosure');
    score = 5;
    effort = 'medium';
    outcome = '5xx alone is rarely sufficient — combine with reproducible crash, data leak, or bypass.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }
  if (title.includes('Transport/timeout')) {
    axes.push('availability');
    score = 3;
    effort = 'high';
    outcome = 'Infrastructure noise unless tied to abuse — low standalone bounty correlation.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }

  // --- checker without specialist branch ---
  if (kind === 'checker') {
    axes.push('policy_check');
    score = 6;
    outcome = 'Review checker output in context — default moderate priority.';
    return { score, bountyAxes: axes, typicalProgramOutcome: outcome, validationEffort: effort, correlationNote: note };
  }

  return {
    score: Math.min(10, Math.max(1, score)),
    bountyAxes: axes.length ? axes : ['unclassified'],
    typicalProgramOutcome: outcome,
    validationEffort: effort,
    correlationNote: note,
  };
}

/**
 * @param {Record<string, unknown>} finding
 */
export function annotateFindingForBounty(finding) {
  const {
    score,
    bountyAxes,
    typicalProgramOutcome,
    validationEffort,
    correlationNote,
  } = computeBountyFields(finding);

  return {
    ...finding,
    payoutCorrelationScore: score,
    bountyAxes,
    typicalProgramOutcome,
    validationEffort,
    correlationNote,
  };
}

/**
 * @param {Array<Record<string, unknown>>} findings
 */
export function enrichFindingsWithBountyCorrelation(findings) {
  return findings.map((f) => annotateFindingForBounty(f));
}

/**
 * Top-level summary for JSON report (counts + ordering hint).
 *
 * @param {Array<Record<string, unknown>>} findings
 */
export function summarizeBountyCorrelation(findings) {
  const scored = findings.map((f) => ({
    f,
    s: Number(f.payoutCorrelationScore) || 0,
  }));
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, 5).map((x) => ({
    caseId: x.f.caseId,
    title: x.f.title,
    payoutCorrelationScore: x.f.payoutCorrelationScore,
    signalId: x.f.signalId,
    checkerId: x.f.checkerId,
  }));

  /** @type {Record<string, number>} */
  const axisCounts = {};
  for (const f of findings) {
    const axes = Array.isArray(f.bountyAxes) ? f.bountyAxes : [];
    for (const a of axes) {
      axisCounts[a] = (axisCounts[a] || 0) + 1;
    }
  }

  return {
    schemaVersion: 1,
    disclaimer: DISCLAIMER,
    axisCounts,
    suggestedManualOrder: top,
    meanScore:
      findings.length === 0
        ? null
        : Math.round(
            (findings.reduce((acc, f) => acc + (Number(f.payoutCorrelationScore) || 0), 0) / findings.length) * 10
          ) / 10,
  };
}
