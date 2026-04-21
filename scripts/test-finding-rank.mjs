import { prioritizeFindingsForReport, findingReportPriority } from '../src/verify/findingRank.js';

const findings = [
  { kind: undefined, title: 'Sensitive pattern in body preview', caseId: 'a' },
  { kind: 'bounty_signal', title: 'Looks like bearer', caseId: 'b' },
  { kind: 'stress_anomaly', title: 'GraphQL batch probe', caseId: 'c' },
  { kind: 'graphql_signal', title: 'Verbose GraphQL error pattern', caseId: 'd' },
];

const sorted = prioritizeFindingsForReport(findings);
const first = /** @type {{ kind?: string }} */ (sorted[0]);
if (first.kind !== 'bounty_signal') {
  console.error('expected bounty_signal first', sorted);
  process.exit(1);
}
const second = /** @type {{ kind?: string }} */ (sorted[1]);
if (second.kind !== 'stress_anomaly') {
  console.error('expected stress_anomaly second', sorted);
  process.exit(1);
}

if (findingReportPriority({ kind: 'bounty_signal' }) >= findingReportPriority({ title: 'Sensitive pattern in body preview' })) {
  console.error('priority inversion');
  process.exit(1);
}

console.log('finding rank: ok');
