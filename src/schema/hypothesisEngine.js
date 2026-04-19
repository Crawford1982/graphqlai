/**
 * Schema → HTTP POST cases (application/json GraphQL envelope).
 */

import { compileOperationToRequestBody } from './queryCompiler.js';

/**
 * @typedef {import('../types.js').FuzzCase} FuzzCase
 * @typedef {import('./introspectionLoader.js').IntrospectionSchema} IntrospectionSchema
 */

function scoreOperation(op) {
  const f = String(op.fieldName || '').toLowerCase();
  let score = 0;
  if (op.kind === 'mutation') score += 100;

  const highValue = [
    'admin',
    'delete',
    'remove',
    'update',
    'create',
    'token',
    'secret',
    'password',
    'user',
    'account',
    'payment',
    'invoice',
    'role',
    'permission',
  ];
  for (const kw of highValue) {
    if (f.includes(kw)) score += 10;
  }
  if (Array.isArray(op.args) && op.args.some((a) => /id$/i.test(String(a.name || '')))) score += 5;
  return score;
}

/**
 * @param {IntrospectionSchema} schema
 * @param {string} endpointUrl
 * @param {{ maxRequests: number }} opts
 * @returns {FuzzCase[]}
 */
export function buildCampaignCases(schema, endpointUrl, opts) {
  /** @type {FuzzCase[]} */
  const cases = [];
  const cap = () => cases.length >= opts.maxRequests;
  const prioritized = [...schema.operations].sort((a, b) => scoreOperation(b) - scoreOperation(a));

  for (const op of prioritized) {
    if (cap()) break;
    try {
      const body = compileOperationToRequestBody(schema, op, { opLabel: `${op.kind}_${op.fieldName}` });
      const id = `gql:${op.kind}:${op.fieldName}`;
      cases.push({
        id,
        method: 'POST',
        url: endpointUrl,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        family: op.kind === 'mutation' ? 'GRAPHQL_MUTATION' : 'GRAPHQL_QUERY',
        meta: {
          jsonBody: {
            query: body.query,
            variables: body.variables,
          },
          contentType: 'application/json',
          graphql: {
            operationKind: op.kind,
            fieldName: op.fieldName,
          },
        },
      });
    } catch {
      /* skip malformed op */
    }
  }

  return cases;
}
