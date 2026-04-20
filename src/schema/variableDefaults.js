/**
 * Context-aware default variable values and bounded alternate sets for fuzzing.
 */

/**
 * @typedef {{
 *   argName?: string | null,
 * }} VarContext
 */

/**
 * @typedef {'balanced' | 'thorough'} VariableStrategy
 */

/**
 * @param {string | null | undefined} name
 */
function argSensitivity(name) {
  const n = String(name || '').toLowerCase();
  let s = 0;
  if (/token|secret|password|auth|jwt|bearer|apikey|api_key|apikey/i.test(n)) s += 50;
  if (/email|mail/i.test(n)) s += 18;
  if (/slug|handle|username/i.test(n)) s += 14;
  if (/id$|_id$/i.test(n) || n === 'id') s += 12;
  if (/admin|role|owner|tenant|account|permission|status/i.test(n)) s += 14;
  if (/name|title|label/i.test(n)) s += 10;
  return s;
}

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {string | null | undefined} typeName
 */
export function enumValuesOrdered(schema, typeName) {
  if (!typeName) return [];
  const def = schema.typesByName.get(typeName);
  if (!def || def.kind !== 'ENUM') return [];
  const ev = /** @type {{ name?: string }[] | undefined} */ (
    /** @type {Record<string, unknown>} */ (def).enumValues
  );
  if (!Array.isArray(ev)) return [];
  return ev.map((e) => String(e.name || '')).filter(Boolean);
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

/**
 * @param {VarContext} ctx
 */
export function defaultStringForContext(ctx) {
  const n = String(ctx.argName || '');
  if (/email/i.test(n)) return 'user@example.test';
  if (/password|secret|token|jwt|auth/i.test(n)) return 'test-token';
  if (/slug|handle/i.test(n)) return 'test-slug';
  if (/uuid|guid/i.test(n)) return '00000000-0000-0000-0000-000000000000';
  if (argSensitivity(n) >= 20) return 'admin';
  return 'graphqlai';
}

/**
 * @param {VarContext} ctx
 */
export function alternateStringsForContext(ctx) {
  const primary = defaultStringForContext(ctx);
  const n = String(ctx.argName || '').toLowerCase();
  /** @type {string[]} */
  const pool = [primary];

  if (/email/i.test(n)) {
    pool.push('graphqlai@test.invalid', 'a@b.co', '');
  } else if (/token|secret|password|auth|jwt/i.test(n)) {
    pool.push('changeme', 'Bearer test', '');
  } else if (/slug|handle|username/i.test(n)) {
    pool.push('admin', 'root', 'x');
  } else if (argSensitivity(ctx.argName || '') >= 15) {
    pool.push('test', 'user', '1');
  } else {
    pool.push('test', 'a', '');
  }

  return [...new Set(pool)];
}

/**
 * @param {VarContext} ctx
 */
export function defaultIdForContext(ctx) {
  const n = String(ctx.argName || '').toLowerCase();
  if (/uuid|guid/i.test(n)) return '00000000-0000-0000-0000-000000000000';
  return '1';
}

/**
 * @param {VarContext} ctx
 */
export function alternateIdsForContext(ctx) {
  const primary = defaultIdForContext(ctx);
  const n = String(ctx.argName || '').toLowerCase();
  /** @type {string[]} */
  const pool = [primary, '0', '2'];
  if (/uuid|guid/i.test(n)) {
    pool.push('11111111-1111-1111-1111-111111111111');
  } else {
    pool.push('99');
  }
  return [...new Set(pool)];
}

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {string | null | undefined} enumTypeName
 * @param {VariableStrategy} strategy
 */
export function enumDefaultAndAlternates(schema, enumTypeName, strategy = 'balanced') {
  const vals = enumValuesOrdered(schema, enumTypeName);
  if (!vals.length) return ['UNKNOWN'];
  const maxAlt = strategy === 'thorough' ? 6 : 3;
  return vals.slice(0, Math.min(vals.length, maxAlt));
}

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {Record<string, unknown>} typeRef
 * @param {number} depth
 * @param {VarContext} ctx
 * @param {VariableStrategy} strategy
 */
export function buildDefaultForTypeRef(schema, typeRef, depth = 0, ctx = {}, strategy = 'balanced') {
  if (!typeRef || depth > 4) return null;

  const listInner = listInnerRef(typeRef);
  if (listInner) {
    return [buildDefaultForTypeRef(schema, listInner, depth + 1, ctx, strategy)];
  }

  const named = unwrapTypeRef(typeRef);
  if (!named) return null;

  if (named.kind === 'SCALAR') {
    switch (named.name) {
      case 'ID':
        return defaultIdForContext(ctx);
      case 'Int':
        return 1;
      case 'Float':
        return 1.0;
      case 'Boolean':
        return false;
      case 'String':
      default:
        return defaultStringForContext(ctx);
    }
  }

  if (named.kind === 'ENUM') {
    const vals = enumDefaultAndAlternates(schema, named.name, strategy);
    return vals[0] || 'UNKNOWN';
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
      const fctx = { argName: f.name };
      out[f.name] = buildDefaultForTypeRef(schema, tr, depth + 1, fctx, strategy);
    }
    return out;
  }

  return defaultStringForContext(ctx);
}

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {Record<string, unknown>} typeRef
 * @param {unknown} primary
 * @param {VarContext} ctx
 * @param {VariableStrategy} strategy
 * @returns {unknown[]}
 */
export function alternateValuesForTypeRef(schema, typeRef, primary, ctx = {}, strategy = 'balanced') {
  const listInner = listInnerRef(typeRef);
  if (listInner) {
    const innerAlts = alternateValuesForTypeRef(schema, listInner, Array.isArray(primary) ? primary[0] : primary, ctx, strategy);
    return innerAlts.map((v) => [v]).filter((arr) => JSON.stringify(arr) !== JSON.stringify(primary));
  }

  const named = unwrapTypeRef(typeRef);
  if (!named) return [];

  if (named.kind === 'SCALAR') {
    switch (named.name) {
      case 'ID':
        return alternateIdsForContext(ctx).filter((v) => v !== primary);
      case 'Int': {
        const pool = strategy === 'thorough' ? [1, 0, -1, 2, 999999] : [1, 0, -1, 2];
        return pool.filter((v) => v !== primary);
      }
      case 'Float': {
        const pool = [1.0, 0.0, -1.0];
        return pool.filter((v) => v !== primary);
      }
      case 'Boolean':
        return [true, false].filter((v) => v !== primary);
      case 'String':
      default:
        return alternateStringsForContext(ctx).filter((v) => v !== primary);
    }
  }

  if (named.kind === 'ENUM') {
    const vals = enumDefaultAndAlternates(schema, named.name, strategy);
    return vals.filter((v) => v !== primary);
  }

  if (named.kind === 'INPUT_OBJECT' && named.name) {
    const primaryObj =
      primary && typeof primary === 'object' && !Array.isArray(primary)
        ? /** @type {Record<string, unknown>} */ (primary)
        : {};
    return inputObjectAlternates(schema, named.name, primaryObj, strategy);
  }

  return [];
}

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {string} inputTypeName
 * @param {Record<string, unknown>} primaryObj
 * @param {VariableStrategy} strategy
 */
function inputObjectAlternates(schema, inputTypeName, primaryObj, strategy) {
  const def = schema.typesByName.get(inputTypeName);
  const fields = /** @type {Array<{ name: string, type: Record<string, unknown> }> | undefined} */ (
    /** @type {Record<string, unknown>} */ (def || {}).inputFields
  );
  if (!Array.isArray(fields)) return [];

  /** @type {Record<string, unknown>[] } */
  const out = [];
  const maxObj = strategy === 'thorough' ? 5 : 3;
  const seen = new Set();

  const push = (obj) => {
    const key = JSON.stringify(obj);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(obj);
  };

  for (const f of fields) {
    if (out.length >= maxObj) break;
    const tr = /** @type {Record<string, unknown>} */ (f.type);
    const inner = unwrapTypeRef(tr);
    if (inner?.kind !== 'ENUM' || !inner.name) continue;
    const vals = enumValuesOrdered(schema, inner.name);
    const cur = primaryObj[f.name];
    for (const v of vals) {
      if (v === cur) continue;
      push({ ...primaryObj, [f.name]: v });
      break;
    }
  }

  for (const f of fields) {
    if (out.length >= maxObj) break;
    const tr = /** @type {Record<string, unknown>} */ (f.type);
    const inner = unwrapTypeRef(tr);
    if (inner?.kind !== 'SCALAR' || inner.name !== 'String') continue;
    const cur = String(primaryObj[f.name] ?? '');
    const alts = alternateStringsForContext({ argName: f.name }).filter((s) => s !== cur);
    if (alts.length) {
      push({ ...primaryObj, [f.name]: alts[0] });
    }
  }

  return out.slice(0, maxObj);
}

/**
 * Named argument values for one operation (arg name -> value).
 *
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {import('./introspectionLoader.js').SchemaOperation} op
 * @param {Record<string, unknown>} overrides
 * @param {VariableStrategy} strategy
 */
export function buildNamedArgumentValues(schema, op, overrides = {}, strategy = 'balanced') {
  /** @type {Record<string, unknown>} */
  const named = {};
  for (const a of op.args) {
    if (Object.prototype.hasOwnProperty.call(overrides, a.name)) {
      named[a.name] = overrides[a.name];
    } else {
      named[a.name] = buildDefaultForTypeRef(
        schema,
        /** @type {Record<string, unknown>} */ (a.typeRef),
        0,
        { argName: a.name },
        strategy
      );
    }
  }
  return named;
}

/**
 * Expand distinct variable combinations: primary first, then per-arg alternates (bounded).
 *
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {import('./introspectionLoader.js').SchemaOperation} op
 * @param {{ maxVariants?: number, strategy?: VariableStrategy }} opts
 * @returns {Record<string, unknown>[]}
 */
export function expandVariableVariants(schema, op, opts = {}) {
  const maxVariants = Number.isFinite(opts.maxVariants) ? /** @type {number} */ (opts.maxVariants) : 2;
  const strategy = opts.strategy || 'balanced';

  const primary = buildNamedArgumentValues(schema, op, {}, strategy);
  if (maxVariants <= 1 || op.args.length === 0) {
    return [primary];
  }

  /** @type {Record<string, unknown>[] } */
  const out = [primary];
  const seen = new Set([JSON.stringify(primary)]);

  for (let i = 0; i < op.args.length && out.length < maxVariants; i++) {
    const a = op.args[i];
    const cur = primary[a.name];
    const alts = alternateValuesForTypeRef(
      schema,
      /** @type {Record<string, unknown>} */ (a.typeRef),
      cur,
      { argName: a.name },
      strategy
    );
    for (const alt of alts) {
      if (out.length >= maxVariants) break;
      const next = { ...primary, [a.name]: alt };
      const key = JSON.stringify(next);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(next);
    }
  }

  return out;
}
