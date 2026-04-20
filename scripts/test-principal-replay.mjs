import { checkCrossPrincipalOverlap } from '../src/verify/principalReplay.js';

const rows = [
  {
    caseId: 'gql:query:project',
    status: 200,
    bodyPreview: '{"data":{"project":{"id":"1"}}}',
  },
  {
    caseId: 'gql:query:project:authAlt',
    status: 200,
    bodyPreview: '{"data":{"project":{"id":"1"}}}',
  },
];

const hits = checkCrossPrincipalOverlap(rows);
if (!hits.length || hits[0].checkerId !== 'cross_principal_same_body') {
  console.error('expected cross principal overlap hit', hits);
  process.exit(1);
}

const escalation = checkCrossPrincipalOverlap([
  { caseId: 'x', status: 403, bodyPreview: '{"errors":[{"message":"forbidden"}]}' },
  { caseId: 'x:authAlt', status: 200, bodyPreview: '{"data":{"project":{"id":"1"}}}' },
]);
if (!escalation.some((h) => h.checkerId === 'cross_principal_status_escalation')) {
  console.error('expected status escalation hit', escalation);
  process.exit(1);
}

const nestedDiff = checkCrossPrincipalOverlap([
  {
    caseId: 'z',
    status: 200,
    bodyPreview: '{"data":{"user":{"profile":{"role":"admin"}}}}',
  },
  {
    caseId: 'z:authAlt',
    status: 200,
    bodyPreview: '{"data":{"user":{"profile":{"name":"x"}}}}',
  },
]);
if (!nestedDiff.some((h) => h.checkerId === 'cross_principal_field_diff')) {
  console.error('expected nested shape diff', nestedDiff);
  process.exit(1);
}
console.log('principal replay checker: ok');
