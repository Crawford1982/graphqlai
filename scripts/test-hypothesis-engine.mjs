import path from 'path';
import { fileURLToPath } from 'url';
import { loadIntrospectionFromFile } from '../src/schema/introspectionLoader.js';
import { buildCampaignCases } from '../src/schema/hypothesisEngine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = loadIntrospectionFromFile(path.join(here, '../fixtures/example-minimal-introspection.json'));

const cases = buildCampaignCases(schema, 'https://example.com/graphql', { maxRequests: 10 });
if (cases.length !== 1 || cases[0].method !== 'POST') {
  console.error(cases);
  process.exit(1);
}
const jb = /** @type {Record<string, unknown>} */ (cases[0].meta?.jsonBody);
if (!jb || typeof jb.query !== 'string') {
  console.error('missing jsonBody.query');
  process.exit(1);
}
console.log('hypothesis engine: ok');
