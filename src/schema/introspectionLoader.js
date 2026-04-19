/**
 * GraphQL introspection JSON → normalized schema model.
 * SDL / manual seeds — future milestone.
 */

import fs from 'fs';
import path from 'path';

/**
 * @typedef {{
 *   kind: string,
 *   name: string | null,
 *   ofType?: Record<string, unknown> | null,
 * }} TypeRef
 */

/**
 * @typedef {{
 *   kind: 'query' | 'mutation',
 *   rootTypeName: string,
 *   fieldName: string,
 *   args: Array<{ name: string, typeRef: TypeRef, required: boolean }>,
 *   returnNamedType: string | null,
 * }} SchemaOperation
 */

/**
 * @typedef {{
 *   source: 'introspection_json',
 *   queryTypeName: string | null,
 *   mutationTypeName: string | null,
 *   typesByName: Map<string, Record<string, unknown>>,
 *   operations: SchemaOperation[],
 * }} IntrospectionSchema
 */

/**
 * @param {TypeRef | null | undefined} t
 */
export function unwrapNamedType(t) {
  let cur = t;
  while (cur && (cur.kind === 'NON_NULL' || cur.kind === 'LIST')) {
    cur = /** @type {TypeRef | null | undefined} */ (cur.ofType ?? null);
  }
  return { kind: cur?.kind || 'UNKNOWN', name: cur?.name ?? null };
}

/** @param {TypeRef | null | undefined} t */
export function isRequiredArg(t) {
  return Boolean(t && t.kind === 'NON_NULL');
}

/**
 * @param {Record<string, unknown>} schemaBlock Introspection __schema object
 * @returns {IntrospectionSchema}
 */
export function normalizeIntrospectionSchema(schemaBlock) {
  const rawTypes = Array.isArray(schemaBlock.types) ? schemaBlock.types : [];
  /** @type {Map<string, Record<string, unknown>>} */
  const typesByName = new Map();
  for (const t of rawTypes) {
    const o = /** @type {Record<string, unknown>} */ (t);
    const n = /** @type {string | undefined} */ (o.name);
    if (n) typesByName.set(n, o);
  }

  const qt = schemaBlock.queryType;
  const mt = schemaBlock.mutationType;
  const queryTypeName =
    qt && typeof qt === 'object' && qt !== null && 'name' in qt
      ? /** @type {{ name?: string }} */ (qt).name || null
      : null;
  const mutationTypeName =
    mt && typeof mt === 'object' && mt !== null && 'name' in mt
      ? /** @type {{ name?: string }} */ (mt).name || null
      : null;

  /** @type {SchemaOperation[]} */
  const operations = [];

  /**
   * @param {'query' | 'mutation'} kind
   * @param {string | null} typeName
   */
  const harvest = (kind, typeName) => {
    if (!typeName) return;
    const def = typesByName.get(typeName);
    if (!def || def.kind !== 'OBJECT') return;
    const fields = /** @type {{ name: string, args?: unknown[], type: TypeRef }[]} */ (
      /** @type {Record<string, unknown>} */ (def).fields
    );
    if (!Array.isArray(fields)) return;

    for (const f of fields) {
      if (!f?.name || f.name.startsWith('__')) continue;
      const args = Array.isArray(f.args) ? f.args : [];
      const ret = unwrapNamedType(f.type);
      operations.push({
        kind,
        rootTypeName: typeName,
        fieldName: f.name,
        args: args.map((raw) => {
          const a = /** @type {Record<string, unknown>} */ (raw);
          const tr = /** @type {TypeRef} */ (a.type);
          return {
            name: String(a.name || ''),
            typeRef: tr,
            required: isRequiredArg(tr),
          };
        }),
        returnNamedType: ret.name,
      });
    }
  };

  harvest('query', queryTypeName);
  harvest('mutation', mutationTypeName);

  return {
    source: 'introspection_json',
    queryTypeName,
    mutationTypeName,
    typesByName,
    operations,
  };
}

/**
 * Load normalized schema from introspection JSON (full GraphQL response or `__schema` only).
 *
 * @param {string} filePath
 * @returns {IntrospectionSchema}
 */
export function loadIntrospectionFromFile(filePath) {
  const abs = path.resolve(filePath);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const schemaBlock =
    raw.data && typeof raw.data === 'object' && raw.data.__schema
      ? raw.data.__schema
      : raw.__schema;
  if (!schemaBlock || typeof schemaBlock !== 'object') {
    throw new Error(`graphqlai: missing data.__schema or __schema in ${abs}`);
  }
  return normalizeIntrospectionSchema(/** @type {Record<string, unknown>} */ (schemaBlock));
}
