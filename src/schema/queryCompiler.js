/**
 * Compiles validated operation shapes to GraphQL documents + variables.
 */

import { buildOperationSelection, needsSubselection } from './selectionBuilder.js';
import { buildDefaultForTypeRef as buildDefaultTyped } from './variableDefaults.js';

function typeRefToInputString(t) {
  if (!t) return 'String';
  if (t.kind === 'NON_NULL') return `${typeRefToInputString(t.ofType)}!`;
  if (t.kind === 'LIST') return `[${typeRefToInputString(t.ofType)}]`;
  return t.name || 'String';
}

/**
 * @typedef {import('./variableDefaults.js').VariableStrategy} VariableStrategy
 */

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {import('./introspectionLoader.js').SchemaOperation} op
 * @param {Record<string, unknown>} overrides
 * @param {VariableStrategy} [strategy]
 */
export function buildVariableBindings(schema, op, overrides = {}, strategy = 'balanced') {
  const definitions = [];
  /** @type {Record<string, unknown>} */
  const variables = {};
  const variableNames = [];

  for (let i = 0; i < op.args.length; i++) {
    const a = op.args[i];
    const vn = `v${i}`;
    variableNames.push(vn);
    definitions.push(`$${vn}: ${typeRefToInputString(a.typeRef)}`);

    if (Object.prototype.hasOwnProperty.call(overrides, a.name)) {
      variables[vn] = overrides[a.name];
      continue;
    }
    variables[vn] = buildDefaultTyped(
      schema,
      /** @type {Record<string, unknown>} */ (a.typeRef),
      0,
      { argName: a.name },
      strategy
    );
  }

  return { definitions: definitions.join(', '), variableNames, variables };
}

export function compileOperationToRequestBody(schema, op, opts = {}) {
  const label = opts.opLabel?.replace(/[^a-zA-Z0-9_]/g, '_') || 'GraphqlaiProbe';
  const strategy =
    opts.variableStrategy === 'thorough'
      ? 'thorough'
      : /** @type {VariableStrategy} */ ('balanced');
  const vb = buildVariableBindings(schema, op, opts.variableOverrides || {}, strategy);
  const argsStr = op.args.length
    ? op.args.map((a, i) => `${a.name}: $${vb.variableNames[i]}`).join(', ')
    : '';

  const wantsSel = needsSubselection(schema, op.returnNamedType);
  const sel =
    wantsSel &&
    typeof opts.selection === 'object' &&
    opts.selection !== null &&
    /** @type {{ shallow?: boolean }} */ (opts.selection).shallow === true
      ? '{\n    __typename\n  }'
      : wantsSel
        ? buildOperationSelection(schema, op, /** @type {{ maxDepth?: number, maxBreadth?: number }} */ (opts.selection || {}))
        : '';

  let call;
  if (!wantsSel) {
    call = op.args.length ? `${op.fieldName}(${argsStr})` : op.fieldName;
  } else if (sel) {
    call = op.args.length ? `${op.fieldName}(${argsStr}) ${sel}` : `${op.fieldName} ${sel}`;
  } else {
    call = op.args.length
      ? `${op.fieldName}(${argsStr}) {\n    __typename\n  }`
      : `${op.fieldName} {\n    __typename\n  }`;
  }

  const root = op.kind === 'mutation' ? 'mutation' : 'query';
  const query = op.args.length
    ? `${root} ${label}(${vb.definitions}) {\n  ${call}\n}`
    : `${root} ${label} {\n  ${call}\n}`;

  return { query, variables: op.args.length ? vb.variables : {} };
}
