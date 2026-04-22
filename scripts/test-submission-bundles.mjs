import { buildSubmissionBundlesFromReport } from '../src/submissions/submissionBundles.js';

const report = {
  target: 'http://127.0.0.1/graphql',
  generatedAt: new Date().toISOString(),
  toolVersion: '0.2.0',
  results: [
    {
      caseId: 'gql:q:1',
      status: 403,
      bodyPreview: '{"errors":[{"message":"denied"}]}',
      replayCurl: "curl -sS -X POST 'http://x' -H 'Content-Type: application/json' --data '{}'",
    },
    {
      caseId: 'gql:q:1:authAlt',
      status: 200,
      bodyPreview: '{"data":{"x":1}}',
      replayCurl: "curl -sS -X POST 'http://x' -H 'Content-Type: application/json' --data '{}'",
    },
    {
      caseId: 'gql:signal',
      status: 200,
      bodyPreview: '{"data":{}}',
      replayCurl: "curl -sS -X POST 'http://x/graphql'",
    },
  ],
  findings: [
    {
      kind: 'checker',
      checkerId: 'cross_principal_status_escalation',
      title: 'Possible privilege escalation across principals',
      detail: 'Primary returned 403 while alternate principal returned 200.',
      caseId: 'gql:q:1',
      evidenceCaseIds: ['gql:q:1', 'gql:q:1:authAlt'],
      severity: 'high',
      confidence: 0.9,
      payoutCorrelationScore: 9,
    },
    {
      kind: 'bounty_signal',
      signalId: 'jwt_or_bearer_leak',
      title: 'Looks like bearer/JWT material in body',
      caseId: 'gql:signal',
      severity: 'high',
      payoutCorrelationScore: 8,
    },
  ],
};

const bundles = buildSubmissionBundlesFromReport(report);
const principal = bundles.find((b) => b.category === 'broken_access_control');
if (!principal || !principal.submissionReady) {
  console.error('expected escalation bundle submissionReady', principal);
  process.exit(1);
}
if (principal.evidencePairKind !== 'two_principals') {
  console.error('expected two_principals');
  process.exit(1);
}
const jwt = bundles.find((b) => b.source.signalId === 'jwt_or_bearer_leak');
if (!jwt || jwt.submissionReady !== false) {
  console.error('jwt bundle should not be submission-ready');
  process.exit(1);
}

console.log('submission bundles: ok');
