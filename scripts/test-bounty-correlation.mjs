import {
  annotateFindingForBounty,
  summarizeBountyCorrelation,
} from '../src/verify/bountyCorrelation.js';

const esc = annotateFindingForBounty({
  kind: 'checker',
  checkerId: 'cross_principal_status_escalation',
  title: 'Possible privilege escalation across principals',
  caseId: 'x',
});
if (esc.payoutCorrelationScore < 8) {
  console.error('expected high score for status escalation', esc);
  process.exit(1);
}
if (!esc.bountyAxes.includes('broken_access_control')) {
  console.error('expected broken_access_control axis', esc);
  process.exit(1);
}

const intro = annotateFindingForBounty({
  kind: 'bounty_signal',
  signalId: 'graphql_introspection_hint',
  title: 'GraphQL error text references introspection policy',
  caseId: 'y',
});
if (intro.payoutCorrelationScore >= (esc.payoutCorrelationScore ?? 0)) {
  console.error('expected introspection hint to rank below escalation', intro, esc);
  process.exit(1);
}

const sum = summarizeBountyCorrelation([
  /** @type {Record<string, unknown>} */ (esc),
  /** @type {Record<string, unknown>} */ (intro),
]);
if (!sum.disclaimer || sum.meanScore == null) {
  console.error('expected summary fields', sum);
  process.exit(1);
}

console.log('bounty correlation: ok');
