import { buildReportProvenance } from '../src/verify/runProvenance.js';

const fakePkg = {
  version: '0.9.9-test',
  dependencies: { graphql: '^16.0.0', 'js-yaml': '^4.1.0' },
};

const p = buildReportProvenance(fakePkg, {
  CI: 'true',
  GITHUB_SHA: 'abcdef0123456789ABCDEF0123456789abcdef01',
});

if (p.schemaVersion !== 1) throw new Error('schemaVersion');
if (p.graphqlaiVersion !== '0.9.9-test') throw new Error('version');
if (!p.nodeVersion?.startsWith('v')) throw new Error('nodeVersion');
if (!p.platform || !p.arch) throw new Error('platform/arch');
if (!p.ci) throw new Error('ci flag');
if (p.gitSha !== 'abcdef0123456789abcdef0123456789abcdef01') throw new Error('sha normalize');
if (p.dependencyVersionsDeclared.graphql !== '^16.0.0') throw new Error('graphql dep');

const noSha = buildReportProvenance(fakePkg, {});
if (noSha.gitSha !== null) throw new Error('expected null sha');

console.log('run provenance: ok');
