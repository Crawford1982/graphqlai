/**
 * Compiles validated operation shapes to GraphQL documents + variables.
 */

import { buildOperationSelection, needsSubselection } from './selectionBuilder.js';

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

function unwrapTypeRef(t) {
  let cur = t;
  while (cur && (cur.kind === 'NON_NULL' || cur.kind === 'LIST')) {
    cur = cur.ofType;
  }
  return cur || null;
}

function isNonNull(t) {
  return Boolean(t && t.kind === 'NON_NULL');
}

function listInnerRef(t) {
  let cur = t;
  while (cur && cur.kind === 'NON_NULL') cur = cur.ofType;
  if (!cur || cur.kind !== 'LIST') return null;
  let inner = cur.ofType;
  while (inner && inner.kind === 'NON_NULL') inner = inner.ofType;
  return inner || null;
}

function buildDefaultForTypeRef(schema, typeRef, depth = 0) {
  if (!typeRef || depth > 4) return null;

  const listInner = listInnerRef(typeRef);
  if (listInner) {
    return [buildDefaultForTypeRef(schema, listInner, depth + 1)];
  }

  const named = unwrapTypeRef(typeRef);
  if (!named) return null;

  if (named.kind === 'SCALAR') {
    switch (named.name) {
      case 'ID':
        return '1';
      case 'Int':
        return 1;
      case 'Float':
        return 1.0;
      case 'Boolean':
        return false;
      case 'String':
      default:
        return 'graphqlai';
    }
  }

  if (named.kind === 'ENUM') {
    return enumFirstValue(schema, named.name) || 'UNKNOWN';
  }

  if (named.kind === 'INPUT_OBJECT' && named.name) {
    const def = schema.typesByName.get(named.name);
    const fields = /** @type {Array<{ name: string, type: Record<string, unknown> }> | undefined} */ (
      /** @type {Record<string, unknown>} */ (def || {}).inputFields
    );
    /** @type {Record<string, unknown>} */
    const out = {};
    if (!Array.isArray(fields)) return out;
    for (const f of fields) {
      const tr = /** @type {Record<string, unknown>} */ (f.type);
      if (!isNonNull(tr) && depth > 0) continue;
      out[f.name] = buildDefaultForTypeRef(
        schema,
        /** @type {Record<string, unknown>} */ (f.type),
        depth + 1
      );
    }
    return out;
  }

  return 'graphqlai';
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
    definitions.push(`$${vn}: ${typeRefToInputString(a.typeRef)}`);

    if (Object.prototype.hasOwnProperty.call(overrides, a.name)) {
      variables[vn] = overrides[a.name];
      continue;
    }
    variables[vn] = buildDefaultForTypeRef(schema, a.typeRef, 0);
  }

  return { definitions: definitions.join(', '), variableNames, variables };
}

export function compileOperationToRequestBody(schema, op, opts = {}) {
  const label = opts.opLabel?.replace(/[^a-zA-Z0-9_]/g, '_') || 'GraphqlaiProbe';
  const vb = buildVariableBindings(schema, op, opts.variableOverrides || {});
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
