/**
 * Replay successful responses: reuse extracted IDs/handles against id-like query arguments (bounded).
 */

import { compileOperationToRequestBody } from './queryCompiler.js';
import { parseGraphqlEnvelope, extractIdCandidates } from './leakHeuristics.js';

function unwrapTypeRef(t) {
  let cur = t;
  while (cur && (cur.kind === 'NON_NULL' || cur.kind === 'LIST')) cur = cur.ofType;
  return cur || null;
}

function scalarName(typeRef) {
  const u = unwrapTypeRef(typeRef);
  return u?.kind === 'SCALAR' ? String(u.name || '') : '';
}

function isIdLikeArgName(name) {
  const n = String(name || '');
  return /^id$/i.test(n) || /Id$/i.test(n);
}

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 */
export function buildHandleReplayCases(execResults, schema, endpointUrl, budget = 16) {
  if (budget <= 0) return [];

  const queries = schema.operations.filter((o) => o.kind === 'query');
  /** @type {import('../types.js').FuzzCase[]} */
  const out = [];
  const seen = new Set();

  for (const r of execResults) {
    if (out.length >= budget) break;
    const row = /** @type {Record<string, unknown>} */ (r);
    const fam = String(row.family || '');
    if (fam.includes('AUTH_ALT')) continue;
    if (
      fam === 'GRAPHQL_BATCH_ALIAS' ||
      fam === 'GRAPHQL_DEPTH_LADDER' ||
      fam === 'GRAPHQL_HANDLE_REPLAY'
    ) {
      continue;
    }
    const st = Number(row.status);
    if (st < 200 || st >= 300) continue;

    const { data } = parseGraphqlEnvelope(String(row.bodyPreview || ''));
    if (!data || typeof data !== 'object') continue;

    const ids = extractIdCandidates(data);
    if (!ids.size) continue;

    for (const q of queries) {
      if (out.length >= budget) break;
      const idArgs = (q.args || []).filter((a) => isIdLikeArgName(a.name));
      if (idArgs.length !== 1) continue;
      const arg = idArgs[0];
      const sc = scalarName(arg.typeRef);

      for (const rawId of ids) {
        if (out.length >= budget) break;
        const idv = String(rawId);
        if (sc === 'Int' && !/^[0-9]+$/.test(idv)) continue;

        const key = `${q.fieldName}:${idv}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const body = compileOperationToRequestBody(schema, q, {
          opLabel: `handle_replay_${q.fieldName}`,
          variableOverrides: { [arg.name]: idv },
        });
        out.push({
          id: `gql:handle:${q.fieldName}:${out.length}`,
          method: 'POST',
          url: endpointUrl,
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          family: 'GRAPHQL_HANDLE_REPLAY',
          meta: {
            jsonBody: { query: body.query, variables: body.variables },
            contentType: 'application/json',
            graphql: { operationKind: 'query', fieldName: q.fieldName },
          },
        });
      }
    }
  }

  return out;
}
