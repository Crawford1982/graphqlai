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

const prioritySchema = loadIntrospectionFromFile(
  path.join(here, '../fixtures/example-priority-introspection.json')
);
const prioritized = buildCampaignCases(prioritySchema, 'https://example.com/graphql', { maxRequests: 2 });
if (prioritized.length !== 2) {
  console.error('expected capped 2 cases', prioritized.length);
  process.exit(1);
}
if (prioritized[0].family !== 'GRAPHQL_MUTATION') {
  console.error('expected mutation prioritized first', prioritized.map((c) => c.id));
  process.exit(1);
}
console.log('hypothesis prioritization: ok');

const inputSchema = loadIntrospectionFromFile(path.join(here, '../fixtures/example-input-object-introspection.json'));
const multi = buildCampaignCases(inputSchema, 'https://example.com/graphql', {
  maxRequests: 10,
  maxPayloadVariants: 2,
});
const createCases = multi.filter((c) => c.id.startsWith('gql:mutation:createUser'));
if (createCases.length !== 2 || !createCases.some((c) => c.id.includes(':pv1'))) {
  console.error('expected two payload variants for createUser', createCases.map((c) => c.id));
  process.exit(1);
}
console.log('hypothesis payload variants: ok');
