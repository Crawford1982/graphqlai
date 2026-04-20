/**
 * Schema-aware selection sets for compiled operations (bounded depth/breadth).
 */

/**
 * @param {string} fieldName
 */
function fieldScore(fieldName) {
  const f = fieldName.toLowerCase();
  let s = 0;
  const boost = [
    ['id', 40],
    ['uuid', 35],
    ['slug', 28],
    ['email', 22],
    ['tenant', 25],
    ['owner', 24],
    ['user', 18],
    ['account', 18],
    ['role', 22],
    ['admin', 20],
    ['permission', 18],
    ['token', 15],
    ['secret', 15],
    ['status', 12],
    ['name', 14],
    ['title', 12],
    ['created', 8],
    ['updated', 8],
  ];
  for (const [k, v] of boost) {
    if (f.includes(k)) s += v;
  }
  if (f === 'id') s += 25;
  return s;
}

/**
 * @param {Record<string, unknown>} field
 */
function unwrapFieldReturn(field) {
  let t = /** @type {Record<string, unknown> | null} */ (field.type);
  while (t && (t.kind === 'NON_NULL' || t.kind === 'LIST')) {
    t = /** @type {Record<string, unknown> | null} */ (t.ofType ?? null);
  }
  return t;
}

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {string | null} namedTypeName
 */
function typeKind(schema, namedTypeName) {
  if (!namedTypeName) return null;
  const def = schema.typesByName.get(namedTypeName);
  return def ? /** @type {string} */ (def.kind) : null;
}

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {string | null | undefined} namedTypeName
 * @param {number} depth
 * @param {{ maxDepth: number, maxBreadth: number, visited: Set<string> }} opts
 * @returns {string} inner selection lines (no outer braces)
 */
export function buildNestedSelection(schema, namedTypeName, depth, opts) {
  const { maxDepth, maxBreadth, visited } = opts;
  if (!namedTypeName || depth > maxDepth) return '';

  const kind = typeKind(schema, namedTypeName);
  if (kind === 'UNION') {
    return '__typename';
  }

  if (kind !== 'OBJECT' && kind !== 'INTERFACE') return '';

  const def = schema.typesByName.get(namedTypeName);
  const fields = /** @type {Array<Record<string, unknown>> | undefined} */ (
    /** @type {Record<string, unknown>} */ (def || {}).fields
  );
  if (!Array.isArray(fields)) return '__typename';

  const usable = fields.filter((fld) => {
    const n = /** @type {string} */ (fld.name || '');
    return n && !n.startsWith('__');
  });

  const scored = usable.map((fld) => {
    const name = String(fld.name || '');
    const rt = unwrapFieldReturn(fld);
    const rn = rt?.kind === 'SCALAR' || rt?.kind === 'ENUM' ? String(rt.name || '') : '';
    const rtKind = rt?.kind || '';
    let priority = fieldScore(name);
    if (rtKind === 'SCALAR' || rtKind === 'ENUM') priority += 15;
    return { fld, name, priority };
  });

  scored.sort((a, b) => b.priority - a.priority);
  const picked = scored.slice(0, maxBreadth);

  /** @type {string[]} */
  const lines = [];

  if (visited.has(namedTypeName)) {
    return '__typename';
  }
  visited.add(namedTypeName);

  try {
    for (const { fld, name } of picked) {
      const rt = unwrapFieldReturn(fld);
      if (!rt) continue;

      if (rt.kind === 'SCALAR' || rt.kind === 'ENUM') {
        lines.push(name);
        continue;
      }

      let innerNamed = null;
      let inner = /** @type {Record<string, unknown> | null} */ (rt);
      while (inner && (inner.kind === 'NON_NULL' || inner.kind === 'LIST')) {
        inner = /** @type {Record<string, unknown> | null} */ (inner.ofType ?? null);
      }
      const ik0 = inner?.kind;
      if (ik0 === 'OBJECT' || ik0 === 'INTERFACE' || ik0 === 'UNION') {
        innerNamed = /** @type {string | null} */ (inner?.name ?? null);
      }

      if (!innerNamed) continue;

      const ik = typeKind(schema, innerNamed);
      if (ik === 'UNION') {
        lines.push(`${name} {\n    __typename\n  }`);
      } else if (ik === 'OBJECT' || ik === 'INTERFACE') {
        const nested = buildNestedSelection(schema, innerNamed, depth + 1, opts);
        const body = nested || '__typename';
        lines.push(`${name} {\n    ${body.replace(/\n/g, '\n    ')}\n  }`);
      }
    }
  } finally {
    visited.delete(namedTypeName);
  }

  const out = lines.length ? lines.join('\n    ') : '__typename';
  return out;
}

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {{ returnNamedType?: string | null }} op
 * @param {{ maxDepth?: number, maxBreadth?: number }} [opts]
 */
export function buildOperationSelection(schema, op, opts = {}) {
  const maxDepth = Number.isFinite(opts.maxDepth) ? /** @type {number} */ (opts.maxDepth) : 2;
  const maxBreadth = Number.isFinite(opts.maxBreadth) ? /** @type {number} */ (opts.maxBreadth) : 12;
  const rt = op.returnNamedType || null;
  if (!needsSubselection(schema, rt)) return '';

  const visited = new Set();
  const inner = buildNestedSelection(schema, rt, 0, { maxDepth, maxBreadth, visited });
  return inner ? `{\n    ${inner.replace(/\n/g, '\n    ')}\n  }` : '{\n    __typename\n  }';
}

/**
 * @param {import('./introspectionLoader.js').IntrospectionSchema} schema
 * @param {string | null | undefined} namedReturnType
 */
export function needsSubselection(schema, namedReturnType) {
  if (!namedReturnType) return true;
  const def = schema.typesByName.get(namedReturnType);
  if (!def) return true;
  const k = /** @type {string} */ (def.kind);
  return k === 'OBJECT' || k === 'INTERFACE' || k === 'UNION';
}
