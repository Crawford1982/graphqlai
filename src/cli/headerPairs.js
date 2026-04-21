/**
 * Merge repeated `-H Name: value` CLI pairs into one map (later wins).
 *
 * @param {Array<{ name: string, value: string }>} pairs
 */
export function headerPairsToObject(pairs) {
  const o = /** @type {Record<string, string>} */ ({});
  for (const { name, value } of pairs || []) {
    if (name) o[name] = value;
  }
  return o;
}
