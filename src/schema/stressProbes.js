import { compileOperationToRequestBody } from './queryCompiler.js';

/**
 * Milestone 3 probes: bounded batch+alias and depth ladder variants.
 */
export function buildBatchAliasCases(baseCases, budget) {
  const out = [];
  for (const c of baseCases) {
    if (out.length >= budget) break;
    if (c.family !== 'GRAPHQL_QUERY') continue;
    const body = /** @type {Record<string, unknown>} */ (c.meta?.jsonBody || {});
    const q = String(body.query || '');
    if (!q) continue;
    const batched = [
      { query: q, variables: body.variables || {} },
      { query: q.replace(/\bquery\b/, 'query Alias2'), variables: body.variables || {} },
    ];
    out.push({
      ...c,
      id: `${c.id}:batch`,
      family: 'GRAPHQL_BATCH_ALIAS',
      meta: { ...c.meta, jsonBody: batched, contentType: 'application/json' },
    });
  }
  return out;
}

function deepenSelection(q, depth) {
  // bounded synthetic nesting using __typename aliases
  const insertion = Array.from({ length: Math.max(0, depth - 1) })
    .map((_, i) => `a${i}: __typename`)
    .join(' ');
  return q.replace(/\{\s*__typename\s*\}/g, `{ __typename ${insertion} }`);
}

export function buildDepthLadderCases(schema, endpointUrl, budget, maxDepth = 5) {
  const queries = schema.operations.filter((o) => o.kind === 'query');
  const out = [];
  for (const qop of queries) {
    for (let d = 2; d <= maxDepth; d++) {
      if (out.length >= budget) return out;
      const body = compileOperationToRequestBody(schema, qop, {
        opLabel: `depth_${qop.fieldName}_${d}`,
        selection: { shallow: true },
      });
      const deepQuery = deepenSelection(body.query, d);
      out.push({
        id: `gql:depth:${qop.fieldName}:${d}:${out.length}`,
        method: 'POST',
        url: endpointUrl,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        family: 'GRAPHQL_DEPTH_LADDER',
        meta: {
          jsonBody: { query: deepQuery, variables: body.variables },
          contentType: 'application/json',
          graphql: { operationKind: 'query', fieldName: qop.fieldName },
        },
      });
    }
  }
  return out;
}
