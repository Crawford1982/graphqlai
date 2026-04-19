/**
 * Schema → HTTP POST cases (application/json GraphQL envelope).
 */

import { compileOperationToRequestBody } from './queryCompiler.js';

/**
 * @typedef {import('../types.js').FuzzCase} FuzzCase
 * @typedef {import('./introspectionLoader.js').IntrospectionSchema} IntrospectionSchema
 */

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

  for (const op of schema.operations) {
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
