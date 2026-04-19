/**
 * Milestone 2: infer mutation->query edges and build follow-up cases.
 */

import { compileOperationToRequestBody } from './queryCompiler.js';
import { parseGraphqlEnvelope, extractIdCandidates } from './leakHeuristics.js';

function isIdLikeArg(a) {
  const n = String(a.name || '');
  return /id$/i.test(n);
}

export function inferMutationToQueryEdges(schema) {
  const queries = schema.operations.filter((o) => o.kind === 'query');
  const muts = schema.operations.filter((o) => o.kind === 'mutation');
  /** @type {Array<{ mutationField: string, queryField: string, argName: string }>} */
  const edges = [];

  for (const m of muts) {
    for (const q of queries) {
      for (const a of q.args || []) {
        if (!isIdLikeArg(a)) continue;
        edges.push({ mutationField: m.fieldName, queryField: q.fieldName, argName: a.name });
      }
    }
  }
  return edges;
}

export function buildMutationFollowUpCases(execResults, casesById, schema, endpointUrl, budget = 8) {
  const edges = inferMutationToQueryEdges(schema);
  if (!edges.length || budget <= 0) return [];

  const qByName = new Map(schema.operations.filter((o) => o.kind === 'query').map((q) => [q.fieldName, q]));
  /** @type {import('../types.js').FuzzCase[]} */
  const out = [];

  for (const r of execResults) {
    if (out.length >= budget) break;
    const row = /** @type {Record<string, unknown>} */ (r);
    if (String(row.family || '') !== 'GRAPHQL_MUTATION') continue;
    if (Number(row.status) < 200 || Number(row.status) >= 300) continue;
    const cid = String(row.caseId || '');
    const base = casesById.get(cid);
    if (!base) continue;
    const field = String(base.meta?.graphql?.fieldName || '');
    if (!field) continue;

    const { data } = parseGraphqlEnvelope(String(row.bodyPreview || ''));
    const ids = [...extractIdCandidates(data)];
    if (!ids.length) continue;

    const related = edges.filter((e) => e.mutationField === field);
    for (const e of related) {
      if (out.length >= budget) break;
      const q = qByName.get(e.queryField);
      if (!q) continue;
      const idv = ids[0];
      const body = compileOperationToRequestBody(schema, q, {
        opLabel: `chain_${field}_to_${q.fieldName}`,
        variableOverrides: { [e.argName]: idv },
      });
      out.push({
        id: `${cid}:chain:${q.fieldName}:${out.length}`,
        method: 'POST',
        url: endpointUrl,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        family: 'GRAPHQL_CHAIN_FOLLOWUP',
        meta: {
          jsonBody: { query: body.query, variables: body.variables },
          contentType: 'application/json',
          graphql: { operationKind: 'query', fieldName: q.fieldName },
        },
      });
    }
  }
  return out;
}
