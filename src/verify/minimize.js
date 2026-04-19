/**
 * Deterministic minimization hints for replay (no extra HTTP unless caller reruns).
 */

/** @typedef {import('../types.js').FuzzCase} FuzzCase */

/**
 * @param {FuzzCase | undefined} fc
 */
export function minimizationHint(fc) {
  if (fc?.meta?.graphql?.fieldName) {
    return {
      kind: 'graphql_operation',
      fieldName: fc.meta.graphql.fieldName,
      note: 'Narrow to a single field/operation and adjust selection set or variables',
    };
  }
  if (fc?.meta?.query) {
    const q = fc.meta.query;
    const keys = Object.keys(q);
    if (keys.length === 0) return null;
    const noise = keys.filter((k) => /debug|trace|verbose|__/.test(k));
    if (noise.length) {
      return { kind: 'drop_query_keys', keys: noise, note: 'Remove noisy query toggles and re-run' };
    }
    if (keys.length > 1) {
      return { kind: 'reduce_query', keys, note: 'Try removing optional URL query params one at a time' };
    }
  }
  return null;
}
