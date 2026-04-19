import path from 'path';
import { fileURLToPath } from 'url';
import { loadIntrospectionFromFile } from '../src/schema/introspectionLoader.js';
import { buildCampaignCases } from '../src/schema/hypothesisEngine.js';
import { buildBatchAliasCases, buildDepthLadderCases } from '../src/schema/stressProbes.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = loadIntrospectionFromFile(path.join(here, '../fixtures/example-minimal-introspection.json'));
const base = buildCampaignCases(schema, 'https://example.com/graphql', { maxRequests: 4 });

const batch = buildBatchAliasCases(base, 2);
if (!batch.length || batch[0].family !== 'GRAPHQL_BATCH_ALIAS') {
  console.error('expected batch alias probes', batch);
  process.exit(1);
}

const depth = buildDepthLadderCases(schema, 'https://example.com/graphql', 3, 4);
if (!depth.length || depth[0].family !== 'GRAPHQL_DEPTH_LADDER') {
  console.error('expected depth probes', depth);
  process.exit(1);
}
console.log('stress probes: ok');
