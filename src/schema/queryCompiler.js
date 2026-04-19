/**
 * Compiles validated operation shapes to GraphQL documents + variables.
 */

import { unwrapNamedType } from './introspectionLoader.js';

function enumFirstValue(schema, typeName) {
  if (!typeName) return null;
  const def = schema.typesByName.get(typeName);
  if (!def || def.kind !== 'ENUM') return null;
  const ev = /** @type {{ name?: string }[] | undefined} */ (
    /** @type {Record<string, unknown>} */ (def).enumValues
  );
  if (!Array.isArray(ev) || !ev.length) return null;
  return ev[0].name || null;
}

function typeRefToInputString(t) {
  if (!t) return 'String';
  if (t.kind === 'NON_NULL') return `${typeRefToInputString(t.ofType)}!`;
  if (t.kind === 'LIST') return `[${typeRefToInputString(t.ofType)}]`;
  return t.name || 'String';
}

export function buildVariableBindings(schema, op, overrides = {}) {
  const definitions = [];
  /** @type {Record<string, unknown>} */
  const variables = {};
  const variableNames = [];

  for (let i = 0; i < op.args.length; i++) {
    const a = op.args[i];
    const vn = `v${i}`;
    variableNames.push(vn);
    const named = unwrapNamedType(a.typeRef);
    definitions.push(`$${vn}: ${typeRefToInputString(a.typeRef)}`);

    if (Object.prototype.hasOwnProperty.call(overrides, a.name)) {
      variables[vn] = overrides[a.name];
      continue;
    }

    switch (named.name) {
      case 'ID':
        variables[vn] = '1';
        break;
      case 'Int':
        variables[vn] = 1;
        break;
      case 'Float':
        variables[vn] = 1.0;
        break;
      case 'Boolean':
        variables[vn] = false;
        break;
      case 'String':
        variables[vn] = 'graphqlai';
        break;
      default:
        variables[vn] =
          named.kind === 'ENUM' && named.name
            ? enumFirstValue(schema, named.name) || 'UNKNOWN'
            : 'graphqlai';
    }
  }

  return { definitions: definitions.join(', '), variableNames, variables };
}

function needsSelection(schema, namedReturnType) {
  if (!namedReturnType) return true;
  const def = schema.typesByName.get(namedReturnType);
  if (!def) return true;
  return def.kind === 'OBJECT' || def.kind === 'INTERFACE' || def.kind === 'UNION';
}

export function compileOperationToRequestBody(schema, op, opts = {}) {
  const label = opts.opLabel?.replace(/[^a-zA-Z0-9_]/g, '_') || 'GraphqlaiProbe';
  const vb = buildVariableBindings(schema, op, opts.variableOverrides || {});
  const argsStr = op.args.length
    ? op.args.map((a, i) => `${a.name}: $${vb.variableNames[i]}`).join(', ')
    : '';

  const call = !needsSelection(schema, op.returnNamedType)
    ? op.args.length
      ? `${op.fieldName}(${argsStr})`
      : op.fieldName
    : op.args.length
      ? `${op.fieldName}(${argsStr}) {\n    __typename\n  }`
      : `${op.fieldName} {\n    __typename\n  }`;

  const root = op.kind === 'mutation' ? 'mutation' : 'query';
  const query = op.args.length
    ? `${root} ${label}(${vb.definitions}) {\n  ${call}\n}`
    : `${root} ${label} {\n  ${call}\n}`;

  return { query, variables: op.args.length ? vb.variables : {} };
}
