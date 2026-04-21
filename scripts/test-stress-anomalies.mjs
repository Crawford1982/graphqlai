import { analyzeStressProbeAnomalies } from '../src/verify/stressAnomalies.js';

const base = {
  caseId: 'gql:query:users:pv0',
  family: 'GRAPHQL_QUERY',
  status: 200,
  elapsedMs: 20,
  bodyPreview: '{"data":{"users":[]}}',
  url: 'http://x/graphql',
};

const batch = {
  caseId: 'gql:query:users:pv0:batch',
  family: 'GRAPHQL_BATCH_ALIAS',
  status: 400,
  elapsedMs: 2000,
  bodyPreview:
    '[{"errors":[{"message":"e1"}],"data":null},{"errors":[{"message":"e2"}],"data":null}]',
  url: 'http://x/graphql',
};

const depthLo = {
  caseId: 'gql:depth:pastes:2:0',
  family: 'GRAPHQL_DEPTH_LADDER',
  status: 200,
  elapsedMs: 50,
  url: 'http://x/graphql',
};
const depthHi = {
  caseId: 'gql:depth:pastes:8:1',
  family: 'GRAPHQL_DEPTH_LADDER',
  status: 200,
  elapsedMs: 3500,
  url: 'http://x/graphql',
};

const batchFindings = analyzeStressProbeAnomalies([base, batch]);
const multi = batchFindings.filter((f) =>
  String(f.title).includes('multiple error objects')
);
if (!multi.length) {
  console.error('expected batch multi-error finding');
  process.exit(1);
}

const depthFindings = analyzeStressProbeAnomalies([depthLo, depthHi]);
const ramp = depthFindings.filter((f) => /depth ladder/i.test(String(f.title)));
if (!ramp.length) {
  console.error('expected depth latency finding');
  process.exit(1);
}

console.log('stress anomalies: ok');
