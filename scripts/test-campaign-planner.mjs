import path from 'path';
import { fileURLToPath } from 'url';
import { loadIntrospectionFromFile } from '../src/schema/introspectionLoader.js';
import { inferMutationToQueryEdges, buildMutationFollowUpCases } from '../src/schema/campaignPlanner.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = loadIntrospectionFromFile(path.join(here, '../fixtures/example-chains-introspection.json'));
const edges = inferMutationToQueryEdges(schema);
if (!edges.some((e) => e.mutationField === 'createProject' && e.queryField === 'project')) {
  console.error('expected mutation->query edge', edges);
  process.exit(1);
}

const execResults = [
  {
    caseId: 'gql:mutation:createProject',
    family: 'GRAPHQL_MUTATION',
    status: 200,
    bodyPreview: JSON.stringify({ data: { createProject: { id: 'p1' } } }),
  },
];
const casesById = new Map([
  [
    'gql:mutation:createProject',
    {
      id: 'gql:mutation:createProject',
      method: 'POST',
      url: 'https://example.com/graphql',
      headers: {},
      family: 'GRAPHQL_MUTATION',
      meta: { graphql: { fieldName: 'createProject', operationKind: 'mutation' } },
    },
  ],
]);

const follow = buildMutationFollowUpCases(execResults, casesById, schema, 'https://example.com/graphql', 4);
if (!follow.length || follow[0].family !== 'GRAPHQL_CHAIN_FOLLOWUP') {
  console.error('expected follow-up chain cases', follow);
  process.exit(1);
}
console.log('campaign planner: ok');
