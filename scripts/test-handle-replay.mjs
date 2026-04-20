import path from 'path';
import { fileURLToPath } from 'url';
import { loadIntrospectionFromFile } from '../src/schema/introspectionLoader.js';
import { buildHandleReplayCases } from '../src/schema/handleReplay.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = loadIntrospectionFromFile(path.join(here, '../fixtures/example-chains-introspection.json'));

const execResults = [
  {
    caseId: 'gql:mutation:createProject',
    family: 'GRAPHQL_MUTATION',
    status: 200,
    bodyPreview: JSON.stringify({ data: { createProject: { id: 'proj-handle-99' } } }),
  },
];

const cases = buildHandleReplayCases(execResults, schema, 'https://example.com/graphql', 16);
if (cases.length !== 1) {
  console.error('expected one handle replay case', cases.length);
  process.exit(1);
}
const body = /** @type {Record<string, unknown>} */ (cases[0].meta?.jsonBody || {});
const q = String(body.query || '');
const vars = /** @type {Record<string, unknown>} */ (body.variables || {});
if (!q.includes('project(') || vars.v0 !== 'proj-handle-99') {
  console.error('unexpected query or variables', q, vars);
  process.exit(1);
}
console.log('handle replay: ok');
